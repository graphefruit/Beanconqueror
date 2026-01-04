import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BEAN_IMPORT_ACTION } from '../../../enums/beans/beanImportAction';

@Component({
  selector: 'app-bean-import-popover',
  templateUrl: './bean-import-popover.component.html',
  styleUrls: ['./bean-import-popover.component.scss'],
  standalone: false,
})
export class BeanImportPopoverComponent implements OnInit {
  public static COMPONENT_ID = 'bean-import-popover';

  constructor(private readonly modalController: ModalController) {}

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

  public getStaticActions(): any {
    return BEAN_IMPORT_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BeanImportPopoverComponent.COMPONENT_ID,
    );
  }

  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanImportPopoverComponent.COMPONENT_ID,
    );
  }
}
