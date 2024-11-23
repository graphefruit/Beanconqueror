import { Component, Input, OnChanges } from '@angular/core';
import { UIFileHelper } from '../../services/uiFileHelper';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'async-image',
    templateUrl: './async-image.component.html',
    styleUrls: ['./async-image.component.scss'],
    standalone: false
})
export class AsyncImageComponent implements OnChanges {
  @Input() public filePath: string;
  @Input() public showLoadingImage = false;

  public errorOccured = false;
  public isLoading = false;
  public img: Promise<SafeResourceUrl | undefined> = Promise.resolve(undefined);
  public preloadImg = 'assets/img/loading.gif';
  constructor(private uiFileHelper: UIFileHelper) {}

  public ngOnChanges(): void {
    this.img = this.getImageSrc();
  }

  private async getImageSrc(): Promise<SafeResourceUrl | undefined> {
    if (
      this.filePath === undefined ||
      this.filePath === null ||
      this.filePath === ''
    ) {
      return undefined;
    }

    if (this.filePath.startsWith('http')) {
      return this.filePath;
    }

    try {
      this.isLoading = true;
      const src = await this.uiFileHelper.getInternalFileSrc(this.filePath);
      this.errorOccured = false;
      return src;
    } catch (error) {
      this.errorOccured = true;
    } finally {
      this.isLoading = false;
    }
  }
}
