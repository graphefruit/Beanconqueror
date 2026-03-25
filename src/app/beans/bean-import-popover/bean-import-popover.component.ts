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
import { AI_PROVIDER_ENUM } from '../../../enums/settings/aiProvider';
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
    if (!this.platform.is('capacitor')) {
      return false;
    }
    const settings = this.uiSettingsStorage.getSettings();
    if (settings.ai_provider === AI_PROVIDER_ENUM.NO_PROVIDER) {
      return false;
    }
    if (
      this.platform.is('ios') &&
      settings.ai_provider === AI_PROVIDER_ENUM.APPLE_INTELLIGENCE
    ) {
      return true;
    }
    return (
      settings.ai_provider !== AI_PROVIDER_ENUM.APPLE_INTELLIGENCE &&
      !!settings.cloud_ai_api_key &&
      !!settings.cloud_ai_model
    );
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
