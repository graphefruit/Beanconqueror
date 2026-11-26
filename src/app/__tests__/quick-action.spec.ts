import { QuickAction } from '../../native/quick-action-plugin';
import { AppComponent } from '../app.component';

function quickActionComponent(options: { canOpenBrewForm?: boolean } = {}) {
  let appReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    appReady = resolve;
  });
  const helpers = {
    addBrew: jasmine.createSpy('addBrew').and.resolveTo(true),
    addBean: jasmine.createSpy('addBean').and.resolveTo(),
    addPreparation: jasmine.createSpy('addPreparation').and.resolveTo(),
    addMill: jasmine.createSpy('addMill').and.resolveTo(),
  };
  const component = Object.assign(Object.create(AppComponent.prototype), {
    uiHelper: { isBeanconqurorAppReady: () => ready },
    uiAnalytics: { trackEvent: jasmine.createSpy('trackEvent') },
    uiLog: { log: jasmine.createSpy('log') },
    uiBrewHelper: {
      canBrew: () => true,
      addBrew: helpers.addBrew,
      canOpenBrewFormIfNotShowMessage: () => options.canOpenBrewForm ?? true,
    },
    uiBeanHelper: { addBean: helpers.addBean },
    uiPreparationHelper: { addPreparation: helpers.addPreparation },
    uiMillHelper: { addMill: helpers.addMill },
    router: { navigate: jasmine.createSpy('navigate') },
  }) as { handleQuickAction: (type: string) => Promise<void> };
  return { component, appReady, helpers };
}

describe('AppComponent quick actions', () => {
  it('opens the form of a cold-start quick action once the app is ready', async () => {
    const { component, appReady, helpers } = quickActionComponent();

    const handled = component.handleQuickAction('Bean');
    await Promise.resolve();
    expect(helpers.addBean).not.toHaveBeenCalled();

    appReady();
    await handled;
    expect(helpers.addBean).toHaveBeenCalledTimes(1);
  });

  const forms: [
    string,
    keyof ReturnType<typeof quickActionComponent>['helpers'],
  ][] = [
    ['Brew', 'addBrew'],
    ['Bean', 'addBean'],
    ['Preparation', 'addPreparation'],
    ['Mill', 'addMill'],
  ];
  for (const [type, form] of forms) {
    it(`opens the ${form} form for the ${type} quick action`, async () => {
      const { component, appReady, helpers } = quickActionComponent();
      appReady();

      await component.handleQuickAction(type);

      for (const [, other] of forms) {
        expect(helpers[other].calls.count()).toBe(other === form ? 1 : 0);
      }
    });
  }

  it('opens no second form while a brew form is open', async () => {
    const { component, appReady, helpers } = quickActionComponent({
      canOpenBrewForm: false,
    });
    appReady();

    await component.handleQuickAction('Mill');

    expect(helpers.addMill).not.toHaveBeenCalled();
  });

  it('lets the web build listen without the native plugin', async () => {
    const listener = await QuickAction.addListener(
      'quickAction',
      () => undefined,
    );
    await listener.remove();
  });
});
