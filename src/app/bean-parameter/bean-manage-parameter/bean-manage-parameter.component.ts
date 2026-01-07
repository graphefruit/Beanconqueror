import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Settings } from '../../../classes/settings/settings';

import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonItem,
  IonCheckbox,
  IonCardContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-bean-manage-parameter',
  templateUrl: './bean-manage-parameter.component.html',
  styleUrls: ['./bean-manage-parameter.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonCard,
    IonItem,
    IonCheckbox,
    IonCardContent,
  ],
})
export class BeanManageParameterComponent {
  uiSettingsStorage = inject(UISettingsStorage);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  public bean_segment = 'general';
  public debounceChanges: Subject<string> = new Subject<string>();
  public data: Settings;
  private numerator: number = 0;

  constructor() {
    this.debounceChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.save();
      });
    this.data = this.uiSettingsStorage.getSettings();
  }

  public triggerChanges(_query): void {
    this.debounceChanges.next(this.numerator.toString());
    this.numerator = this.numerator + 1;
  }

  public async save() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.data);
  }
}
