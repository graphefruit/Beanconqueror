import {EventEmitter, Directive, OnInit, Output, Input, ElementRef, HostListener} from '@angular/core';
import { timer, Subscription } from 'rxjs';

@Directive({

  selector: '[short-press]'
})
export class ShortPressDirective {


  @Input('short-press-delay') public delay?: number = 250;
  @Output('short-press') public shortPress: EventEmitter<any> = new EventEmitter();

  constructor(
  ) { }


  private _timeout: any = undefined;
  private _isShort: boolean;

  private canFireEmit: boolean=true;

  @HostListener('click',['$event'])
  @HostListener('ontouchstart',['$event'])
  @HostListener('touchstart',['$event'])
  @HostListener('mousedown',['$event'])
  public onMouseDown( e ) {
    if (this._timeout === undefined) {

      this.canFireEmit = true;
      this._isShort = true;
      this._timeout = setTimeout(() => {
        this._isShort = false;
      }, this.delay);
    }

  }


  @HostListener('touchend',['$event'])
  @HostListener('touchcancel',['$event'])
  @HostListener('mouseup',['$event'])
  public onMouseUp( e ) {
    if (this._isShort) {
      this.emitFunction(e);
    }
   this.clear();
  }

  @HostListener('mouseleave',['$event'])
  @HostListener('touchmove',['$event'])
  public clearTimeout() {
    this.clear();
  }

  private clear() {
    clearTimeout(this._timeout);
    this.canFireEmit = false;
    setTimeout(() => {
      // Give clear a short timeout, else onMouseDown will be triggerd again some times, and event would be triggered twice
      this._timeout = undefined;
    },250);

  }


  private emitFunction(e) {
    if (this.canFireEmit) {
      this.clear();
      this.shortPress.emit( e );
    }

  }


}
