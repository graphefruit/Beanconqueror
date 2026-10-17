import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCheckbox,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonInput,
  IonItem,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { Keyboard } from '@capacitor/keyboard';
import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Settings } from '../../classes/settings/settings';
import { MaxNumberValueDirective } from '../../directive/max-number-value.directive';
import { PreventCharacterDirective } from '../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../directive/remove-empty-number.directive';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'app-datetime-popover',
  templateUrl: './datetime-popover.component.html',
  styleUrls: ['./datetime-popover.component.scss'],
  imports: [
    FormsModule,
    MaxNumberValueDirective,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonCheckbox,
    IonInput,
    IonButton,
  ],
})
export class DatetimePopoverComponent implements OnInit, OnDestroy {
  private readonly modalCtrl = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly elementRef = inject(ElementRef);

  public timer = {
    HOURS: 0,
    MINUTES: 0,
    SECONDS: 0,
    MILLISECONDS: 0,
  };

  public colSize: number = 3;

  public maxMilliSecond: number = 999;

  @ViewChild('hourInput', { static: false }) public hourInput?: IonInput;
  @ViewChild('minuteInput', { static: false }) public minuteInput?: IonInput;
  @ViewChild('secondInput', { static: false }) public secondInput?: IonInput;
  @ViewChild('millisecondInput', { static: false })
  public millisecondInput?: IonInput;

  @Input() public displayingTime: string;
  public settings: Settings;
  private isDismissing: boolean = false;

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    const passedDisplayingTime = moment(this.displayingTime);

