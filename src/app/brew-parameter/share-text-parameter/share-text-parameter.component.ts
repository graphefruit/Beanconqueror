import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonCard,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonTitle,
} from '@ionic/angular/standalone';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ShareBrewTextFields } from '../../../classes/parameter/shareBrewTextFields';
import { HeaderComponent } from '../../../components/header/header.component';
import { translateShareLabel } from '../../../services/shareService/translate-share-label';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

type ShareField = keyof ShareBrewTextFields;

@Component({
  selector: 'app-share-text-parameter',
  templateUrl: './share-text-parameter.component.html',
  imports: [
    FormsModule,
    TranslatePipe,
    HeaderComponent,
    IonBackButton,
    IonCard,
    IonCheckbox,
    IonContent,
    IonFooter,
    IonHeader,
    IonItem,
    IonTitle,
  ],
})
export class ShareTextParameterComponent {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly translate = inject(TranslateService);
  public readonly settings = this.uiSettingsStorage.getSettings();

  public labelFor(key: string): string {
    return translateShareLabel(this.translate, key);
  }

  public readonly beanFields: { key: ShareField; label: string }[] = [
    { key: 'bean_name', label: 'BEAN_DATA_NAME' },
    { key: 'bean_roaster', label: 'BEAN_DATA_ROASTER' },
    { key: 'bean_country', label: 'BEAN_DATA_COUNTRY' },
    { key: 'bean_region', label: 'BEAN_DATA_REGION' },
    { key: 'bean_variety', label: 'BEAN_DATA_VARIETY' },
    { key: 'bean_processing', label: 'BEAN_DATA_PROCESSING' },
  ];
  public readonly brewFields: { key: ShareField; label: string }[] = [
    { key: 'method_of_preparation', label: 'BREW_DATA_PREPARATION_METHOD' },
    { key: 'mill', label: 'BREW_DATA_MILL' },
    { key: 'grind_size', label: 'BREW_DATA_GRIND_SIZE' },
    { key: 'grind_weight', label: 'BREW_DATA_GRIND_WEIGHT' },
    { key: 'brew_quantity', label: 'BREW_DATA_BREW_QUANTITY' },
    {
      key: 'brew_beverage_quantity',
      label: 'BREW_DATA_BREW_BEVERAGE_QUANTITY',
    },
    { key: 'brew_temperature', label: 'BREW_DATA_BREW_TEMPERATURE' },
    { key: 'brew_time', label: 'BREW_DATA_TIME' },
    { key: 'tds', label: 'TDS' },
    { key: 'extraction_yield', label: 'EY' },
    { key: 'rating', label: 'BREW_DATA_RATING' },
    { key: 'note', label: 'BREW_DATA_NOTES' },
  ];

  public isLastSelected(key: ShareField): boolean {
    const fields = this.settings.share_brew_text_fields;
    return fields[key] && Object.values(fields).filter(Boolean).length === 1;
  }

  public async setField(key: ShareField, selected: boolean): Promise<void> {
    this.settings.share_brew_text_fields[key] = selected;
    await this.uiSettingsStorage.saveSettings(this.settings);
  }
}

export default ShareTextParameterComponent;
