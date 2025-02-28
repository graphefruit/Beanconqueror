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
import { BrewFlow } from '../../../classes/brew/brewFlow';

@Component({
  selector: 'app-brew-modal-import-shot-gaggiuino',
  templateUrl: './brew-modal-import-shot-gaggiuino.component.html',
  styleUrls: ['./brew-modal-import-shot-gaggiuino.component.scss'],
})
export class BrewModalImportShotGaggiuinoComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-modal-import-shot-gaggiuino';

  @Input() public gaggiuinoDevice: GaggiuinoDevice;
  public radioSelection: string;
  public history: Array<BrewFlow> = undefined;

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  @ViewChild('historyShotContent', { read: ElementRef })
  public historyShotContent: ElementRef;

  @ViewChild('shotDataScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public shotDataScroll: AgVirtualSrollComponent;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;
  public segmentScrollHeight: string = undefined;
  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
  ) {}

  public ngOnInit() {
    setTimeout(() => {
      this.readHistory();
    }, 1000);
  }

  private async readHistory() {
    const lastShotId: number = await this.gaggiuinoDevice.getLastShotId();
    if (lastShotId === null) {
      //No shots have been done
    } else {
      const data = await this.gaggiuinoDevice.getShotData(lastShotId);

      const shotData = GaggiuinoDevice.returnBrewFlowForShotData(data);
      /**
       * TODO: Loop here for all other shots...
       */
      this.history = [];
      this.history.push(shotData);

      // copilot: write me a function that iterats through the last shot id for 10 last entires counting backwards, it could be that the lastShotId is less then 10, then just import as much as possible
    }
    //this.history = await this.meticulousDevice?.getHistory();
    this.retriggerScroll();
  }

  public async fetchShotDetails(lastShotId: number) {
    for (let id = lastShotId; id >= Math.max(1, lastShotId - 10); id--) {
      try {
        // const response = await fetch(http://gaggiuino.local/api/shots/${id});
        // const shotDetail: ShotDetail = await response.json();
        // Verarbeite die Shot-Details
        //console.log(shotDetail);
      } catch (error) {
        // console.error(There was a problem with the fetch operation for id ${id}:, error);
      }
    }
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualSrollComponent = this.shotDataScroll;

      if (scrollComponent) {
        scrollComponent.el.style.height = el.offsetHeight - 20 + 'px';
        this.segmentScrollHeight = scrollComponent.el.style.height;
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
    }
    this.modalController.dismiss(
      {
        choosenHistory: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
    );
  }
}
