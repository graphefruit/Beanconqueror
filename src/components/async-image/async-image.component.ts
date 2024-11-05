import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { UIFileHelper } from '../../services/uiFileHelper';

@Component({
  selector: 'async-image',
  templateUrl: './async-image.component.html',
  styleUrls: ['./async-image.component.scss'],
})
export class AsyncImageComponent implements OnInit, OnChanges {
  @Input() public filePath: string;

  public errorOccured = false;
  public img = '';
  public preloadImg = 'assets/img/loading.gif';
  constructor(private uiFileHelper: UIFileHelper) {}

  public ngOnInit(): void {
    // ngOnInit does not support Promise return types, can't await
    void this.__checkImageChanges();
  }

  public ngOnChanges(): void {
    // ngOnChanges does not support Promise return types, can't await
    void this.__checkImageChanges();
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
