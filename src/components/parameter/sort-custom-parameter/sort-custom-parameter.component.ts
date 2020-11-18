import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'sort-custom-parameter',
  templateUrl: './sort-custom-parameter.component.html',
  styleUrls: ['./sort-custom-parameter.component.scss'],
})
export class SortCustomParameterComponent implements OnInit {
  public settings: Settings;
  public brewOrdersBefore: Array<{ number: number, label: string, enum: string }> = [];

  public brewOrdersWhile: Array<{ number: number, label: string, enum: string }> = [];
  public brewOrdersAfter: Array<{ number: number, label: string, enum: string }> = [];


  constructor(public uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly changeDetectorRef: ChangeDetectorRef) {

    this.__initializeSettings();
  }

  public ngOnInit() {
  }

  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public reorder_brew(ev: any, _type: string) {

    this.uiAnalytics.trackEvent('SETTINGS', 'REORDER_BREW');
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
      this.settings.brew_order[_type][order.enum] = order.number;
      count++;
    }
    // console.log(this.settings.brew_order);
    // Finish the reorder and position the item in the DOM based on
    // where the gesture ended. This method can also be called directly
    // by the reorder group
    ev.detail.complete();
    this.saveSettings();
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
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

    for (const key in this.settings.brew_order[_type]) {
      if (this.settings.brew_order[_type].hasOwnProperty(key)) {
        initializeOrder.push({
          number: this.settings.brew_order[_type][key],
          label: this.settings.brew_order.getLabel(key),
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
