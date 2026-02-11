import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonItem,
  IonRadio,
  IonRadioGroup,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { GaggiuinoDevice } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoDevice';
import { GaggiuinoShotData } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoShotData';
import { GraphDisplayCardComponent } from '../../../components/graph-display-card/graph-display-card.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';

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
    setTimeout(() => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent =
        this.gaggiuinoShotDataScroll;

      if (!scrollComponent) {
        return;
      }

      scrollComponent.el.style.height = el.offsetHeight - 20 + 'px';
      // this.segmentScrollHeight = scrollComponent.el.style.height;

      // HACK: Manually trigger component refresh to work around initialization
      //       bug. For some reason the scroll component sees its own height as
      //       0 during initialization, which causes it to render 0 items. As
      //       no changes to the component occur after initialization, no
      //       re-render ever occurs. This forces one. The root cause for
      //       this issue is currently unknown.
      if (scrollComponent.items.length === 0) {
        scrollComponent.refreshData();
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
