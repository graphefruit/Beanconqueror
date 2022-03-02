import { Component, OnInit } from '@angular/core';

import {ModalController, NavParams} from '@ionic/angular';


import {BEAN_POPOVER_ADD_ACTION} from '../../../enums/beans/beanPopoverAddAction';

@Component({
  selector: 'app-bean-popover-add',
  templateUrl: './bean-popover-add.component.html',
  styleUrls: ['./bean-popover-add.component.scss'],
})
export class BeanPopoverAddComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-add';

  constructor(private readonly modalController: ModalController) {

  }

  public ionViewDidEnter(): void {
  }

  public ngOnInit() {

  }


  public getStaticActions(): any {
    return BEAN_POPOVER_ADD_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(undefined, _type, BeanPopoverAddComponent.COMPONENT_ID);
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,BeanPopoverAddComponent.COMPONENT_ID);
  }

}
