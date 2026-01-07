import { Injectable, inject } from '@angular/core';
import { UISettingsStorage } from '../uiSettingsStorage';
import currencyToSymbolMap from 'currency-symbol-map/map';
@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public getCurrencies() {
    return currencyToSymbolMap;
  }

  public getActualCurrencySymbol() {
    return currencyToSymbolMap[this.uiSettingsStorage.getSettings().currency];
  }
}
