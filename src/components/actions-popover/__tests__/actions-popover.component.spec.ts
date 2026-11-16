import { ModalController } from '@ionic/angular';

import {
  ActionsPopoverComponent,
  popoverAction,
  popoverHeader,
} from '../actions-popover.component';

describe('ActionsPopoverComponent', () => {
  const items = [
    popoverHeader({ translationKey: 'HEADER' }),
    popoverAction({ role: 'EDIT', translationKey: 'EDIT', icon: 'edit' }),
    popoverAction({ role: 'DELETE', translationKey: 'DELETE', icon: 'delete' }),
  ];

  /** Shows the menu, which is then closed with this role. */
  async function closedWith(role: string | undefined) {
    const present = jasmine.createSpy('present').and.resolveTo();
    const create = jasmine.createSpy('create').and.resolveTo({
      present,
      onWillDismiss: () => Promise.resolve({ role }),
    });

    const picked = await ActionsPopoverComponent.pick(
      { create } as unknown as ModalController,
      { id: 'menu', items, breakpoints: [0, 1], initialBreakpoint: 1 },
    );

    expect(present).toHaveBeenCalledTimes(1);
    return picked;
  }

  it('resolves the action chosen in the menu', async () => {
    expect(await closedWith('DELETE')).toBe('DELETE');
  });

  // Ionic closes with 'backdrop' on a tap beside the menu, on Escape and on
  // the back button, and with 'gesture' when the menu is pulled down.
  for (const role of ['backdrop', 'gesture', 'HEADER', undefined]) {
    it(`resolves no action for a menu closed with ${role}`, async () => {
      expect(await closedWith(role)).toBeUndefined();
    });
  }
});
