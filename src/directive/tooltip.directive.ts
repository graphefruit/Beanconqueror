import {
  Directive,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../services/uiAlert';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Turns an info icon into a button that shows `tooltip` in a dialog. The
 * icon is reached with Tab and activated with Enter or Space, and its name
 * says what the information is about (`tooltipTopic`).
 */
@Directive({ selector: '[tooltip]' })
export class TooltipDirective {
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);
  private readonly host =
    inject<ElementRef<StencilElement>>(ElementRef).nativeElement;

  public readonly tooltip = input.required<string>();
  /** What the information is about, e.g. the label of the setting. */
  public readonly tooltipTopic = input<string>();

  private readonly rendered = signal(false);
  private readonly language = toSignal(this.translate.onLangChange);

  constructor() {
    // ion-icon sets role="img" when it renders; the role is set after that.
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => this.rendered.set(true));

    effect(() => {
      const topic = this.tooltipTopic();
      this.language();
      if (!this.rendered()) {
        return;
      }
      this.host.setAttribute('role', 'button');
      this.host.tabIndex = 0;
      this.host.setAttribute(
        'aria-label',
        topic
          ? this.translate.instant('A11Y.MORE_INFORMATION_ABOUT', { topic })
          : this.translate.instant('MORE_INFORMATION'),
      );
    });
  }

  @HostListener('click')
  public onClick(): void {
    void this.uiAlert.showMessage(this.tooltip());
  }

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  public onKey(event: Event): void {
    // Space would scroll the page.
    event.preventDefault();
    this.onClick();
  }
}
