import { EventEmitter, Directive, OnInit, Output, Input, ElementRef } from '@angular/core';
import { timer, Subscription } from 'rxjs';


@Directive({

  selector: '[long-press]'
})
export class LongPressDirective implements OnInit {

  private timerSub: Subscription;

  @Input('long-press-delay') public delay?: number = 500;
  @Output('long-press') public longPress: EventEmitter<any> = new EventEmitter();

  constructor(
    private elementRef: ElementRef<HTMLElement>
  ) { }

  public ngOnInit() {
    const isTouch = ('ontouchstart' in document.documentElement);
    const element = this.elementRef.nativeElement;
    if (element.onpointerdown) {
      element.onpointerdown = (ev) => {
        this.timerSub = timer(this.delay).subscribe(() => {
          this.longPress.emit(ev);
        });
      };

    } else {
      // Every device which does not support onpointerdown, we implement touchstart
      element.addEventListener('touchstart', (ev) => {
        this.timerSub = timer(this.delay).subscribe(() => {
          this.longPress.emit(ev);
        });
      },false);

      element.addEventListener('touchmove', (ev) => {
        this.unsub();
      },false);
      element.addEventListener('touchend', (ev) => {
        this.unsub();
      },false);
      element.addEventListener('touchcancel', (ev) => {
        this.unsub();
      },false);

    }

    element.onpointerup = () => { this.unsub(); };
    element.onpointercancel = () => { this.unsub(); };
    if (isTouch) {
      element.onpointerleave = () => { this.unsub(); };
    }
  }

  private unsub() {
    if (this.timerSub && !this.timerSub.closed) { this.timerSub.unsubscribe(); }
  }

}
