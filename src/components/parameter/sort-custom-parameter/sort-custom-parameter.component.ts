import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {Preparation} from '../../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';

@Component({
  selector: 'sort-custom-parameter',
  templateUrl: './sort-custom-parameter.component.html',
  styleUrls: ['./sort-custom-parameter.component.scss'],
})
export class SortCustomParameterComponent implements OnInit {

  public brewOrdersBefore: Array<{ number: number, label: string, enum: string }> = [];

  public brewOrdersWhile: Array<{ number: number, label: string, enum: string }> = [];
  public brewOrdersAfter: Array<{ number: number, label: string, enum: string }> = [];



  @Input() public data: Settings | Preparation;
  constructor(public uiSettingsStorage: UISettingsStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly changeDetectorRef: ChangeDetectorRef) {


  }

  public ngOnInit() {
    this.__initializeData();
  }

  public save(): void {
    this.changeDetectorRef.detectChanges();
    if (this.data instanceof Settings) {
      this.uiSettingsStorage.saveSettings(this.data as Settings);
    } else {
      this.uiPreparationStorage.update(this.data as Preparation);
    }
  }

  public reorder_brew(ev: any, _type: string) {
    if (this.data instanceof Settings) {
      this.uiAnalytics.trackEvent('SETTINGS', 'REORDER_BREW');
    } else {
      this.uiAnalytics.trackEvent('PREPARATION', 'REORDER_BREW');
    }

    // The `from` and `to` properties contain the index of the item
    // when the drag started and ended, respectively
    // console.log('Dragged from index', ev.detail.from, 'to', ev.detail.to);
    // console.log(this.brewOrders);
    let reorderVar = [];
    if (_type === 'before') {
      reorderVar = this.brewOrdersBefore;
    } else if (_type === 'while') {
      reorderVar = this.brewOrdersWhile;
    } else if (_type === 'after') {
      reorderVar = this.brewOrdersAfter;
    }
    reorderVar.splice(ev.detail.to, 0, reorderVar.splice(ev.detail.from, 1)[0]);
    let count: number = 0;
    for (const order of reorderVar) {
      order.number = count;
      this.data.brew_order[_type][order.enum] = order.number;
      count++;
    }
    // console.log(this.settings.brew_order);
    // Finish the reorder and position the item in the DOM based on
    // where the gesture ended. This method can also be called directly
    // by the reorder group
    ev.detail.complete();
    this.save();
  }

  private __initializeData(): void {

    this.__initializeBrewOrders('before');
    this.__initializeBrewOrders('while');
    this.__initializeBrewOrders('after');
  }

  private __initializeBrewOrders(_type: string) {

    let initializeOrder: Array<{ number: number, label: string, enum: string }>;
    // Copy the reference here :)
    switch (_type) {
      case 'before':
        initializeOrder = this.brewOrdersBefore;
        break;
      case 'while':
        initializeOrder = this.brewOrdersWhile;
        break;
      case 'after':
        initializeOrder = this.brewOrdersAfter;
        break;
    }



    for (const key in this.data.brew_order[_type]) {
      if (this.data.brew_order[_type].hasOwnProperty(key)) {
        initializeOrder.push({
          number: this.data.brew_order[_type][key],
          label: this.data.brew_order.getLabel(key),
          enum: key,
        });
      }
    }
    initializeOrder.sort((obj1, obj2) => {
      if (obj1.number > obj2.number) {
        return 1;
      }

      if (obj1.number < obj2.number) {
        return -1;
      }

      return 0;
    });
  }

}
