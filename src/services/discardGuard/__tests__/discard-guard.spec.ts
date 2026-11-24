import { AlertController, Platform } from '@ionic/angular';

import { UIAlert } from '../../uiAlert';
import { DiscardGuard } from '../discard-guard';

describe('DiscardGuard', () => {
  let answer: (choice: 'YES' | 'NO') => void;
  let showConfirm: jasmine.Spy;
  let subscribeWithPriority: jasmine.Spy;
  let unsubscribe: jasmine.Spy;
  let dismissTop: jasmine.Spy;
  let close: jasmine.Spy;
  let changed: boolean;
  let modal: HTMLIonModalElement;
  let guard: DiscardGuard;

  beforeEach(() => {
    showConfirm = jasmine.createSpy('showConfirm').and.callFake(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    unsubscribe = jasmine.createSpy('unsubscribe');
    subscribeWithPriority = jasmine
      .createSpy('subscribeWithPriority')
      .and.returnValue({ unsubscribe });
    dismissTop = jasmine.createSpy('dismiss').and.resolveTo(true);
    close = jasmine.createSpy('close').and.resolveTo();
    changed = true;
    modal = document.createElement('div') as unknown as HTMLIonModalElement;
    guard = new DiscardGuard(
      { showConfirm } as unknown as UIAlert,
      { backButton: { subscribeWithPriority } } as unknown as Platform,
      {
        getTop: () => Promise.resolve({ dismiss: dismissTop }),
      } as unknown as AlertController,
      { question: 'QUESTION', changed: () => changed, close },
      modal,
    );
  });

  const canDismiss = (role?: string) =>
    (modal.canDismiss as (data: unknown, role?: string) => Promise<boolean>)(
      undefined,
      role,
    );

  it('closes a form without input without asking', async () => {
    changed = false;

    await guard.confirmDismiss();

    expect(showConfirm).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('asks before a form with input closes and closes on yes', async () => {
    const closing = guard.confirmDismiss();
    await Promise.resolve();

    expect(showConfirm).toHaveBeenCalledOnceWith(
      'QUESTION',
      'SURE_QUESTION',
      true,
    );
    expect(close).not.toHaveBeenCalled();
    answer('YES');
    await closing;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the form on no and asks again next time', async () => {
    const first = guard.confirmDismiss();
    await Promise.resolve();
    answer('NO');
    await first;
    expect(close).not.toHaveBeenCalled();

    const second = guard.confirmDismiss();
    await Promise.resolve();
    expect(showConfirm).toHaveBeenCalledTimes(2);
    answer('YES');
    await second;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('asks only once when back is pressed twice', async () => {
    const first = guard.confirmDismiss();
    await guard.confirmDismiss();
    await Promise.resolve();

    expect(showConfirm).toHaveBeenCalledTimes(1);
    answer('YES');
    await first;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes only once when an untouched form is left twice', async () => {
    changed = false;

    await Promise.all([guard.confirmDismiss(), guard.confirmDismiss()]);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('can be left again when closing failed', async () => {
    changed = false;
    close.and.rejectWith(new Error('closing failed'));

    await expectAsync(guard.confirmDismiss()).toBeRejected();
    close.and.resolveTo();
    await guard.confirmDismiss();

    expect(close).toHaveBeenCalledTimes(2);
  });

  it('answers the question with no on back and on Escape', async () => {
    const closing = guard.confirmDismiss();
    await Promise.resolve();

    const [priority, onBack] = subscribeWithPriority.calls.mostRecent().args;
    expect(priority).toBeGreaterThan(100);
    onBack();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await Promise.resolve();
    expect(dismissTop).toHaveBeenCalledTimes(2);
    expect(dismissTop).toHaveBeenCalledWith(undefined, 'cancel');

    answer('NO');
    await closing;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await Promise.resolve();
    expect(dismissTop).toHaveBeenCalledTimes(2);
  });

  it('turns back and Escape on the modal into the question', async () => {
    expect(await canDismiss('backdrop')).toBeFalse();
    await Promise.resolve();
    expect(showConfirm).toHaveBeenCalledTimes(1);
    expect(await canDismiss('gesture')).toBeFalse();
    await Promise.resolve();
    expect(showConfirm).toHaveBeenCalledTimes(1);
  });

  for (const role of [undefined, 'saved', 'parent-dismissed', 'cancel']) {
    it(`lets the modal close with the role ${role} without asking`, async () => {
      expect(await canDismiss(role)).toBeTrue();
      expect(showConfirm).not.toHaveBeenCalled();
    });
  }

  it('works without a modal', async () => {
    changed = false;
    const alone = new DiscardGuard(
      { showConfirm } as unknown as UIAlert,
      { backButton: { subscribeWithPriority } } as unknown as Platform,
      {} as AlertController,
      { question: 'QUESTION', changed: () => changed, close },
      null,
    );

    await alone.confirmDismiss();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
