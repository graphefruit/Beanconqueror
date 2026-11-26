import { inject, Service } from '@angular/core';

import { Share } from '@capacitor/share';
import { TranslateService } from '@ngx-translate/core';
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
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';

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

  public async shareImage(_dataUrl: string) {
    try {
      await this.shareFile('', _dataUrl);
    } catch (ex) {}
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
   * Shares the log as a file after the user agreed to what it can contain.
   * When the log cannot be turned into a file or the file cannot be written,
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
