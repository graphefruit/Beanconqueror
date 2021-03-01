import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController} from '@ionic/angular';
import {Mill} from '../../classes/mill/mill';
import {MILL_ACTION} from '../../enums/mills/millActions';
import {MillPopoverActionsComponent} from '../../app/mill/mill-popover-actions/mill-popover-actions.component';
import {Brew} from '../../classes/brew/brew';
import {UIMillHelper} from '../../services/uiMillHelper';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {MillEditComponent} from '../../app/mill/mill-edit/mill-edit.component';
import {MillDetailComponent} from '../../app/mill/mill-detail/mill-detail.component';
import {UIToast} from '../../services/uiToast';
import {UIAlert} from '../../services/uiAlert';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIAnalytics} from '../../services/uiAnalytics';

@Component({
  selector: 'mill-information-card',
  templateUrl: './mill-information-card.component.html',
  styleUrls: ['./mill-information-card.component.scss'],
})
export class MillInformationCardComponent implements OnInit {

  @Input() public mill: Mill;


  @Output() public millAction: EventEmitter<any> = new EventEmitter();

  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly modalController: ModalController,
              private readonly uiMillHelper: UIMillHelper,
              private readonly uiToast: UIToast,
              private readonly uiAlert: UIAlert,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiAnalytics: UIAnalytics) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ngOnInit() {


  }

  public getBrewsCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    return relatedBrews.length;
  }

  public getWeightCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    let grindWeight: number = 0;
    for (const brew of relatedBrews) {
      grindWeight += brew.grind_weight;
    }
    return grindWeight;
  }

  public getBeansCount(): number {

    const relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    const distinctBeans = relatedBrews.filter((bean, i, arr) => {
      return arr.indexOf(arr.find((t) => t.bean === bean.bean)) === i;
    });

    return distinctBeans.length;

  }
  public lastUsed(): number {

    let relatedBrews: Array<Brew> = this.uiMillHelper.getAllBrewsForThisMill(this.mill.config.uuid);
    if (relatedBrews.length > 0) {
      relatedBrews = UIBrewHelper.sortBrews(relatedBrews);
      return relatedBrews[0].config.unix_timestamp;
    }
    return -1;



  }

  public async show() {
    await this.detail();
  }


  public async internalMillAction(action: MILL_ACTION): Promise<void> {
    switch (action) {
      case MILL_ACTION.EDIT:
        await this.edit();
        break;
      case MILL_ACTION.DELETE:
        try {
          await this.delete();
        } catch (ex) {

        }

        break;
      case MILL_ACTION.ARCHIVE:
        await this.archive();
        break;
      case MILL_ACTION.DETAIL:
        await this.detail();
        break;
      default:
        break;
    }
  }

  private resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    this.uiSettingsStorage.saveSettings(settings);
  }
  public async edit() {

    const editModal = await this.modalController.create({
      component: MillEditComponent,
      componentProps: {mill : this.mill},
      id:'mill-edit',
    });
    await editModal.present();
    await editModal.onWillDismiss();
  }

  public async detail() {
    const modal = await this.modalController.create({component: MillDetailComponent, id:'mill-detail', componentProps: {mill: this.mill}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public delete(): void {
    this.uiAlert.showConfirm('DELETE_MILL_QUESTION', 'SURE_QUESTION', true).then(() => {
        // Yes
        this.uiAnalytics.trackEvent('MILL', 'DELETE');
        this.__deleteMill();
        this.uiToast.showInfoToast('TOAST_MILL_DELETED_SUCCESSFULLY');
        this.resetSettings();
      },
      () => {
        // No
      });

  }
  private __deleteMill(): void {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();
    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].mill === this.mill.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    this.uiMillStorage.removeByObject(this.mill);
  }


  public archive() {
    this.mill.finished = true;
    this.uiMillStorage.update(this.mill);
    this.uiToast.showInfoToast('TOAST_MILL_ARCHIVED_SUCCESSFULLY');
    this.resetSettings();
  }

  public async showMillActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const popover = await this.modalController.create({
      component: MillPopoverActionsComponent,
      componentProps: {mill: this.mill},
      id:'mill-popover-actions',
      cssClass: 'popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalMillAction(data.role as MILL_ACTION);
      this.millAction.emit([data.role as MILL_ACTION, this.mill]);
    }
  }
}
