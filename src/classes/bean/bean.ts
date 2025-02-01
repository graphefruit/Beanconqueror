/** Interfaces */
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
/** Enums */
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { IBean } from '../../interfaces/bean/iBean';
/** Classes */
import { Config } from '../objectConfig/objectConfig';
import moment from 'moment';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { BeanRoastInformation } from './beanRoastInformation';
import { RoastingMachine } from '../roasting-machine/roasting-machine';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { IRoastingMachine } from '../../interfaces/roasting-machine/iRoastingMachine';
import { BeanProto } from '../../generated/src/classes/bean/bean';
import { ICupping } from '../../interfaces/cupping/iCupping';
import { IFlavor } from '../../interfaces/flavor/iFlavor';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { Brew } from '../brew/brew';
import { UIBrewHelper } from '../../services/uiBrewHelper';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../enums/beans/beanFreezingStorage';

export class Bean implements IBean {
  public name: string;
  public buyDate: string;
  public roastingDate: string;
  public note: string;

  public roaster: string;
  public config: Config;
  public roast: ROASTS_ENUM;
  public roast_range: number;
  public beanMix: BEAN_MIX_ENUM;

  public roast_custom: string;
  public aromatics: string;
  public weight: number;
  public finished: boolean;
  public cost: number;
  public attachments: Array<string>;
  public cupping_points: string;
  public decaffeinated: boolean;
  public url: string;
  public ean_article_number: string;

  public rating: number;

  public bean_information: Array<IBeanInformation>;

  public bean_roasting_type: BEAN_ROASTING_TYPE_ENUM;

  /** Roast information are set from green beans **/
  public bean_roast_information: BeanRoastInformation;

  public qr_code: string;
  /**
   * This one is used for generating qr-codes / NFC tags to directly brew them or view them
   */
  public internal_share_code: string;

  public favourite: boolean;
  public shared: boolean;
  public cupping: ICupping;

  public cupped_flavor: IFlavor;

  public frozenDate: string;
  public unfrozenDate: string;
  public frozenId: string;
  public frozenGroupId: string;
  public frozenStorageType: BEAN_FREEZING_STORAGE_ENUM;
  public frozenNote: string;

  public bestDate: string;
  public openDate: string;

  public co2e_kg: number;

  constructor() {
    this.name = '';
    this.buyDate = '';
    this.roastingDate = '';
    this.note = '';

    this.roaster = '';
    this.config = new Config();
    this.roast = 'UNKNOWN' as ROASTS_ENUM;
    this.roast_range = 0;
    this.roast_custom = '';
    this.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;

    this.aromatics = '';
    this.weight = 0;
    this.finished = false;
    this.cost = 0;
    this.attachments = [];
    this.decaffeinated = false;
    this.cupping_points = '';
    this.bean_roasting_type = 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
    this.bean_information = [];
    this.url = '';
    this.ean_article_number = '';
    this.bean_roast_information = new BeanRoastInformation();
    this.rating = 0;
    this.qr_code = '';
    this.internal_share_code = '';
    this.favourite = false;
    this.shared = false;

    this.cupping = {
      body: 0,
      brightness: 0,
      clean_cup: 0,
      complexity: 0,
      cuppers_correction: 0,
      dry_fragrance: 0,
      finish: 0,
      flavor: 0,
      sweetness: 0,
      uniformity: 0,
      wet_aroma: 0,
      notes: '',
    };

    this.cupped_flavor = {
      predefined_flavors: {},
      custom_flavors: [],
    } as IFlavor;

    this.frozenDate = '';
    this.unfrozenDate = '';
    this.frozenId = '';
    this.frozenGroupId = '';
    this.frozenStorageType = 'UNKNOWN' as BEAN_FREEZING_STORAGE_ENUM;
    this.frozenNote = '';

    this.bestDate = '';
    this.openDate = '';

    this.co2e_kg = 0;
  }

  public getRoastName(): string {
    return ROASTS_ENUM[this.roast];
  }
  public getCustomRoastName(): string {
    if (this.roast === ROASTS_ENUM.CUSTOM_ROAST) {
      return this.roast_custom;
    }
    return '-';
  }

  public isFrozen() {
    if (this.frozenDate && !this.unfrozenDate) {
      return true;
    } else {
      return false;
    }
  }
  public hasFrozenInformation() {
    if (this.frozenDate || this.unfrozenDate) {
      return true;
    } else {
      return false;
    }
  }
  public isUnfrozen() {
    if (this.frozenDate && this.unfrozenDate) {
      return true;
    } else {
      return false;
    }
  }

