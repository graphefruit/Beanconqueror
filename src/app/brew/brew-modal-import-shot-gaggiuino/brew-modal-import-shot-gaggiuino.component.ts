import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { GaggiuinoDevice } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoDevice';
import { GaggiuinoShotData } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoShotData';
import { UIAlert } from '../../../services/uiAlert';
import { FormsModule } from '@angular/forms';
import { GraphDisplayCardComponent } from '../../../components/graph-display-card/graph-display-card.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonRadioGroup,
  IonCard,
  IonItem,
  IonRadio,
  IonGrid,
  IonFooter,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';

@Component({
  selector: 'app-brew-modal-import-shot-gaggiuino',
  templateUrl: './brew-modal-import-shot-gaggiuino.component.html',
  styleUrls: ['./brew-modal-import-shot-gaggiuino.component.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    GraphDisplayCardComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonButton,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonRadioGroup,
    IonCard,
    IonItem,
    IonRadio,
    IonGrid,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewModalImportShotGaggiuinoComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggiuino';

  @Input() public gaggiuinoDevice: GaggiuinoDevice;
  public radioSelection: number;
  public history: Array<GaggiuinoShotData> = [];

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  @ViewChild('historyShotContent', { read: ElementRef })
  public historyShotContent: ElementRef;

  @ViewChild('gaggiuinoShotDataScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public gaggiuinoShotDataScroll: AgVirtualScrollComponent;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    const lastShotId: number = await this.gaggiuinoDevice.getLastShotId();
    if (lastShotId === null) {
      //No shots have been done
    } else {
      await this.uiAlert.showLoadingSpinner();
      await this.fetchShotDetails(lastShotId);
      await this.uiAlert.hideLoadingSpinner();
    }

    this.retriggerScroll();
  }

  public async fetchShotDetails(lastShotId: number) {
    const alldatatoPush = [];
    for (let id = lastShotId; id >= Math.max(1, lastShotId - 5); id--) {
      try {
        const gaggiuinoShotDataEntry = new GaggiuinoShotData();
        const data = await this.gaggiuinoDevice.getShotData(id);

        if (data !== null) {
          gaggiuinoShotDataEntry.id = id;
          gaggiuinoShotDataEntry.timestamp = data.timestamp;
          gaggiuinoShotDataEntry.profileName = data.profile.name;
          gaggiuinoShotDataEntry.brewFlow =
            GaggiuinoDevice.returnBrewFlowForShotData(data);
          gaggiuinoShotDataEntry.rawData = data;

          alldatatoPush.push(gaggiuinoShotDataEntry);
        }
      } catch (error) {
        // console.error(There was a problem with the fetch operation for id ${id}:, error);
      }
    }
    /**We need to grab all data before we can push it else the virtual scrolling has issues **/
    this.history = alldatatoPush;
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent =
        this.gaggiuinoShotDataScroll;

      if (scrollComponent) {
        scrollComponent.el.style.height = el.offsetHeight - 20 + 'px';
        // this.segmentScrollHeight = scrollComponent.el.style.height;
      }
    }, 150);
  }

  public getElementOffsetWidth() {
    if (this.ionItemEl?.nativeElement?.offsetWidth) {
      return this.ionItemEl?.nativeElement?.offsetWidth - 50;
    }
    return 0;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
    );
  }
  public choose(): void {
    let returningData;
    for (const entry of this.history) {
      if (entry.id === this.radioSelection) {
        returningData = entry;
        break;
      }
    }
    this.modalController.dismiss(
      {
        choosenData: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
    );
  }
}
