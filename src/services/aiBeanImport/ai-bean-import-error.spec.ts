import { AIImportStep, createAIBeanImportError } from './ai-bean-import-error';

describe('AI Bean Import Error', () => {
  describe('createAIBeanImportError', () => {
    it('should create an error with message, step, and Error inheritance', () => {
      // Arrange & Act
      const error = createAIBeanImportError('Test error', 'ocr');

      // Assert
      expect(error.message).toBe('Test error');
      expect(error.step).toBe('ocr');
      expect(error instanceof Error).toBeTrue();
    });

    it('should include the original error when provided', () => {
      // Arrange
      const originalError = new Error('Original error');

      // Act
      const error = createAIBeanImportError(
        'Wrapped error',
        'processing',
        originalError,
      );

      // Assert
      expect(error.originalError).toBe(originalError);
    });

    it('should not include originalError when not provided', () => {
      // Arrange & Act
      const error = createAIBeanImportError('Test error', 'init');

      // Assert
      expect(error.originalError).toBeUndefined();
    });

    it('should work with all defined step types', () => {
      // Arrange
      const steps: AIImportStep[] = [
        'init',
        'camera_permission',
        'take_photo',
        'ocr_setup',
        'ocr',
        'ocr_metadata',
        'language_detection',
        'multi_step_extraction',
        'processing',
      ];

      // Act & Assert
      steps.forEach((step) => {
        const error = createAIBeanImportError(`Error at ${step}`, step);
        expect(error.step).toBe(step);
      });
    });

    it('should handle non-Error original errors (string, object)', () => {
      // WHY: Catch blocks may receive non-Error values that we need to preserve

      // Arrange & Act
      const stringError = createAIBeanImportError(
        'Wrapped',
        'ocr',
        'string error',
      );
      const objectError = createAIBeanImportError('Wrapped', 'ocr', {
        code: 'ERR_001',
      });

      // Assert
      expect(stringError.originalError).toBe('string error');
      expect(objectError.originalError).toEqual({ code: 'ERR_001' });
    });
  });
});
