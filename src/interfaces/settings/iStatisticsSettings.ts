import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../enums/settings/statisticBeanDateField';

export interface IStatisticsSettings {
  /**
   * Which bean date the statistics page ranges beans on, because beans carry
   * several real-world dates and users track them differently.
   */
  bean_date_field: STATISTIC_BEAN_DATE_FIELD_ENUM;
}