  public initializeByObject(beanObj: IBean): void {
    Object.assign(this, beanObj);

    // Newer version, this information may not exist
    if (beanObj.bean_roast_information) {
      this.bean_roast_information = new BeanRoastInformation();
      Object.assign(
        this.bean_roast_information,
        beanObj.bean_roast_information,
      );
    }
  }
  public initializeBySharedProtoBean(beanObj: BeanProto): void {
    Object.assign(this, beanObj);

    // Newer version, this information may not exist
    if (beanObj.bean_roast_information) {
      this.bean_roast_information = new BeanRoastInformation();
      Object.assign(
        this.bean_roast_information,
        beanObj.bean_roast_information,
      );
    }

    //Older bean versions may not have this information when initialization
    if (this.cupping === undefined) {
      this.cupping = {
        body: 0,
        brightness: 0,
        clean_cup: 0,
        complexity: 0,
        cuppers_correction: 0,
        dry_fragrance: 0,
        finish: 0,
        flavor: 0,
        sweetness: 0,
        uniformity: 0,
        wet_aroma: 0,
        notes: '',
      };
    }
    if (this.cupped_flavor === undefined) {
      this.cupped_flavor = {
        predefined_flavors: {},
        custom_flavors: [],
      } as IFlavor;
    }
  }
  public hasCustomFlavors(): boolean {
    return this.cupped_flavor.custom_flavors.length > 0;
  }
  public hasPredefinedFlavors(): boolean {
    return Object.keys(this.cupped_flavor.predefined_flavors).length > 0;
  }
  public fixDataTypes(): boolean {
    let fixNeeded: boolean = false;

    if (Number(this.cost) !== this.cost) {
      this.cost = Number(this.cost);
      fixNeeded = true;
    }

    if (Number(this.weight) !== this.weight) {
      this.weight = Number(this.weight);
      fixNeeded = true;
    }

    return fixNeeded;
  }
  public beanAgeInDays(): number {
    if (
      this.roastingDate !== null &&
      this.roastingDate !== undefined &&
      this.roastingDate !== ''
    ) {
      let today = moment(Date.now()).startOf('day');
      if (this.finished) {
        /** If the bean is archived, we search for all brews, and take the latest one, and stop the counting of bean age then
         *
         */
        const beanHelper: UIBeanHelper = UIBeanHelper.getInstance();
        const allBrews = beanHelper.getAllBrewsForThisBean(this.config.uuid);
        if (allBrews.length > 0) {
          const sortedBrews: Array<Brew> = UIBrewHelper.sortBrews(allBrews);
          today = moment
            .unix(sortedBrews[0].config.unix_timestamp)
            .startOf('day');
        }
      }
      const roastingDate = moment(this.roastingDate).startOf('day');

      let hasFrozenDate: boolean = false;
      if (this.frozenDate) {
        hasFrozenDate = true;
      }
      let hasUnFrozenDate: boolean = false;
      if (this.unfrozenDate) {
        hasUnFrozenDate = true;
      }

      if (hasFrozenDate === false) {
        // Normal calculcation as always
        return today.diff(roastingDate, 'days');
      } else {
        // Something has been frozen, now its going down to the deep :)
        let normalDaysToAdd: number = 0;
        const frozenDate = moment(this.frozenDate).startOf('day');

        const frozenDateDiff: number = frozenDate.diff(roastingDate, 'days');
        // We add now the time between roasting and the first freezing.
        normalDaysToAdd = normalDaysToAdd + frozenDateDiff;

        if (hasUnFrozenDate) {
          /**
           * We did unfreeze the bean and maybe it was still there one day or more.
           * We calculate now the unfreeze - freeze date and take into account that 90 days of freezing is one real day time.
           */
          const unfrozenDate = moment(this.unfrozenDate).startOf('day');
          const freezingPeriodTime = unfrozenDate.diff(frozenDate, 'days');
          const priorToNormalDays = Math.floor(freezingPeriodTime / 90);
          normalDaysToAdd = normalDaysToAdd + priorToNormalDays;

          /**
           * After we've calculcated the time in between we check how much time has been gone after unfreezing
           */
          const diffOfBrewTime = today.diff(unfrozenDate, 'days');
          normalDaysToAdd = normalDaysToAdd + diffOfBrewTime;
        } else {
          /** We didn't unfreeze the bean, and the bean was directly used.
           * So the beans where actually taken directly in frozen state.
           */
          const diffOfBrewTime = today.diff(frozenDate, 'days');
          const priorToNormalDays = Math.floor(diffOfBrewTime / 90);
          normalDaysToAdd = normalDaysToAdd + priorToNormalDays;
        }
        return normalDaysToAdd;
      }
    }
    return 0;
  }

  /**
   * Get the calculated bean age for this brew
   */
  public getCalculatedBeanAge(): number {
    const roastingDate = moment(this.roastingDate);
    const brewTime = moment.unix(moment().unix());

    return brewTime.diff(roastingDate, 'days');
  }

  public isSelfRoasted(): boolean {
    if (this.bean_roast_information && this.bean_roast_information.bean_uuid) {
      return true;
    }
    return false;
  }
  public isScannedBean(): boolean {
    if (this.qr_code !== '') {
      return true;
    }
    return false;
  }

  private getRoastingMachineStorage(): UIRoastingMachineStorage {
    let uiRoastingMachineStorage: UIRoastingMachineStorage;
    uiRoastingMachineStorage = UIRoastingMachineStorage.getInstance();

    return uiRoastingMachineStorage;
  }

  public getRoastingMachine(): RoastingMachine {
    const iRoastingMachine: IRoastingMachine =
      this.getRoastingMachineStorage().getByUUID(
        this.bean_roast_information.roaster_machine,
      ) as IRoastingMachine;
    const roastingMachine: RoastingMachine = new RoastingMachine();
    roastingMachine.initializeByObject(iRoastingMachine);
    return roastingMachine;
  }

  public hasPhotos() {
    return this.attachments && this.attachments.length > 0;
  }
}
