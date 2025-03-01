import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';

import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { GaggiuinoDevice } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoDevice';
import { GaggiuinoShotData } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoShotData';
import { UIAlert } from '../../../services/uiAlert';

@Component({
  selector: 'app-brew-modal-import-shot-gaggiuino',
  templateUrl: './brew-modal-import-shot-gaggiuino.component.html',
  styleUrls: ['./brew-modal-import-shot-gaggiuino.component.scss'],
})
export class BrewModalImportShotGaggiuinoComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggiuino';

  @Input() public gaggiuinoDevice: GaggiuinoDevice;
  public radioSelection: number;
  public history: Array<GaggiuinoShotData> = [];

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  @ViewChild('historyShotContent', { read: ElementRef })
  public historyShotContent: ElementRef;

  @ViewChild('gaggiuinoShotDataScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public gaggiuinoShotDataScroll: AgVirtualSrollComponent;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiAlert: UIAlert,
  ) {}

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
    for (let id = lastShotId; id >= Math.max(1, lastShotId - 10); id--) {
      try {
        const gaggiuinoShotDataEntry = new GaggiuinoShotData();
        const data = await this.gaggiuinoDevice.getShotData(id);

        gaggiuinoShotDataEntry.id = id;
        gaggiuinoShotDataEntry.timestamp = data.timestamp;
        gaggiuinoShotDataEntry.profileName = data.profile.name;
        gaggiuinoShotDataEntry.brewFlow =
          GaggiuinoDevice.returnBrewFlowForShotData(data);
        gaggiuinoShotDataEntry.rawData = data;
        /**
         * TODO: Loop here for all other shots...
         */

        alldatatoPush.push(gaggiuinoShotDataEntry);

        // const response = await fetch(http://gaggiuino.local/api/shots/${id});
        // const shotDetail: ShotDetail = await response.json();
        // Verarbeite die Shot-Details
        //console.log(shotDetail);
      } catch (error) {
        // console.error(There was a problem with the fetch operation for id ${id}:, error);
      }
    }
    /**We need to grab all data before we can push it else the virtual scrolling has issues **/
    this.history = alldatatoPush;
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualSrollComponent =
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
