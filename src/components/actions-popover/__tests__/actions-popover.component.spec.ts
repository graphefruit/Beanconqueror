import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';

import {
  ActionsPopoverComponent,
  popoverAction,
  popoverDivider,
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

  it('takes the name of the button that opened it', async () => {
    const create = jasmine.createSpy('create').and.resolveTo({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({ role: 'backdrop' }),
    });
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Options for Alpha Filter');
    let picked: Promise<string | undefined>;
    button.addEventListener('click', (event) => {
      picked = ActionsPopoverComponent.pick(
        { create } as unknown as ModalController,
        {
          id: 'menu',
          items,
          breakpoints: [0, 1],
          initialBreakpoint: 1,
          openedBy: event,
        },
      );
    });

    button.click();
    await picked;

    expect(create.calls.mostRecent().args[0].htmlAttributes).toEqual({
      'aria-label': 'Options for Alpha Filter',
    });
  });

  it('takes the name Ionic moved into the shadow root of ion-button', async () => {
    const create = jasmine.createSpy('create').and.resolveTo({
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve({ role: 'backdrop' }),
    });
    const host = document.createElement('div');
    const native = document.createElement('button');
    native.setAttribute('aria-label', 'Options for Alpha Filter');
    host.attachShadow({ mode: 'open' }).append(native);
    let picked: Promise<string | undefined>;
    host.addEventListener('click', (event) => {
      picked = ActionsPopoverComponent.pick(
        { create } as unknown as ModalController,
        {
          id: 'menu',
          items,
          breakpoints: [0, 1],
          initialBreakpoint: 1,
          openedBy: event,
        },
      );
    });

    host.click();
    await picked;

    expect(create.calls.mostRecent().args[0].htmlAttributes).toEqual({
      'aria-label': 'Options for Alpha Filter',
    });
  });

  describe('the menu', () => {
    const dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);

    function render() {
      TestBed.configureTestingModule({
        imports: [ActionsPopoverComponent, TranslateModule.forRoot()],
        providers: [{ provide: ModalController, useValue: { dismiss } }],
      });
      const fixture = TestBed.createComponent(ActionsPopoverComponent);
      fixture.componentRef.setInput('componentId', 'menu');
      fixture.componentRef.setInput('items', [
        ...items,
        popoverDivider(),
        popoverAction({
          role: 'HIDDEN',
          translationKey: 'HIDDEN',
          icon: 'edit',
          visible: false,
        }),
      ]);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('shows the visible items, its icons hidden from screen readers', () => {
      const menu = render();

      expect(menu.querySelectorAll('ion-item[button]').length).toBe(2);
      expect(menu.querySelectorAll('hr').length).toBe(1);
      for (const icon of menu.querySelectorAll('ion-icon')) {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      }
      expect(menu.querySelector('ion-header').getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('closes with the role of the chosen action', () => {
      const menu = render();

      menu.querySelectorAll<HTMLElement>('ion-item[button]')[1].click();

      expect(dismiss).toHaveBeenCalledWith(undefined, 'DELETE', 'menu');
    });
  });
});
