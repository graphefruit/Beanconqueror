import {Directive, EventEmitter, HostListener, Output} from '@angular/core';
import {NgModel} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {Bean} from '../classes/bean/bean';

@Directive({
  selector: '[ngModel][bean-overlay]',
  providers: [NgModel],
})
export class BeanOverlayDirective {

  @Output() public ngModelChange: EventEmitter<any> = new EventEmitter();
  private changedTriggerd: boolean = false;

  constructor(private readonly model: NgModel,
              private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage) {

  }

  @HostListener('click', ['$event', '$event.target'])
  public async click(_event, _target) {

    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();
    //const modal = await this.modalController.create({component: MillAddComponent, cssClass: 'half-bottom-modal', showBackdrop: true});
    //await modal.present();
    //await modal.onWillDismiss();
    //_target.value ='4924b8f0-caa3-4b8c-8858-cce151'

    this.changedTriggerd = true;
    this.model.control.setValue('39c6c119-c493-4a6d-9723-553ef9e1785d');
    const selectedBean: Bean = this.uiBeanStorage.getByUUID('39c6c119-c493-4a6d-9723-553ef9e1785d');
    _event.target.selectedText = selectedBean.name;


  }

  @HostListener('ionChange', ['$event', '$event.target'])
  public async bla(_event, _target) {

    if (this.changedTriggerd) {


      /**   const selectedBean: Bean = this.uiBeanStorage.getByUUID('39c6c119-c493-4a6d-9723-553ef9e1785d');
       if (selectedBean !== undefined) {
          _event.target.selectedText = selectedBean.name;
          this.changedTriggerd = false;
        }**/
    }

  }
}
