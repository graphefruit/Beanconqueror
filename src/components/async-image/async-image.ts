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

  public async ngOnChanges (): Promise<void> {

    this.img = await this.uiFileHelper.getBase64File(this.filename);
    // You can also use categoryId.previousValue and
    // categoryId.firstChange for comparing old and new values

  }

}
