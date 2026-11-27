import { UIHelper } from '../uiHelper';

/**
 * Links out of the app, like the community links, open in the browser: the
 * app launcher's web build opens a new window, the native one the browser.
 */
describe('UIHelper.openExternalWebpage', () => {
  let open: jasmine.Spy;
  let helper: UIHelper;

  beforeEach(() => {
    open = spyOn(window, 'open').and.returnValue(null);
    // Opening a link uses none of the helper's services.
    helper = Object.create(UIHelper.prototype) as UIHelper;
  });

  /** The app launcher loads its web build on first use. */
  async function opened(): Promise<readonly unknown[][]> {
    for (let wait = 0; wait < 200 && open.calls.count() === 0; wait++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return open.calls.allArgs();
  }

  it('opens the address with the app launcher', async () => {
    helper.openExternalWebpage('https://discord.gg/vDzA5dZjG8');

    expect(await opened()).toEqual([
      ['https://discord.gg/vDzA5dZjG8', '_blank'],
    ]);
  });

  it('adds http to an address without a scheme', async () => {
    helper.openExternalWebpage('beanconqueror.com');

    expect(await opened()).toEqual([['http://beanconqueror.com', '_blank']]);
  });
});
