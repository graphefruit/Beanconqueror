import { inject, Service } from '@angular/core';

import { App } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { TranslateService } from '@ngx-translate/core';
import { toPng } from 'html-to-image';
import { stringify } from 'safe-stable-stringify';

import { Bean } from '../../classes/bean/bean';
import { Config } from '../../classes/objectConfig/objectConfig';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import {
  BeanMix,
  BeanProto,
  BeanRoastingType,
  Roast,
} from '../../generated/src/classes/bean/bean';
import {
  SUPPORT_INFO_FILE,
  supportInfo,
} from '../../stores/settings/support-info-rules';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { LOG_DIRECTORY, LOG_FILE_NAME, LOG_FOLDER, UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';

const NATIVE_LOG_FILE_NAME = /^native_\d{8}_\d{9}\.log$/;

/** iOS only: the native log fetches its entries in intervals. */
const NativeLog = registerPlugin<{ flush(): Promise<void> }>('NativeLog');

/** Whether `_error`, from Share.share(), tells that the user closed the dialog. */
export function isShareCancelled(_error: unknown): boolean {
  return (
    (_error as { message?: unknown })?.message === 'Share canceled' ||
    (_error as { name?: unknown })?.name === 'AbortError'
  );
}

@Service()
export class ShareService {
  private readonly translate = inject(TranslateService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly nativeLog = NativeLog;

  public async shareImage(_dataUrl: string) {
    try {
      await this.shareFile('', _dataUrl);
    } catch (ex) {}
  }

  /**
   * Shares an element as a PNG `width` pixels wide, its height in proportion.
   * Resolves false when it could not be drawn or written; the cause is logged.
   */
  public async shareElementAsImage(
    _element: HTMLElement,
    _width: number,
  ): Promise<boolean> {
    let dataUrl: string;
    try {
      const started = performance.now();
      const options = { pixelRatio: _width / _element.offsetWidth };
      if (Capacitor.getPlatform() === 'ios') {
        // WebKit leaves out the images inside the element (the graph) the
        // first time it draws it.
        await toPng(_element, options);
      }
      dataUrl = await toPng(_element, options);
      this.uiLog.info(
        `Share - image drawn in ${Math.round(performance.now() - started)} ms, ` +
          `${Math.round((dataUrl.length * 3) / 4 / 1024)} KB`,
      );
    } catch (ex) {
      this.uiLog.error('Share - could not draw the image', ex);
      return false;
    }
    return this.shareFile('', dataUrl);
  }

  /**
   * Resolves false when the file could not be written, so nothing was shared.
   * A share dialog the user cancels is no failure.
   */
  public async shareFile(
    _filename: string,
    _dataUrl: string,
  ): Promise<boolean> {
    let extensionEnding = '.jpg';
    if (_dataUrl.indexOf('image/png') > 0) {
      extensionEnding = '.png';
    }
    if (_dataUrl.indexOf('application/json') > 0) {
      extensionEnding = '.json';
    }
    let file: { path: string; fullpath: string };
    try {
      await this.uiFileHelper.clearShareDirectory();
      // A unique name, so an app still holding an earlier file never reads
      // this one in its place. Base64 cannot be shared, only a file.
      file = await this.uiFileHelper.writeFileForSharing(
        _dataUrl,
        (_filename || 'Beanconqueror') + '_' + Date.now() + extensionEnding,
      );
    } catch (ex) {
      this.uiLog.error('Share - could not write the file', ex);
      return false;
    }
    try {
      await Share.share({
        url: file.fullpath,
      });
    } catch (ex) {}
    return true;
  }

  /**
   * Opens the share dialog for the stored file at `_uri`, so it can be kept
   * outside the app. Resolves false when it could not be shared; closing the
   * dialog counts as shared.
   */
  public async shareStoredFile(_uri: string): Promise<boolean> {
    try {
      await Share.share({ url: _uri });
      return true;
    } catch (ex) {
      if (isShareCancelled(ex)) {
        return true;
      }
      this.uiLog.error('Share - the stored file could not be shared', ex);
      return false;
    }
  }

  /**
   * Shares the log files and the support info after the user agreed to what
   * they can contain. In the browser or without readable files, the log in
   * memory is shared as one file instead; when that cannot be written either,
   * it is shown as text to copy.
   */
  public async shareLogs(): Promise<void> {
    const choice = await this.uiAlert.showConfirmWithYesNoTranslation(
      'SHARE_LOGS_HINT',
      'SHARE_LOGS_TITLE',
      'SHARE',
      'CANCEL',
      true,
    );
    if (choice !== 'YES') {
      return;
    }
    if (await this.shareLogFiles()) {
      return;
    }
    let dataUrl: string;
    try {
      // safe-stable-stringify copes with circular references
      dataUrl = await this.readAsDataUrl(
        new Blob([stringify(this.uiLog.getLogs())], {
          type: 'application/json',
        }),
      );
    } catch {
      await this.uiAlert.copyLogfiles();
      return;
    }
    if (!(await this.shareFile('Beanconqueror_logs', dataUrl))) {
      await this.uiAlert.copyLogfiles();
    }
  }

  /** Resolves false when there were no log files to share. */
  private async shareLogFiles(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }
    let files: string[];
    try {
      await this.uiLog.writeToFile();
      if (Capacitor.getPlatform() === 'ios') {
        // Without the latest native entries the files are still worth sharing.
        await this.nativeLog.flush().catch(() => undefined);
      }
      const listed = await Filesystem.readdir({
        path: LOG_FOLDER,
        directory: LOG_DIRECTORY,
      });
      files = listed.files
        .filter(
          (_file) =>
            LOG_FILE_NAME.test(_file.name) ||
            NATIVE_LOG_FILE_NAME.test(_file.name),
        )
        .sort((_a, _b) => (_a.name < _b.name ? -1 : 1))
        .map((_file) => _file.uri);
    } catch {
      return false;
    }
    if (files.length === 0) {
      return false;
    }
    const info = await this.writeSupportInfo();
    try {
      await Share.share({ files: info ? [info, ...files] : files });
    } catch {
      // Cancelling the share dialog is no error.
    }
    return true;
  }

  /** Resolves the file's uri, or undefined when it could not be written. */
  private async writeSupportInfo(): Promise<string | undefined> {
    try {
      const info = supportInfo(
        this.uiSettingsStorage.getSettings(),
        await Device.getInfo(),
        (await App.getInfo()).version,
      );
      const { uri } = await Filesystem.writeFile({
        path: `${LOG_FOLDER}/${SUPPORT_INFO_FILE}`,
        directory: LOG_DIRECTORY,
        data: JSON.stringify(info, null, 2),
        encoding: Encoding.UTF8,
      });
      return uri;
    } catch (ex) {
      // The log files alone still help.
      this.uiLog.error('Share - could not write the support info', ex);
      return undefined;
    }
  }

  private readAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  public async shareUrl(_dataUrl: string) {
    try {
      await Share.share({
        url: _dataUrl,
      });
    } catch (ex) {}
  }

  public async shareBean(_bean: Bean) {
    // try {
    const protoBean: any = BeanProto.fromJSON(_bean);
    protoBean.config = new Config();
    protoBean.attachments = [];
    protoBean.favourite = false;
    protoBean.rating = 0;
    protoBean.finished = false;

    if (_bean.bean_roasting_type === ('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM)) {
      protoBean.bean_roasting_type =
        BeanRoastingType.UNKNOWN_BEAN_ROASTING_TYPE;
    }
    if (_bean.roast === ('UNKNOWN' as ROASTS_ENUM)) {
      protoBean.roast = Roast.UNKNOWN_ROAST;
    }

    if (_bean.beanMix === ('UNKNOWN' as BEAN_MIX_ENUM)) {
      protoBean.beanMix = BeanMix.UNKNOWN_BEAN_MIX;
    }

    // We need to get the key/value pairing to a simple int list.
    if (_bean.cupped_flavor?.predefined_flavors !== undefined) {
      const keys = Object.keys(_bean.cupped_flavor.predefined_flavors);
      protoBean.cupped_flavor.predefined_flavors = keys;
    }

    const bytes = BeanProto.encode(protoBean).finish();

    const base64String = this.uiHelper.encode(bytes);

    const loops = Math.ceil(base64String.length / 400);

    let jsonParams = '';
    for (let i = 0; i < loops; i++) {
      if (jsonParams === '') {
        jsonParams = 'shareUserBean' + i + '=' + base64String.substr(0, 400);
      } else {
        jsonParams +=
          '&shareUserBean' + i + '=' + base64String.substr(i * 400, 400);
      }
    }

    const beanMessage: string = 'https://beanconqueror.com?' + jsonParams;
    this.uiLog.debug(`Share bean link (${beanMessage.length} chars)`);
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHARE,
    );
    try {
      await Share.share({
        text: beanMessage,
        dialogTitle: 'Share',
      });
    } catch (ex) {}
  }
}
