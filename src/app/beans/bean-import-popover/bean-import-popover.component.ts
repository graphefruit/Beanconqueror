import { Component, inject, OnInit } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, imagesOutline, qrCodeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { BEAN_IMPORT_ACTION } from '../../../enums/beans/beanImportAction';
import { CLOUD_AI_PROVIDER_ENUM } from '../../../enums/settings/cloudAiProvider';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-bean-import-popover',
  templateUrl: './bean-import-popover.component.html',
  styleUrls: ['./bean-import-popover.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
  ],
})
export class BeanImportPopoverComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly platform = inject(Platform);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static COMPONENT_ID = 'bean-import-popover';

  constructor() {
    addIcons({ qrCodeOutline, cameraOutline, imagesOutline });
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

  public getStaticActions(): any {
    return BEAN_IMPORT_ACTION;
  }

  /**
   * Check if AI import is available:
   * - iOS + Capacitor (on-device Apple Intelligence path), OR
   * - Any platform + Capacitor with cloud AI configured
   */
  public isAiImportAvailable(): boolean {
    if (this.platform.is('ios') && this.platform.is('capacitor')) {
      return true;
    }
    if (this.platform.is('capacitor')) {
      const settings = this.uiSettingsStorage.getSettings();
      return (
        settings.cloud_ai_provider !==
          CLOUD_AI_PROVIDER_ENUM.APPLE_INTELLIGENCE &&
        !!settings.cloud_ai_api_key &&
        !!settings.cloud_ai_model
      );
    }
    return false;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BeanImportPopoverComponent.COMPONENT_ID,
    );
  }

  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanImportPopoverComponent.COMPONENT_ID,
    );
  }
}
