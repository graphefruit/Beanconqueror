import { inject, Injectable } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { Share } from '@capacitor/share';
import { TranslateService } from '@ngx-translate/core';

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
import { UIAnalytics } from '../uiAnalytics';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private readonly translate = inject(TranslateService);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly platform = inject(Platform);
  private readonly uiLog = inject(UILog);

  public async shareImage(_dataUrl: string) {
    try {
      await this.shareFile('', _dataUrl);
    } catch (ex) {}
  }

  public async shareFile(_filename: string, _dataUrl: string) {
    try {
      let extensionEnding = '.jpg';
      if (_dataUrl.indexOf('image/png') > 0) {
        extensionEnding = '.png';
      }
      if (_dataUrl.indexOf('application/json') > 0) {
        extensionEnding = '.json';
      }

      /** We need to save the file before we can share, because base64 share is not supported**/
      let path;

      if (this.platform.is('android')) {
        /** We need to save the file before we can share, because base64 share is not supported**/
        path = await this.uiFileHelper.writeExternalFileFromBase64ForSharing(
          _dataUrl,
          'sharefile' + extensionEnding,
        );
      } else {
        path = await this.uiFileHelper.writeInternalFileFromBase64(
          _dataUrl,
          'sharefile' + extensionEnding,
        );
      }

      await Share.share({
        url: path.fullpath,
      });
      if (this.platform.is('android')) {
        await this.uiFileHelper.deleteExternalSharedFile(path.path);
      } else {
        await this.uiFileHelper.deleteInternalFile(path.path);
      }
    } catch (ex) {}
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
    protoBean.archived = false;

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
    if (
      'cupped_flavor' in _bean &&
      'predefined_flavors' in _bean.cupped_flavor
    ) {
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
    this.uiLog.debug(beanMessage);
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
