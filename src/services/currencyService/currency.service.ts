import { inject, Service } from '@angular/core';

import currencyToSymbolMap from 'currency-symbol-map/map';

import { UISettingsStorage } from '../uiSettingsStorage';

@Service()
export class CurrencyService {
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public getCurrencies() {
    return currencyToSymbolMap;
  }

  public getActualCurrencySymbol() {
    return currencyToSymbolMap[this.uiSettingsStorage.getSettings().currency];
  }
}
