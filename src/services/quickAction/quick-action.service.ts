import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';

import { UIBeanHelper } from '../uiBeanHelper';
import { UIBrewHelper } from '../uiBrewHelper';
import { UIMillHelper } from '../uiMillHelper';
import { UIPreparationHelper } from '../uiPreparationHelper';

/**
 * What the home screen offers: the forms of the iOS quick actions, Android
 * shortcuts and the widget's button, and the brews a tap on the widget shows.
 */
export const QUICK_ACTION_TYPES = [
  'Brew',
  'Bean',
  'Preparation',
  'Mill',
  'Brews',
] as const;
export type QuickActionType = (typeof QUICK_ACTION_TYPES)[number];

export function isQuickActionType(_type: string): _type is QuickActionType {
  return (QUICK_ACTION_TYPES as readonly string[]).includes(_type);
}

/**
 * Opens the form or page of a quick action. While a brew form is open,
 * nothing else opens and the tab stays: a new form and the change of tab
 * would cover the open brew.
 */
@Service()
export class QuickActionService {
  private readonly router = inject(Router);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiMillHelper = inject(UIMillHelper);

  public async open(_type: QuickActionType): Promise<void> {
    if (_type === 'Brew') {
      if (await this.uiBrewHelper.addBrew()) {
        await this.router.navigate(['/home/brews'], { replaceUrl: true });
      }
      return;
    }
    if (!this.uiBrewHelper.canOpenBrewFormIfNotShowMessage()) {
      return;
    }
    if (_type === 'Brews') {
      await this.router.navigate(['/home/brews'], { replaceUrl: true });
      return;
    }
    if (_type === 'Bean') {
      await this.uiBeanHelper.addBean();
    } else if (_type === 'Preparation') {
      await this.uiPreparationHelper.addPreparation();
    } else {
      await this.uiMillHelper.addMill();
    }
    await this.router.navigate(['/'], { replaceUrl: true });
  }
}
