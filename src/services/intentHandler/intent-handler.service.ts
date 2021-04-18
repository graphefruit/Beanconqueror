import { Injectable } from '@angular/core';
import {UIHelper} from '../uiHelper';
import {Deeplinks} from '@ionic-native/deeplinks/ngx';
import {InfoComponent} from '../../app/info/info.component';
declare var window;
@Injectable({
  providedIn: 'root'
})
export class IntentHandlerService {

  public static SUPPORTED_INTENTS = {
    ADD_BEAN_ONLINE: 'ADD_BEAN_ONLINE'
  };
  constructor(private readonly uiHelper: UIHelper,
              private readonly deeplinks: Deeplinks) { }

  public attachOnHandleOpenUrl() {
    this.deeplinks.route( {
      '/app/roaster/bean': InfoComponent
    }).subscribe((match) => {
        // match.$route - the route we matched, which is the matched entry from the arguments to route()
        // match.$args - the args passed in the link
        // match.$link - the full link data
        console.log('Successfully matched route', match);
      },
      (nomatch) => {
        // nomatch.$link - the full link data
        console.error('Got a deeplink that didn\'t match', nomatch);
      });
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
