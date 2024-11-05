import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { UIFileHelper } from '../../services/uiFileHelper';

@Component({
  selector: 'async-image',
  templateUrl: './async-image.component.html',
  styleUrls: ['./async-image.component.scss'],
})
export class AsyncImageComponent implements OnInit, OnChanges {
  @Input() public filePath: string;

  public errorOccured: boolean = false;
  public img: string = '';
  public preloadImg: string = 'assets/img/loading.gif';
  constructor(private uiFileHelper: UIFileHelper) {}

  public async ngOnInit(): Promise<void> {
    await this.__checkImageChanges();
  }

  public async ngOnChanges(): Promise<void> {
    await this.__checkImageChanges();
  }

  public onError() {
    this.img = '';
  }

  private async __checkImageChanges(): Promise<void> {
    if (
      this.filePath === undefined ||
      this.filePath === null ||
      this.filePath === ''
    ) {
      this.img = '';
    } else {
      if (this.filePath.startsWith('http')) {
        this.img = this.filePath;
      } else {
        this.img = await this.uiFileHelper.getInternalFileSrc(
          this.filePath,
          true
        );
      }
    }
    if (this.img === '') {
      this.errorOccured = true;
    } else {
      this.errorOccured = false;
    }
  }
}
