import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Brew } from '../../../classes/brew/brew';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { Settings } from '../../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-brew-maximize-controls',
  templateUrl: './brew-maximize-controls.component.html',
  styleUrls: ['./brew-maximize-controls.component.scss'],
  imports: [
    IonHeader,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
  ],
})
export class BrewMaximizeControlsComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  public static COMPONENT_ID: string = 'brew-maximize-controls';

  @Input() public brew: Brew;
  @Input() public brewComponent: BrewBrewingComponent;
  @Input() private brewTimerTickedEvent: EventEmitter<any>;
  public settings: Settings;

  private disableHardwareBack;
  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  private brewTimerTickedSubscription: Subscription;
  @ViewChild('timerElement', { static: false })
  public timerElement: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,

    private readonly platform: Platform,
  ) {
    addIcons({ closeOutline });
  }
  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          this.dismiss();
        },
      );
    } catch (ex) {}
  }

  public ionViewDidEnter() {
    const wantedDisplayFormat = this.returnWantedDisplayFormat();
    this.__writeTimeNative(wantedDisplayFormat);
    this.brewTimerTickedSubscription = this.brewTimerTickedEvent.subscribe(
      (_val) => {
        this.__writeTimeNative(wantedDisplayFormat);
      },
    );
  }

  private __writeTimeNative(_wantedDisplayFormat) {
    let writingVal = '';
    if (this.settings.brew_milliseconds === false) {
      writingVal = String(
        this.uiHelper.formatSeconds(this.brew.brew_time, 'mm:ss'),
      );
    } else {
      writingVal = String(
        this.uiHelper.formatSecondsAndMilliseconds(
          this.brew.brew_time,
          this.brew.brew_time_milliseconds,
          _wantedDisplayFormat,
        ),
      );
    }

    if (this.timerElement?.nativeElement) {
      window.requestAnimationFrame(() => {
        this.timerElement.nativeElement.innerHTML = writingVal;
      });
    }
  }

  public returnWantedDisplayFormat() {
    const showMinutes: boolean = true;
    let showHours: boolean = false;
    let showMilliseconds: boolean = false;
    if (this.brew.brew_time >= 3600) {
      showHours = true;
    }

    if (this.settings?.brew_milliseconds) {
      showMilliseconds = true;
    }

    let returnStr: string = '';
    if (showMilliseconds) {
      if (this.settings.brew_milliseconds_leading_digits === 3) {
        returnStr = '.SSS';
      } else if (this.settings.brew_milliseconds_leading_digits === 2) {
        returnStr = '.SS';
      } else {
        returnStr = '.S';
      }
    }
    if (showHours) {
      return 'H:mm:ss' + returnStr;
    } else if (showMinutes) {
      return 'mm:ss' + returnStr;
    } else {
      return 'ss' + returnStr;
    }
  }

  public async ngAfterViewInit() {}

  public async startTimer() {
    await this.brewComponent.timerStartPressed(undefined);

    // Looks funny but we need. if we would not calculate and substract 25px, the actual time graph would not be displayed :<
    setTimeout(() => {
      try {
        const newHeight =
          document.getElementById('brewFlowContainer').offsetHeight;
        document
          .getElementById('brewFlowContainer')
          .getElementsByTagName('canvas')[0].style.height =
          newHeight - 1 + 'px';
      } catch (ex) {}
    }, 250);
  }
  public pauseTimer() {
    this.brewComponent.timer.pauseTimer();
  }
  public resetTimer() {
    this.brewComponent.timer.reset();
  }
  public resumeTimer() {
    this.brewComponent.timerResumedPressed(undefined);
  }

  public async ngOnDestroy() {
    if (this.brewTimerTickedSubscription) {
      this.brewTimerTickedSubscription.unsubscribe();
      this.brewTimerTickedSubscription = undefined;
    }
  }

  public dismiss() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewMaximizeControlsComponent.COMPONENT_ID,
    );
  }
}
