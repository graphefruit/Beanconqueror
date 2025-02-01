/** Interfacdes */

import { IBeanParameter } from '../../interfaces/parameter/iBeanParameter';

export class BeanManageParameter implements IBeanParameter {
  public name: boolean;
  public buyDate: boolean;
  public roastingDate: boolean;
  public beanMix: boolean;
  public aromatics: boolean;
  public note: boolean;
  public roaster: boolean;
  public roast: boolean;
  public roast_range: boolean;
  public weight: boolean;
  public cost: boolean;
  public attachments: boolean;
  public url: boolean;
  public ean_article_number: boolean;
  public cupping_points: boolean;
  public decaffeinated: boolean;

  public bean_roasting_type: boolean;

  public bean_information: boolean;
  public country: boolean;
  public region: boolean;
  public farm: boolean;
  public farmer: boolean;
  public elevation: boolean;
  public harvest_time: boolean;
  public variety: boolean;
  public processing: boolean;
  public certification: boolean;
  public percentage: boolean;
  public purchasing_price: boolean;
  public fob_price: boolean;
  public rating: boolean;

  public bestDate: boolean;
  public openDate: boolean;
  public co2e_kg: boolean;

  constructor() {
    this.name = true;
    this.buyDate = false;
    this.roastingDate = true;
    this.beanMix = true;
    this.aromatics = true;
    this.note = true;
    this.roaster = true;
    this.roast = false;
    this.roast_range = false;
    this.weight = true;
    this.cost = true;
    this.attachments = true;
    this.url = true;
    this.ean_article_number = false;
    this.cupping_points = false;
    this.decaffeinated = true;
    this.bean_roasting_type = true;
    this.rating = true;

    this.bean_information = false;
    this.country = true;
    this.region = true;
    this.farm = true;
    this.farmer = true;
    this.elevation = true;
    this.harvest_time = true;
    this.variety = true;
    this.processing = true;
    this.certification = false;
    this.percentage = true;
    this.purchasing_price = false;
    this.fob_price = false;

    this.bestDate = false;
    this.openDate = false;
    this.co2e_kg = false;
  }

  public activateAll() {
    this.name = true;
    this.buyDate = true;
    this.roastingDate = true;
    this.beanMix = true;
    this.aromatics = true;
    this.note = true;
    this.roaster = true;
    this.roast = true;
    this.roast_range = true;
    this.weight = true;
    this.cost = true;
    this.attachments = true;
    this.url = true;
    this.ean_article_number = true;
    this.cupping_points = true;
    this.decaffeinated = true;
    this.bean_roasting_type = true;
    this.rating = true;

    this.bean_information = true;
    this.country = true;
    this.region = true;
    this.farm = true;
    this.farmer = true;
    this.elevation = true;
    this.harvest_time = true;
    this.variety = true;
    this.processing = true;
    this.certification = true;
    this.percentage = true;
    this.purchasing_price = true;
    this.fob_price = true;

    this.bestDate = true;
    this.openDate = true;
    this.co2e_kg = true;
  }
}
