import { Component, Input, OnChanges, inject } from '@angular/core';
import { UIFileHelper } from '../../services/uiFileHelper';
import { SafeResourceUrl } from '@angular/platform-browser';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'async-image',
  templateUrl: './async-image.component.html',
  styleUrls: ['./async-image.component.scss'],
  imports: [AsyncPipe],
})
export class AsyncImageComponent implements OnChanges {
  private uiFileHelper = inject(UIFileHelper);

  @Input() public filePath: string;

  public errorOccured = false;
  public isLoading = false;
  public img: Promise<SafeResourceUrl | undefined> = Promise.resolve(undefined);

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
