import { QuickAction } from '../../native/quick-action-plugin';
import { AppComponent } from '../app.component';

function quickActionComponent() {
  let appReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    appReady = resolve;
  });
  const open = jasmine.createSpy('open').and.resolveTo();
  const component = Object.assign(Object.create(AppComponent.prototype), {
    uiHelper: { isBeanconqurorAppReady: () => ready },
    uiAnalytics: { trackEvent: jasmine.createSpy('trackEvent') },
    uiLog: { log: jasmine.createSpy('log') },
    quickActions: { open },
  }) as { handleQuickAction: (type: string) => Promise<void> };
  return { component, appReady, open };
}

describe('AppComponent quick actions', () => {
  it('opens the form of a cold-start quick action once the app is ready', async () => {
    const { component, appReady, open } = quickActionComponent();

    const handled = component.handleQuickAction('Bean');
    await Promise.resolve();
    expect(open).not.toHaveBeenCalled();

    appReady();
    await handled;
    expect(open).toHaveBeenCalledOnceWith('Bean');
  });

  it('ignores a quick action of another kind', async () => {
    const { component, appReady, open } = quickActionComponent();
    appReady();

    await component.handleQuickAction('Water');

    expect(open).not.toHaveBeenCalled();
  });

  it('lets the web build listen without the native plugin', async () => {
    const listener = await QuickAction.addListener(
      'quickAction',
      () => undefined,
    );
    await listener.remove();
  });
});
