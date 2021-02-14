import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {UIFileHelper} from '../../services/uiFileHelper';

@Component({
  selector: 'async-image',
  templateUrl: './async-image.component.html',
  styleUrls: ['./async-image.component.scss'],
})
export class AsyncImageComponent implements OnInit, OnChanges {
  @Input() public filePath: string;

  public img: string = '';
  public preloadImg: string = 'assets/img/loading.gif';
  constructor( private uiFileHelper: UIFileHelper) { }

  public async ngOnInit(): Promise<void> {
    await this.__checkImageChangs();
  }

  public async ngOnChanges(): Promise<void> {
    await this.__checkImageChangs();
  }

  public onError() {
    this.img = '';
  }

  private async __checkImageChangs(): Promise<void> {

    if (this.filePath === undefined || this.filePath === null || this.filePath === '') {
      this.img = '';
    } else {
      if (this.filePath.startsWith("http")) {
        this.img = this.filePath;
      } else {
        this.img = await this.uiFileHelper.getBase64File(this.filePath);
      }

    }
  }


}
