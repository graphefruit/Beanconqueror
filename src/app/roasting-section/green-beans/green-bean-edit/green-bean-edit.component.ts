import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonLabel,
  IonRow,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { StorageClass } from '../../../../classes/storageClass';
import { storedOrReported } from '../../../../classes/storedOrReported';
import { BeanSortInformationComponent } from '../../../../components/beans/bean-sort-information/bean-sort-information.component';
import { GreenBeanGeneralInformationComponent } from '../../../../components/beans/green-bean-general-information/green-bean-general-information.component';
import { HeaderDismissButtonComponent } from '../../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../../components/header/header.component';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { DisableDoubleClickDirective } from '../../../../directive/disable-double-click.directive';
import { TabPanelDirective } from '../../../../directive/tab-panel.directive';
import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import { RequiredFields } from '../../../../services/a11y/required-fields.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIImage } from '../../../../services/uiImage';
import { UIToast } from '../../../../services/uiToast';

@Component({
  selector: 'green-bean-edit',
  templateUrl: './green-bean-edit.component.html',
  styleUrls: ['./green-bean-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TabPanelDirective,
    FormsModule,
    GreenBeanGeneralInformationComponent,
    BeanSortInformationComponent,
    DisableDoubleClickDirective,
    TranslatePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonHeader,
    IonButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class GreenBeanEditComponent implements OnInit {
  private readonly requiredFields = inject(RequiredFields);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly modalController = inject(ModalController);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiImage = inject(UIImage);
  uiHelper = inject(UIHelper);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiAnalytics = inject(UIAnalytics);

  public static COMPONENT_ID: string = 'green-bean-edit';

  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;

  public bean_segment = 'general';

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT,
    );
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
    // The form edits the sorts in place; the stored green bean keeps its own until saved.
    this.data.bean_information = StorageClass.cloneData(
      this.data.bean_information,
    );
  }

  public async editBean() {
    if (this.__formValid()) {
      await this.__editBean();
    } else {
      await this.requiredFields.report(
        this.host,
        () => (this.bean_segment = 'general'),
      );
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
  private async __editBean() {
    if (
      !(await storedOrReported(this.uiAlert, () =>
        this.uiGreenBeanStorage.update(this.data),
      ))
    ) {
      return;
    }
    await this.uiImage.deleteRemovedPhotos(this.data);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT_FINISH,
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanEditComponent.COMPONENT_ID,
    );
  }

  public ngOnInit() {}
}