    this.timer.HOURS = passedDisplayingTime.hours();
    this.timer.MINUTES = passedDisplayingTime.minutes();
    this.timer.SECONDS = passedDisplayingTime.seconds();
    this.timer.MILLISECONDS = passedDisplayingTime.milliseconds();
    this.colSize = this.getColSize();
  }

  public ngOnDestroy(): void {
    this.dismissKeyboard();
  }

  @HostListener('document:focusin', ['$event'])
  public onDocumentFocusIn(event: FocusEvent): void {
    if (this.isDismissing) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }
    // Prevent iOS keyboard accessory 'Next' / 'Previous' buttons from escaping to background page inputs
    if (!this.elementRef.nativeElement.contains(target)) {
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'ION-INPUT' ||
        target.tagName === 'ION-TEXTAREA' ||
        target.closest('ion-input, ion-textarea')
      ) {
        target.blur();
        setTimeout(() => {
          if (!this.isDismissing) {
            this.focusFirstInput();
          }
        }, 50);
      }
    }
  }

  public async dismissKeyboard(): Promise<void> {
    try {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
      await Keyboard.hide();
    } catch (e) {}
  }

  public onContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target &&
      !target.closest(
        'ion-input, input, ion-button, button, ion-checkbox, ion-item',
      )
    ) {
      this.dismissKeyboard();
    }
  }

  public getVisibleInputs(): IonInput[] {
    const inputs: IonInput[] = [];
    if (this.settings?.brew_timer_show_hours && this.hourInput) {
      inputs.push(this.hourInput);
    }
    if (this.settings?.brew_timer_show_minutes && this.minuteInput) {
      inputs.push(this.minuteInput);
    }
    if (this.secondInput) {
      inputs.push(this.secondInput);
    }
    if (this.settings?.brew_milliseconds && this.millisecondInput) {
      inputs.push(this.millisecondInput);
    }
    return inputs;
  }

  public focusFirstInput(): void {
    const inputs = this.getVisibleInputs();
    if (inputs.length > 0) {
      inputs[0].setFocus();
    }
  }

  public focusLastInput(): void {
    const inputs = this.getVisibleInputs();
    if (inputs.length > 0) {
      inputs[inputs.length - 1].setFocus();
    }
  }

  public onInputKeydown(
    event: KeyboardEvent,
    fieldName: 'HOURS' | 'MINUTES' | 'SECONDS' | 'MILLISECONDS',
  ): void {
    const inputs = this.getVisibleInputs();
    if (inputs.length === 0) {
      return;
    }
    const firstInput = inputs[0];
    const lastInput = inputs[inputs.length - 1];

    let currentInput: IonInput | undefined;
    switch (fieldName) {
      case 'HOURS':
        currentInput = this.hourInput;
        break;
      case 'MINUTES':
        currentInput = this.minuteInput;
        break;
      case 'SECONDS':
        currentInput = this.secondInput;
        break;
      case 'MILLISECONDS':
        currentInput = this.millisecondInput;
        break;
    }

    if (event.key === 'Tab') {
      if (event.shiftKey && currentInput === firstInput) {
        event.preventDefault();
        lastInput.setFocus();
      } else if (!event.shiftKey && currentInput === lastInput) {
        event.preventDefault();
        firstInput.setFocus();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (currentInput === lastInput) {
        this.choose();
      } else {
        const currentIndex = inputs.indexOf(currentInput);
        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].setFocus();
        }
      }
    }
  }

  public saveSettings() {
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public getColSize() {
    const showMilliSeconds = this.settings?.brew_milliseconds;
    const showHours: boolean = this.settings.brew_timer_show_hours;
    const showMinutes: boolean = this.settings.brew_timer_show_minutes;

    let sizeCounter = 0;
    if (showMilliSeconds) {
      sizeCounter = sizeCounter + 1;
    }
    if (showHours) {
      sizeCounter = sizeCounter + 1;
    }
    if (showMinutes) {
      sizeCounter = sizeCounter + 1;
    }
    if (sizeCounter === 0) {
      //Just seconds are shown
      return 12;
    } else if (sizeCounter === 1) {
      //Just seconds +1 is shown
      return 6;
    } else if (sizeCounter === 2) {
      //seconds +2 are shown
      return 4;
    } else {
      return 3;
    }
  }

  public reset() {
    this.timer.HOURS = 0;
    this.timer.MINUTES = 0;
    this.timer.SECONDS = 0;
    this.timer.MILLISECONDS = 0;
  }

  public getMaxMillisecondNumber() {
    return 999;
  }

  private async safeDismiss(data?: any): Promise<void> {
    try {
      const dismissPromise = this.modalCtrl.dismiss(
        data,
        undefined,
        'datetime-popover',
      );
      const timeoutPromise = new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 400),
      );

      const dismissed = await Promise.race([dismissPromise, timeoutPromise]);
      if (!dismissed) {
        const topModal = await this.modalCtrl.getTop();
        if (topModal && topModal.id === 'datetime-popover') {
          await topModal.dismiss(data);
        }
      }
    } catch (err) {
      try {
        const topModal = await this.modalCtrl.getTop();
        if (topModal) {
          await topModal.dismiss(data);
        }
      } catch (innerErr) {}
    } finally {
      setTimeout(() => {
        const stuckModal = document.getElementById(
          'datetime-popover',
        ) as HTMLIonModalElement;
        if (stuckModal) {
          stuckModal.style.removeProperty('pointer-events');
          try {
            (stuckModal as any).didDismiss?.emit({ data, role: 'timeout' });
            stuckModal.dispatchEvent(
              new CustomEvent('ionModalDidDismiss', {
                detail: { data, role: 'timeout' },
              }),
            );
          } catch (e) {}
          stuckModal.remove();
        }
        this.isDismissing = false;
      }, 450);
    }
  }

  public async dismiss(): Promise<void> {
    if (this.isDismissing) {
      return;
    }
    this.isDismissing = true;
    await this.dismissKeyboard();
    await this.safeDismiss({
      dismissed: true,
    });
  }

  public async choose(): Promise<void> {
    if (this.isDismissing) {
      return;
    }
    this.isDismissing = true;
    await this.dismissKeyboard();

    const newDisplayingTime = moment().startOf('day');
    if (this.timer.MILLISECONDS > 0) {
      newDisplayingTime.add('milliseconds', this.timer.MILLISECONDS);
    }
    if (this.timer.SECONDS > 0) {
      newDisplayingTime.add('seconds', this.timer.SECONDS);
    }
    if (this.timer.MINUTES > 0) {
      newDisplayingTime.add('minutes', this.timer.MINUTES);
    }
    if (this.timer.HOURS > 0) {
      newDisplayingTime.add('hours', this.timer.HOURS);
    }

    await this.safeDismiss({
      displayingTime: newDisplayingTime.toISOString(),
    });
  }
}
