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

  it('keeps share text selections and supplies defaults for older settings', () => {
    const saved = new Settings();
    saved.share_brew_text_fields.bean_country = false;
    const restored = new Settings();
    restored.initializeByObject(saved);
    expect(restored.share_brew_text_fields.bean_country).toBeFalse();

    Reflect.deleteProperty(saved.share_brew_text_fields, 'tds');
    Reflect.deleteProperty(saved.share_brew_text_fields, 'extraction_yield');
    restored.initializeByObject(saved);
    expect(restored.share_brew_text_fields.tds).toBeTrue();
    expect(restored.share_brew_text_fields.extraction_yield).toBeTrue();

    Reflect.deleteProperty(saved, 'share_brew_text_fields');
    restored.initializeByObject(saved);
    expect(restored.share_brew_text_fields.bean_country).toBeTrue();
  });
});
