import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';

import { Subscription, timer } from 'rxjs';

declare var window;
@Directive({ selector: '[long-press]' })
export class LongPressDirective implements OnInit {
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private timerSub: Subscription;

  @Input('long-press-delay') public delay?: number = 500;
  @Output('long-press') public longPress: EventEmitter<any> =
    new EventEmitter();

  /**
   * The press that ended a long press may still end in a click on the host.
   * Its click handler (the short tap action) must not run as well. Keyboard
   * and screen reader activation is a click only and always gets through.
   */
  private clickEndsLongPress = false;

  constructor() {
    // Capture: before the click handlers of the host.
    this.elementRef.nativeElement.addEventListener(
      'click',
      (ev) => {
        if (this.clickEndsLongPress) {
          this.clickEndsLongPress = false;
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      },
      true,
    );
  }

  public ngOnInit() {
    const isTouch = 'ontouchstart' in document.documentElement;
    const element = this.elementRef.nativeElement;
    element.addEventListener(
      'touchstart',
      (ev) => {
        this.timerSub = timer(this.delay).subscribe(() => {
          this.emitLongPress(ev);
          /* Best hack in my entire life. Thanks android
           * Prevent the ghostclick in the next page when the long-press is fired
           * */
          const bodyEl = window.document.querySelector('body');
          bodyEl.classList.add('disablePointerEvents');
          setTimeout(() => {
            this.clickEndsLongPress = false;
            bodyEl.classList.remove('disablePointerEvents');
            setTimeout(() => {
              // you can use scale(1) or translate(0, 0), etc
              bodyEl.style.setProperty('transform', 'translateZ(0)');
              // this will remove the property 1 frame later
              requestAnimationFrame(() => {
                bodyEl.style.removeProperty('transform');
              });
            }, 25);
          }, 750);
        });
      },
      { passive: true },
    );

    for (const type of ['touchmove', 'touchend', 'touchcancel']) {
      element.addEventListener(type, () => this.unsub(), { passive: true });
    }

    element.onpointerup = () => {
      this.unsub();
    };
    element.onpointercancel = () => {
      this.unsub();
    };
    if (isTouch) {
      element.onpointerleave = () => {
        this.unsub();
      };
    }
  }

  private emitLongPress(ev: Event) {
    this.clickEndsLongPress = true;
    this.longPress.emit(ev);
  }

  private unsub() {
    if (this.timerSub && !this.timerSub.closed) {
      this.timerSub.unsubscribe();
    }
  }
}
