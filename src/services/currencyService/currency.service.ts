import { inject, Injectable } from '@angular/core';

import currencyToSymbolMap from 'currency-symbol-map/map';

import { UISettingsStorage } from '../uiSettingsStorage';

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
