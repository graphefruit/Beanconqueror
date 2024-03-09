import {
  EventEmitter,
  Directive,
  OnInit,
  Output,
  Input,
  ElementRef,
} from '@angular/core';
import { timer, Subscription } from 'rxjs';

declare var window;
@Directive({
  selector: '[long-press]',
})
export class LongPressDirective implements OnInit {
  private timerSub: Subscription;

  @Input('long-press-delay') public delay?: number = 500;
  @Output('long-press') public longPress: EventEmitter<any> =
    new EventEmitter();

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  public ngOnInit() {
    const isTouch = 'ontouchstart' in document.documentElement;
    const element = this.elementRef.nativeElement;
    if (element.onpointerdown) {
      element.onpointerdown = (ev) => {
        this.timerSub = timer(this.delay).subscribe(() => {
          this.longPress.emit(ev);
          /* Best hack in my entire life. Thanks android
           * Prevent the ghostclick in the next page when the long-press is fired
           * */
          const bodyEl = window.document.querySelector('body');
          bodyEl.classList.add('disablePointerEvents');
          setTimeout(() => {
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
      };
    } else {
      // Every device which does not support onpointerdown, we implement touchstart
      element.addEventListener(
        'touchstart',
        (ev) => {
          this.timerSub = timer(this.delay).subscribe(() => {
            this.longPress.emit(ev);
            /* Best hack in my entire life. Thanks android
             * Prevent the ghostclick in the next page when the long-press is fired
             * */
            const bodyEl = window.document.querySelector('body');
            bodyEl.classList.add('disablePointerEvents');
            setTimeout(() => {
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
        { passive: true }
      );

      element.addEventListener(
        'touchmove',
        (ev) => {
          this.unsub();
        },
        { passive: true }
      );
      element.addEventListener(
        'touchend',
        (ev) => {
          this.unsub();
        },
        { passive: true }
      );
      element.addEventListener(
        'touchcancel',
        (ev) => {
          this.unsub();
        },
        { passive: true }
      );
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

  private unsub() {
    if (this.timerSub && !this.timerSub.closed) {
      this.timerSub.unsubscribe();
    }
  }
}
