import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { NgModel } from '@angular/forms';

import moment from 'moment';
import { IFlavor } from '../interfaces/flavor/iFlavor';
import { Brew } from '../classes/brew/brew';

@Directive({ selector: '[transform-date]' })
export class TransformDateDirective implements AfterViewInit {
  private oldModelValue: any = undefined;

  @Input('displayFormat') public displayFormat: string;
  @Input('transform-date') public transformDate: string;
  @Input('data') public data: string;
  @Output() public dataChange = new EventEmitter<any>();

  private viewInitIntv = undefined;

  constructor(private el: ElementRef) {}

  public ngAfterViewInit() {
    this.viewInitIntv = setInterval(() => {
      if (
        this.el &&
        this.el.nativeElement &&
        this.el.nativeElement.getElementsByTagName('input').length > 0
      ) {
        this.__generateOutputText(this.data);
        clearInterval(this.viewInitIntv);
        this.viewInitIntv = undefined;
      }
    }, 25);
  }

  public ngOnDestroy() {
    if (this.viewInitIntv !== undefined) {
      clearInterval(this.viewInitIntv);
      this.viewInitIntv = undefined;
    }
  }

  public ngDoCheck(): void {
    try {
      if (this.oldModelValue !== this.data) {
        this.oldModelValue = this.data;
        this.__generateOutputText(this.data);
      }
    } catch (ex) {}
  }

  private __generateOutputText(_val) {
    if (_val === undefined) {
      this.setText('');
      return;
    }
    const _date = moment(_val);

    if (_date.isValid()) {
      const _transformedDate = _date.format(this.displayFormat);
      // this.el.nativeElement.innerText =_transformedDate;
      this.setText(_transformedDate);
    } else {
      this.setText('');
      // this.el.nativeElement.getElementsByTagName('input')[0].value = '';
    }
  }
  private setText(_text: string) {
    if (this.transformDate !== undefined && this.transformDate === 'timer') {
      // this.el.nativeElement.innerText = _text;
      if (
        this.el &&
        this.el.nativeElement &&
        this.el.nativeElement.getElementsByTagName('input').length > 0
      ) {
        this.el.nativeElement.getElementsByTagName('input')[0].value = _text;
      }
    } else {
      if (
        this.el &&
        this.el.nativeElement &&
        this.el.nativeElement.getElementsByTagName('input').length > 0
      ) {
        this.el.nativeElement.getElementsByTagName('input')[0].value = _text;
      }
    }
  }
}
