import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';
import {
  CloudModel,
  fetchAvailableModels,
} from '../../services/aiBeanImport/cloud-model-list.service';

@Component({
  selector: 'app-cloud-model-picker',
  templateUrl: './cloud-model-picker.component.html',
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonContent,
    IonSpinner,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class CloudModelPickerComponent implements OnInit {
  public static readonly COMPONENT_ID = 'cloud-model-picker';

  @Input() provider: AI_PROVIDER_ENUM;
  @Input() apiKey: string;
  @Input() baseUrl?: string;

  models: CloudModel[] = [];
  filteredModels: CloudModel[] = [];
  searchTerm = '';
  loading = true;
  error = false;

  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ close });
  }

  ngOnInit(): void {
    void this.loadModels();
  }

  private async loadModels(): Promise<void> {
    try {
      this.models = await fetchAvailableModels(
        this.provider,
        this.apiKey,
        this.baseUrl,
      );
      this.filteredModels = [...this.models];
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  filterModels(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredModels = this.models.filter(
      (m) =>
        m.id.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term),
    );
  }

  selectModel(model: CloudModel): void {
    void this.modalCtrl.dismiss(
      { modelId: model.id },
      'confirm',
      CloudModelPickerComponent.COMPONENT_ID,
    );
  }

  dismiss(): void {
    void this.modalCtrl.dismiss(
      null,
      'cancel',
      CloudModelPickerComponent.COMPONENT_ID,
    );
  }
}
