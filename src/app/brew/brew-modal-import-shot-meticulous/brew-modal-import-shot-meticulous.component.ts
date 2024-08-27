import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';

import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { ModalController } from '@ionic/angular';
import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import { UIHelper } from '../../../services/uiHelper';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';

@Component({
  selector: 'app-brew-modal-import-shot-meticulous',
  templateUrl: './brew-modal-import-shot-meticulous.component.html',
  styleUrls: ['./brew-modal-import-shot-meticulous.component.scss'],
})
export class BrewModalImportShotMeticulousComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-modal-import-shot-meticulous';

  @Input() public meticulousDevice: MeticulousDevice;
  public radioSelection: string;
  public history: Array<HistoryListingEntry> = [];

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

  constructor(private readonly modalController: ModalController,
              public readonly uiHelper: UIHelper) {}

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    this.history = await this.meticulousDevice?.getHistory();
    this.retriggerScroll();

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
        scrollComponent.el.style.height =
          (el.offsetHeight -
          20) +
          'px';
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
      BrewModalImportShotMeticulousComponent.COMPONENT_ID
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
        choosenHistory: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID
    );
  }
}
