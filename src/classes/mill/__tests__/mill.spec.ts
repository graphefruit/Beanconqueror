import { IMill } from '../../../interfaces/mill/iMill';
import { Mill } from '../mill';

describe('Mill', () => {
  it('should create with default values', () => {
    // Arrange & Act
    const mill = new Mill();

    // Assert
    expect(mill.has_adjustable_speed).toBe(true);
    expect(mill.has_timer).toBe(true);
  });

  it('should initialize from object with new properties', () => {
    // Arrange
    const mill = new Mill();

    // Act
    mill.initializeByObject({
      name: 'Test',
      note: '',
      finished: false,
      config: { uuid: '123', unix_timestamp: 0 },
      attachments: [],
      has_adjustable_speed: false,
      has_timer: false,
    } as IMill);

    // Assert
    expect(mill.has_adjustable_speed).toBe(false);
    expect(mill.has_timer).toBe(false);
  });

  it('should keep defaults when initialized from legacy object without new properties', () => {
    // Arrange
    const mill = new Mill();
    const legacyData = {
      name: 'Old Grinder',
      note: '',
      finished: false,
      config: { uuid: '456', unix_timestamp: 0 },
      attachments: [],
    };

    // Act
    mill.initializeByObject(legacyData as any);

    // Assert
    expect(mill.name).toBe('Old Grinder');
    expect(mill.has_adjustable_speed).toBe(true);
    expect(mill.has_timer).toBe(true);
  });
});
