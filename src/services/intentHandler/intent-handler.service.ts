import { Injectable } from '@angular/core';
import {UIHelper} from '../uiHelper';
declare var window;
@Injectable({
  providedIn: 'root'
})
export class IntentHandlerService {

  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE'
  };
  constructor(private readonly uiHelper: UIHelper) { }

  public attachOnHandleOpenUrl() {
    (window['handleOpenURL']) = (_url) => {
      this.uiHelper.isBeanconqurorAppReady().then(async () => {


        this.handleIntentFromUrl(_url);
        setTimeout(()  => {

          alert('received url11: ' + _url);
        }, 0);

      });

    }
  }

  public handleIntentFromUrl(_url) {
    const internalCall = _url.replace('beanconqueror://', '');
      if(internalCall.startsWith(IntentHandlerService.SUPPORTED_INTENTS.ADD_BEAN_ONLINE)) {
        const onlineBeanId: number = Number(internalCall.replace(IntentHandlerService.SUPPORTED_INTENTS.ADD_BEAN_ONLINE + '=',''));
        this.addBeanFromServer(onlineBeanId);
      }
  }

  private addBeanFromServer(_beanId:number) {

  }

}
