import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { IGreenBean } from '../../interfaces/green-bean/iGreenBean';
import { Config } from '../objectConfig/objectConfig';

export class GreenBean implements IGreenBean {
  public name: string;
  public note: string;
  public date: string;
  public config: Config;
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

  constructor() {
    this.name = '';
    this.note = '';
    this.date = '';
    this.config = new Config();
    this.aromatics = '';
    this.weight = 0;
    this.finished = false;
    this.cost = 0;
    this.attachments = [];
    this.decaffeinated = false;
    this.cupping_points = '';

    this.bean_information = [];
    this.url = '';
    this.ean_article_number = '';
    this.rating = 0;
  }
  public initializeByObject(beanObj: IGreenBean): void {
    Object.assign(this, beanObj);
  }

  public beanAgeInDays(): number {
    const today = Date.now();
    let millisecondsSinceRoasting = today - Date.parse(this.date);
    if (isNaN(millisecondsSinceRoasting)) {
      millisecondsSinceRoasting = 0;
    }
    return Math.floor(millisecondsSinceRoasting / (1000 * 60 * 60 * 24));
  }
}
