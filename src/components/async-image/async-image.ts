import {Component, Input} from '@angular/core';
import {UIFileHelper} from '../../services/uiFileHelper';

@Component({
  selector: 'async-image',
  templateUrl: 'async-image.html'
})
export class AsyncImageComponent {

  @Input() public filePath: string;

  public img: string;

  constructor (
    public uiFileHelper: UIFileHelper
  ) {
  }

  public async ngOnInit (): Promise<void> {
    if (this.filePath === undefined || this.filePath === null || this.filePath === '') {
      this.img = '';
    } else {
      this.img = await this.uiFileHelper.getBase64File(this.filePath);
    }

  }

  public async ngOnChanges (): Promise<void> {

    if (this.filePath === undefined || this.filePath === null || this.filePath === '') {
      this.img = ''
    } else {
      this.img = await this.uiFileHelper.getBase64File(this.filePath);
    }

    // You can also use categoryId.previousValue and
    // categoryId.firstChange for comparing old and new values

  }

}
