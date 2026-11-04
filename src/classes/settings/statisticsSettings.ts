import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../enums/settings/statisticBeanDateField';
import { IStatisticsSettings } from '../../interfaces/settings/iStatisticsSettings';

export class StatisticsSettings implements IStatisticsSettings {
  public bean_date_field: STATISTIC_BEAN_DATE_FIELD_ENUM;
  public show_archived_preparations: boolean;
  public show_archived_mills: boolean;

  constructor() {
    this.bean_date_field = STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED;
    this.show_archived_preparations = true;
    this.show_archived_mills = true;
  }
}
