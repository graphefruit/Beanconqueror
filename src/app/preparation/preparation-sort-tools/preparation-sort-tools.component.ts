import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';

import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-preparation-sort-tools',
  templateUrl: './preparation-sort-tools.component.html',
  styleUrls: ['./preparation-sort-tools.component.scss'],
})
export class PreparationSortToolsComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-sort-tools';
  public toolsOrders: Array<{ number: number; label: string; enum: string }> =
    [];

  @Input() public preparation: Preparation;
  constructor(
    private readonly modalController: ModalController,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  public ngOnInit() {
    this.__initializeData();
  }

  public async save() {
    this.changeDetectorRef.detectChanges();
  }

  public reorder_tool(ev: any) {
    // The `from` and `to` properties contain the index of the item
    // when the drag started and ended, respectively
    // console.log('Dragged from index', ev.detail.from, 'to', ev.detail.to);
    // console.log(this.brewOrders);
    const reorderVar = this.toolsOrders;

    reorderVar.splice(ev.detail.to, 0, reorderVar.splice(ev.detail.from, 1)[0]);

    const swapElements = (myArray, index1, index2) => {
      [myArray[index1], myArray[index2]] = [myArray[index2], myArray[index1]];
    };

    swapElements(this.preparation.tools, ev.detail.from, ev.detail.to);

    // console.log(this.settings.brew_order);
    // Finish the reorder and position the item in the DOM based on
    // where the gesture ended. This method can also be called directly
    // by the reorder group
    ev.detail.complete();
    this.save();
  }

  private __initializeData(): void {
    this.__initializeBrewOrders();
  }

  private __initializeBrewOrders() {
    const tools = this.preparation.tools.filter((e) => e.archived === false);
    for (let i = 0; i < tools.length; i++) {
      this.toolsOrders.push({
        number: i,
        label: tools[i].name,
        enum: tools[i].config.uuid,
      });
    }

    this.toolsOrders.sort((obj1, obj2) => {
      if (obj1.number > obj2.number) {
        return 1;
      }

      if (obj1.number < obj2.number) {
        return -1;
      }

      return 0;
    });
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      PreparationSortToolsComponent.COMPONENT_ID
    );
  }
}
