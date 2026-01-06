import {
  EventEmitter,
  Directive,
  Output,
  Input,
  ElementRef,
} from '@angular/core';

@Directive({ selector: '[short-press]' })
export class ShortPressDirective {
  @Input('short-press-delay') public delay?: number = 250;
  @Output('short-press') public shortPress: EventEmitter<any> =
    new EventEmitter();

  constructor(private elRef: ElementRef) {
    this.bindFunctions();
  }

  private bindFunctions() {
    const element = this.elRef.nativeElement;
    element.addEventListener(
      'click',
      (ev) => {
        this.onMouseDown(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'ontouchstart',
      (ev) => {
        this.onMouseDown(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'touchstart',
      (ev) => {
        this.onMouseDown(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'mousedown',
      (ev) => {
        this.onMouseDown(ev);
      },
      { passive: true },
    );

    element.addEventListener(
      'touchend',
      (ev) => {
        this.onMouseUp(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'touchcancel',
      (ev) => {
        this.onMouseUp(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'mouseup',
      (ev) => {
        this.onMouseUp(ev);
      },
      { passive: true },
    );
    element.addEventListener(
      'mouseleave',
      (ev) => {
        this.clearTimeout();
      },
      { passive: true },
    );
    element.addEventListener(
      'touchmove',
      (ev) => {
        this.clearTimeout();
      },
      { passive: true },
    );
  }
  public ngOnDestroy() {}

  private _timeout: any = undefined;
  private _isShort: boolean;

  private canFireEmit: boolean = true;

  public onMouseDown(e) {
    if (this._timeout === undefined) {
      this.canFireEmit = true;
      this._isShort = true;
      this._timeout = setTimeout(() => {
        this._isShort = false;
      }, this.delay);
    }
  }

  public onMouseUp(e) {
    if (this._isShort) {
      this.emitFunction(e);
    }
    this.clear();
  }

  public clearTimeout() {
    this.clear();
  }

  private clear() {
    clearTimeout(this._timeout);
    this.canFireEmit = false;
    setTimeout(() => {
      // Give clear a short timeout, else onMouseDown will be triggerd again some times, and event would be triggered twice
      this._timeout = undefined;
    }, 250);
  }

  private emitFunction(e) {
    if (this.canFireEmit) {
      this.clear();
      this.shortPress.emit(e);
    }
  }
}
