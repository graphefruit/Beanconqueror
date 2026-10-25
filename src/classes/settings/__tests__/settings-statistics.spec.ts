import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../../enums/settings/statisticBeanDateField';
import { ISettings } from '../../../interfaces/settings/iSettings';
import { Settings } from '../settings';
import { StatisticsSettings } from '../statisticsSettings';

describe('Settings - statistics', () => {
  it('should create with default statistics values', () => {
    // Arrange & Act
    const settings = new Settings();

    // Assert
    expect(settings.statistics.bean_date_field).toBe(
      STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED,
    );
    expect(settings.statistics.show_archived_preparations).toBe(true);
    expect(settings.statistics.show_archived_mills).toBe(true);
  });

  it('should initialize statistics from stored object', () => {
    // Arrange
    const settings = new Settings();

    // Act
    settings.initializeByObject({
      statistics: {
        bean_date_field: STATISTIC_BEAN_DATE_FIELD_ENUM.ROAST,
        show_archived_preparations: false,
        show_archived_mills: false,
      },
    } as ISettings);

    // Assert
    expect(settings.statistics.bean_date_field).toBe(
      STATISTIC_BEAN_DATE_FIELD_ENUM.ROAST,
    );
    expect(settings.statistics.show_archived_preparations).toBe(false);
    expect(settings.statistics.show_archived_mills).toBe(false);
  });

  it('should keep statistics defaults when stored settings have no statistics object', () => {
    // Arrange
    const settings = new Settings();

    // Act
    settings.initializeByObject({ date_format: 'DD.MM.YYYY' } as ISettings);

    // Assert
    expect(settings.statistics.bean_date_field).toBe(
      STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED,
    );
    expect(settings.statistics.show_archived_preparations).toBe(true);
    expect(settings.statistics.show_archived_mills).toBe(true);
  });

  it('should keep statistics defaults for sub-fields missing from stored settings', () => {
    // Arrange
    const settings = new Settings();

    // Act
    settings.initializeByObject({ statistics: {} } as ISettings);

    // Assert
    expect(settings.statistics.bean_date_field).toBe(
      STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED,
    );
    expect(settings.statistics.show_archived_preparations).toBe(true);
    expect(settings.statistics.show_archived_mills).toBe(true);
  });

  it('should restore the statistics class instance and not a plain object', () => {
    // Arrange
    const settings = new Settings();

    // Act
    settings.initializeByObject({
      statistics: { bean_date_field: STATISTIC_BEAN_DATE_FIELD_ENUM.BUY },
    } as ISettings);

    // Assert
    expect(settings.statistics instanceof StatisticsSettings).toBe(true);
  });
});
