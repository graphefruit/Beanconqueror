import { Injectable } from '@angular/core';
import {UIHelper} from '../uiHelper';
import {Deeplinks} from '@ionic-native/deeplinks/ngx';

import {UILog} from '../uiLog';
import {ServerCommunicationService} from '../serverCommunication/server-communication.service';
import {UIBeanHelper} from '../uiBeanHelper';
import {ServerBean} from '../../models/bean/serverBean';
import {UIAlert} from '../uiAlert';

declare var window;
@Injectable({
  providedIn: 'root'
})
export class IntentHandlerService {

  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE'
  };
  constructor(private readonly uiHelper: UIHelper,
              private readonly deeplinks: Deeplinks,
              private readonly uiLog: UILog,
              private readonly serverCommunicationService: ServerCommunicationService,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly uiAlert: UIAlert) { }

  public attachOnHandleOpenUrl() {

    // https://github.com/ionic-team/ionic-plugin-deeplinks/issues/243 - to be done
    this.deeplinks.route( {
      '*':'*',
      '/NO_LINK_EVER_WILL_WORK_HERE/':  '/NO_LINK_EVER_WILL_WORK_HERE/'
  }).subscribe((match) => {
      // The plugin has some issues, therefore we use success and error case and hope for better times
        this.uiLog.log('Deeplink matched ' + JSON.stringify(match.$link));
        this.handleDeepLink(match.$link);
      },
      (nomatch) => {
        this.uiLog.log('Deeplink not matched ' + JSON.stringify(nomatch.$link));

        this.handleDeepLink(nomatch.$link);
      });
  }
  private findGetParameter(_url: string,_parameterName: string) {
    let result = null,
      tmp = [];
    _url.split('&')
      .forEach( (item) => {
        tmp = item.split('=');
        if (tmp[0] === _parameterName) {
          result = decodeURIComponent(tmp[1]);
        }
      });
    return result;
  }

  private findParameterByCompleteUrl(_url,_parameter) {
    const urlObj: any = new window.URL(_url);
    const val = urlObj.searchParams.get(_parameter);
    return val;
  }

  public async handleQRCodeLink(_url) {
    await this.uiHelper.isBeanconqurorAppReady().then(async () => {
      const url: string = _url;
      this.uiLog.log('Handle QR Code Link: ' + url);
      if (url.indexOf('https://beanconqueror.com/app/roaster/bean') === 0) {
        const qrCodeId: string = String(this.findParameterByCompleteUrl(url,'id'));
        await this.addBeanFromServer(qrCodeId);
      } else {
        this.uiAlert.showMessage('QR.WRONG_QRCODE_DESCRIPTION','QR.WRONG_QRCODE_TITLE',undefined,true);
      }
    });
  }

  private async handleDeepLink(_matchLink) {
    try {
      if (_matchLink && _matchLink.url) {
          await this.uiHelper.isBeanconqurorAppReady().then(async () => {
          const url: string = _matchLink.url;

          this.uiLog.log('Handle deeplink: ' + url);
          if (url.indexOf('https://beanconqueror.com/app/roaster/bean') === 0) {
            const qrCodeId: string = String(this.findGetParameter(_matchLink.queryString,'id'));
            await this.addBeanFromServer(qrCodeId);
          } else if (url.indexOf('beanconqueror://ADD_BEAN_ONLINE?') === 0) {
            const qrCodeId: string = String(this.findGetParameter(_matchLink.queryString,'id'));
            await this.addBeanFromServer(qrCodeId);
          } else {
            this.uiAlert.showMessage('QR.WRONG_LINK_DESCRIPTION','QR.WRONG_LINK_TITLE',undefined,true);
          }
        });
      }

    } catch (ex) {

    }

  }


  private async addBeanFromServer(_qrCodeId: string) {
    this.uiLog.log('Load bean information from server: ' + _qrCodeId);

    try {
      await this.uiAlert.showLoadingSpinner();
      const beanData: ServerBean = await this.serverCommunicationService.getBeanInformation(_qrCodeId);
      await this.uiBeanHelper.addScannedQRBean(beanData);
    } catch (ex) {
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage('QR.SERVER.ERROR_OCCURED','ERROR_OCCURED',undefined,true);
    }

  }

}
