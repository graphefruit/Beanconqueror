import {Component, Input} from '@angular/core';
import {UIFileHelper} from '../../services/uiFileHelper';

@Component({
  selector: 'async-image',
  template: '<img [src]="img" />'
})
export class AsyncImageComponent {

  @Input() public filename: string;

  public img: any;

  constructor (
    public uiFileHelper: UIFileHelper
  ) {
  }

  public async ngOnInit (): Promise<void> {
    this.img = await this.uiFileHelper.getBase64File(this.filename);
  }
}
