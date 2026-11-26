import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { UIBeanHelper } from '../../uiBeanHelper';
import { UIBrewHelper } from '../../uiBrewHelper';
import { UIMillHelper } from '../../uiMillHelper';
import { UIPreparationHelper } from '../../uiPreparationHelper';
import {
  isQuickActionType,
  QuickActionService,
  type QuickActionType,
} from '../quick-action.service';

describe('QuickActionService', () => {
  let service: QuickActionService;
  let navigate: jasmine.Spy;
  let canOpenBrewForm: boolean;
  let forms: Record<string, jasmine.Spy>;

  beforeEach(() => {
    canOpenBrewForm = true;
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    forms = {
      addBrew: jasmine.createSpy('addBrew').and.resolveTo(true),
      addBean: jasmine.createSpy('addBean').and.resolveTo(),
      addPreparation: jasmine.createSpy('addPreparation').and.resolveTo(),
      addMill: jasmine.createSpy('addMill').and.resolveTo(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        {
          provide: UIBrewHelper,
          useValue: {
            addBrew: forms.addBrew,
            canOpenBrewFormIfNotShowMessage: () => canOpenBrewForm,
          },
        },
        { provide: UIBeanHelper, useValue: { addBean: forms.addBean } },
        {
          provide: UIPreparationHelper,
          useValue: { addPreparation: forms.addPreparation },
        },
        { provide: UIMillHelper, useValue: { addMill: forms.addMill } },
      ],
    });
    service = TestBed.inject(QuickActionService);
  });

  const cases: [QuickActionType, string][] = [
    ['Brew', 'addBrew'],
    ['Bean', 'addBean'],
    ['Preparation', 'addPreparation'],
    ['Mill', 'addMill'],
  ];
  for (const [type, form] of cases) {
    it(`opens only the ${form} form for ${type}`, async () => {
      await service.open(type);

      for (const [, other] of cases) {
        expect(forms[other].calls.count()).toBe(other === form ? 1 : 0);
      }
    });
  }

  it('shows the brews after the brew form', async () => {
    await service.open('Brew');

    expect(navigate).toHaveBeenCalledOnceWith(['/home/brews'], {
      replaceUrl: true,
    });
  });

  it('keeps the tab when no brew form opened', async () => {
    forms.addBrew.and.resolveTo(false);

    await service.open('Brew');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the start page after the other forms', async () => {
    await service.open('Preparation');

    expect(navigate).toHaveBeenCalledOnceWith(['/'], { replaceUrl: true });
  });

  it('opens no second form and keeps the tab while a brew form is open', async () => {
    canOpenBrewForm = false;

    await service.open('Bean');

    expect(forms.addBean).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('knows the four kinds and no other', () => {
    expect(
      ['Brew', 'Bean', 'Preparation', 'Mill'].every(isQuickActionType),
    ).toBeTrue();
    expect(isQuickActionType('brew')).toBeFalse();
    expect(isQuickActionType('Water')).toBeFalse();
  });
});
