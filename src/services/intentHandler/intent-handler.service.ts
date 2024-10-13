import { Injectable, NgZone } from '@angular/core';
import { UIHelper } from '../uiHelper';

import { UILog } from '../uiLog';
import { ServerCommunicationService } from '../serverCommunication/server-communication.service';
import { UIBeanHelper } from '../uiBeanHelper';
import { ServerBean } from '../../models/bean/serverBean';
import { UIAlert } from '../uiAlert';
import QR_TRACKING from '../../data/tracking/qrTracking';
import { UIAnalytics } from '../uiAnalytics';
import { VisualizerService } from '../visualizerService/visualizer-service.service';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { BEAN_CODE_ACTION } from '../../enums/beans/beanCodeAction';
import { UIBrewHelper } from '../uiBrewHelper';

@Injectable({
  providedIn: 'root',
})
export class IntentHandlerService {
  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE',
    ADD_USER_BEAN: 'ADD_USER_BEAN',
  };
  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiLog: UILog,
    private readonly serverCommunicationService: ServerCommunicationService,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiAnalytics: UIAnalytics,
    private readonly visualizerService: VisualizerService,
    private readonly zone: NgZone
  ) {}

  public attachOnHandleOpenUrl() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        this.uiLog.log('Deeplink matched ' + JSON.stringify(event));
        this.handleDeepLink(event.url);
      });
    });
  }

  public async handleQRCodeLink(_url) {
    await this.uiHelper.isBeanconqurorAppReady().then(async () => {
      const url: string = _url;
      this.uiLog.log('Handle QR Code Link: ' + url);
      await this.handleDeepLink(_url);
    });
  }

  public async handleDeepLink(_url) {
    try {
      if (_url) {
        await this.uiHelper.isBeanconqurorAppReady().then(async () => {
          const url: string = _url;

          const urlParams = new URLSearchParams(url.split('?')[1]);

          this.uiLog.log('Handle deeplink: ' + url);
          if (
            url.indexOf('https://beanconqueror.com/?qr=') === 0 ||
            url.indexOf('https://beanconqueror.com?qr=') === 0 ||
            url.indexOf('?qr=') >= 0
          ) {
            const qrCodeId: string = urlParams.get('qr');
            await this.addBeanFromServer(qrCodeId);
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://ADD_BEAN_ONLINE'.toLowerCase()) === 0
          ) {
            const qrCodeId: string = urlParams.get('id');
            await this.addBeanFromServer(qrCodeId);
          } else if (
            url.indexOf('https://beanconqueror.com/?shareUserBean0=') === 0 ||
            url.indexOf('https://beanconqueror.com?shareUserBean0=') === 0 ||
            url.indexOf('?shareUserBean0=') >= 0
          ) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            try {
              for (const param of foundJSONParams) {
                userBeanJSON += String(urlParams.get(param));
              }
            } catch (ex) {}
            this.uiLog.log('Found shared bean ' + userBeanJSON);
            if (userBeanJSON) {
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://ADD_USER_BEAN'.toLowerCase()) === 0
          ) {
            let userBeanJSON: string = '';

            const regex = /((shareUserBean)[0-9]+(?=\=))/gi;
            const foundJSONParams = url.match(regex);
            for (const param of foundJSONParams) {
              userBeanJSON += String(urlParams.get(param));
            }
            if (userBeanJSON) {
              await this.addBeanFromUser(userBeanJSON);
            }
          } else if (
            url
              .toLowerCase()
              .indexOf('beanconqueror://VISUALIZER_SHARE'.toLowerCase()) === 0
          ) {
            const visualizerShareCode = String(urlParams.get('code'));

            this.importVisualizerShot(visualizerShareCode);
          } else if (
            url.indexOf('https://beanconqueror.com/?visualizerShare=') === 0 ||
            url.indexOf('https://beanconqueror.com?visualizerShare=') === 0 ||
            url.indexOf('?visualizerShare=') >= 0
          ) {
            const visualizerShareCode = String(
              urlParams.get('visualizerShare')
            );

            this.importVisualizerShot(visualizerShareCode);
          } else if (url.indexOf('bean.html') >= 0) {
            /**
             * On Android the whole path is directly resolved, therefore its the new url used**/
            const qrCodeId: string = urlParams.get('id');
            await this.addBeanFromServer(qrCodeId);
          } else if (url.indexOf('int/') > 0) {
            //We got an internal call ihr right now :)
            // Split into type, id, action ['bean', '3E95E1', 'START_BREW']
            const data = url.split('int/')[1].split('/');
            const actionType = data[0];
            const id = data[1];
            const action = data[2];
            if (actionType === 'bean') {
              if ((action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.DETAIL) {
                await this.uiBeanHelper.detailBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.EDIT
              ) {
                await this.uiBeanHelper.editBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) === BEAN_CODE_ACTION.START_BREW
              ) {
                await this.uiBrewHelper.startBrewForBeanByInternalShareCode(id);
              } else if (
                (action as BEAN_CODE_ACTION) ===
                BEAN_CODE_ACTION.START_BREW_CHOOSE_PREPARATION
              ) {
                await this.uiBrewHelper.startBrewAndChoosePreparationMethodForBeanByInternalShareCode(
                  id
                );
              }
            }
          } else {
            this.uiAlert.showMessage(
              'QR.WRONG_QRCODE_DESCRIPTION',
              'QR.WRONG_QRCODE_TITLE',
              undefined,
              true
            );
          }
        });
      }
    } catch (ex) {
      if (this.uiAlert.isLoadingSpinnerShown()) {
        this.uiAlert.hideLoadingSpinner();
      }
    }
  }

  private importVisualizerShot(_shareCode) {
    this.visualizerService.importShotWithSharedCode(_shareCode);
  }
  private async addBeanFromServer(_qrCodeId: string) {
    this.uiLog.log('Load bean information from server: ' + _qrCodeId);

    try {
      await this.uiAlert.showLoadingSpinner();
      const beanData: ServerBean =
        await this.serverCommunicationService.getBeanInformation(_qrCodeId);
      await this.uiBeanHelper.addScannedQRBean(beanData);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true
      );
    }
  }

  public async addBeanFromUser(_userBeanJSON: string) {
    this.uiLog.log(
      'Load bean information from shared user context: ' + _userBeanJSON
    );

    try {
      await this.uiAlert.showLoadingSpinner();

      await this.uiBeanHelper.addUserSharedBean(_userBeanJSON);
    } catch (ex) {
      this.uiAnalytics.trackEvent(
        QR_TRACKING.TITLE,
        QR_TRACKING.ACTIONS.SCAN_FAILED
      );
      await this.uiAlert.hideLoadingSpinner();
      this.uiAlert.showMessage(
        'QR.SERVER.ERROR_OCCURED',
        'ERROR_OCCURED',
        undefined,
        true
      );
    }
  }
}
