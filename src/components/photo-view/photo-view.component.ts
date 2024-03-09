import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { Bean } from '../../classes/bean/bean';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';

@Component({
  selector: 'photo-view',
  templateUrl: './photo-view.component.html',
  styleUrls: ['./photo-view.component.scss'],
})
export class PhotoViewComponent implements OnInit {
  @Input() public data: Brew | Bean | GreenBean | Mill | Preparation;
  @Output() public dataChange = new EventEmitter<
    Brew | Bean | GreenBean | Mill | Preparation
  >();
  @ViewChild('photoSlides', { static: false }) public photoSlides:
    | ElementRef
    | undefined;

  constructor() {}

  public ngOnInit() {
    setTimeout(() => {
      // iOS Issue, update slider component
      this.updateSlider();
    }, 250);
  }

  private async updateSlider() {
    if (this.photoSlides) {
      setTimeout(() => {
        this.photoSlides.nativeElement.swiper.update();
      }, 250);
    }
  }
}
