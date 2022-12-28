import { IBeanVisualizer } from '../../interfaces/visualizer/iBeanVisualizer';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';

export class BeanVisualizer implements IBeanVisualizer {
  public name: string;
  public buyDate: string;
  public roastingDate: string;
  public note: string;

  public roaster: string;

  public roast: ROASTS_ENUM;
  public roast_range: number;
  public beanMix: BEAN_MIX_ENUM;

  // tslint:disable-next-line
  public roast_custom: string;
  public aromatics: string;
  public weight: number;
  public cost: number;
  public cupping_points: string;
  public decaffeinated: boolean;
  public url: string;
  public ean_article_number: string;

  public rating: number;

  public bean_information: Array<IBeanInformation>;

  public bean_roasting_type: BEAN_ROASTING_TYPE_ENUM;

  constructor() {
    this.name = '';
    this.buyDate = '';
    this.roastingDate = '';
    this.note = '';

    this.roaster = '';

    this.roast = 'UNKNOWN' as ROASTS_ENUM;
    this.roast_range = 0;
    this.roast_custom = '';
    this.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;

    this.aromatics = '';
    this.weight = 0;

    this.cost = 0;

    this.decaffeinated = false;
    this.cupping_points = '';
    this.bean_roasting_type = 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
    this.bean_information = [];
    this.url = '';
    this.ean_article_number = '';

    this.rating = 0;
  }
}
