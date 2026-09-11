import { Settings } from '../settings';

describe('Settings', () => {
  it('defaults the cloud AI prompt appendix to an empty string', () => {
    // Arrange

    // Act
    const settings = new Settings();

    // Assert
    expect(settings.cloud_ai_prompt_appendix).toBe('');
  });

  it('defaults the cloud AI prompt appendix when hydrating legacy settings', () => {
    // Arrange
    const legacySettings = new Settings();
    Reflect.deleteProperty(legacySettings, 'cloud_ai_prompt_appendix');
    const hydratedSettings = new Settings();
    hydratedSettings.cloud_ai_prompt_appendix = 'stale appendix';

    // Act
    hydratedSettings.initializeByObject(legacySettings);

    // Assert
    expect(hydratedSettings.cloud_ai_prompt_appendix).toBe('');
  });
});
