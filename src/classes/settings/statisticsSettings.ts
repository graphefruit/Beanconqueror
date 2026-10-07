import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../enums/settings/statisticBeanDateField';
import { IStatisticsSettings } from '../../interfaces/settings/iStatisticsSettings';

export class StatisticsSettings implements IStatisticsSettings {
  public bean_date_field: STATISTIC_BEAN_DATE_FIELD_ENUM;

  constructor() {
    this.bean_date_field = STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED;
  }
}
