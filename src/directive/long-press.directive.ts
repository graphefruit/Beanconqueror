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
    element.onpointerdown = (ev) => {
      this.timerSub = timer(this.delay).subscribe(() => {
        this.longPress.emit(ev);
      });
    };
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
