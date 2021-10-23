import { Injectable } from '@angular/core';
import {UISettingsStorage} from '../uiSettingsStorage';
import currencyToSymbolMap from 'currency-symbol-map/map';
@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

  constructor(private readonly uiSettingsStorage: UISettingsStorage) { }

  public getCurrencies() {
    return currencyToSymbolMap;
  }


  public getActualCurrencySymbol() {
    return currencyToSymbolMap[this.uiSettingsStorage.getSettings().currency];
  }
}
