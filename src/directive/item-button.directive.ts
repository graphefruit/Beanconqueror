import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/**
 * Makes an ion-item that is a choice or a switch a button: it is reached
 * with Tab, runs its click with Enter or Space and tells its state, chosen
 * (`itemPressed`) or open (`itemExpanded`). Ionic's own `button` items do
 * not pass that state on to the button inside them.
 */
@Directive({
  selector: 'ion-item[itemButton]',
  host: {
    tabindex: '0',
    '[attr.aria-pressed]': 'pressed()',
    '[attr.aria-expanded]': 'expanded()',
    '(keydown.enter)': 'activate($event)',
    '(keydown.space)': 'activate($event)',
  },
})
export class ItemButtonDirective {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public readonly itemPressed = input<boolean | undefined>(undefined);
  public readonly itemExpanded = input<boolean | undefined>(undefined);

  protected readonly pressed = computed(() => state(this.itemPressed()));
  protected readonly expanded = computed(() => state(this.itemExpanded()));

  constructor() {
    // An item in a list sets role="listitem" whenever it renders.
    const keepRole = () => {
      if (this.host.getAttribute('role') !== 'button') {
        this.host.setAttribute('role', 'button');
      }
    };
    keepRole();
    const observer = new MutationObserver(keepRole);
    observer.observe(this.host, { attributeFilter: ['role'] });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected activate(event: Event): void {
    // Space would scroll the page; a key held down would repeat the action.
    event.preventDefault();
    if (!(event as KeyboardEvent).repeat) {
      this.host.click();
    }
  }
}

function state(value: boolean | undefined): string | null {
  return value === undefined ? null : String(value);
}
