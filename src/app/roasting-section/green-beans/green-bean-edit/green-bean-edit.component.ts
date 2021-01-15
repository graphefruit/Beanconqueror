import {ChangeDetectorRef, Component, Input, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController, NavParams, Platform} from '@ionic/angular';
import {GreenBean} from '../../../../classes/green-bean/green-bean';
import {UIGreenBeanStorage} from '../../../../services/uiGreenBeanStorage';
import {UIImage} from '../../../../services/uiImage';
import {UIHelper} from '../../../../services/uiHelper';
import {UIAnalytics} from '../../../../services/uiAnalytics';
import {UIFileHelper} from '../../../../services/uiFileHelper';
import {UIToast} from '../../../../services/uiToast';
import {TranslateService} from '@ngx-translate/core';
import {IBeanInformation} from '../../../../interfaces/bean/iBeanInformation';
import moment from 'moment';
import {IGreenBean} from '../../../../interfaces/green-bean/iGreenBean';

declare var cordova;

@Component({
  selector: 'app-green-bean-edit',
  templateUrl: './green-bean-edit.component.html',
  styleUrls: ['./green-bean-edit.component.scss'],
})
export class GreenBeanEditComponent implements OnInit {

  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;

  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;
  public visibleIndex: any = {};
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiGreenBeanStorage: UIGreenBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiToast: UIToast,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly changeDetectorRef: ChangeDetectorRef) {

  }


  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('GREEN_BEAN', 'EDIT');
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);

  }

  public addImage(): void {
    this.uiImage.showOptionChooser()
      .then((_option) => {
        if (_option === 'CHOOSE') {
          // CHOSE
          this.uiImage.choosePhoto()
            .then((_path) => {
              this.data.attachments.push(_path.toString());
            });
        } else {
          // TAKE
          this.uiImage.takePhoto()
            .then((_path) => {
              this.data.attachments.push(_path.toString());
            });
        }
      });
  }

  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
  private __editBean(): void {
    this.uiGreenBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BEAN_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public async deleteImage(_index: number): Promise<any> {

    const splicedPaths: Array<string> = this.data.attachments.splice(_index, 1);
    for (const path of splicedPaths) {
      try {
        await this.uiFileHelper.deleteFile(path);
        this.uiToast.showInfoToast('IMAGE_DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('IMAGE_NOT_DELETED');
      }

    }
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'green-bean-edit');
  }


  public ngOnInit() {}
  public chooseDate(_event) {
    if (this.platform.is('cordova')) {
      _event.cancelBubble = true;
      _event.preventDefault();
      _event.stopImmediatePropagation();
      _event.stopPropagation();


      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        success: (newDate) => {
          this.data.date = moment(newDate).toISOString();
          this.changeDetectorRef.detectChanges();
        }, error: () => {

        }
      });

    }
  }

}
