import {
  AIImportStep,
  AIBeanImportError,
  createAIBeanImportError,
} from './ai-bean-import-error';

describe('AI Bean Import Error', () => {
  describe('createAIBeanImportError', () => {
    it('should create an error with the correct message', () => {
      const error = createAIBeanImportError('Test error', 'init');
      expect(error.message).toBe('Test error');
    });

    it('should create an error with the correct step', () => {
      const error = createAIBeanImportError('Test error', 'ocr');
      expect(error.step).toBe('ocr');
    });

    it('should include the original error when provided', () => {
      const originalError = new Error('Original error');
      const error = createAIBeanImportError(
        'Wrapped error',
        'processing',
        originalError,
      );
      expect(error.originalError).toBe(originalError);
    });

    it('should not include originalError when not provided', () => {
      const error = createAIBeanImportError('Test error', 'init');
      expect(error.originalError).toBeUndefined();
    });

    it('should be an instance of Error', () => {
      const error = createAIBeanImportError('Test error', 'init');
      expect(error instanceof Error).toBeTrue();
    });

    it('should have proper stack trace', () => {
      const error = createAIBeanImportError('Test error', 'init');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });

    it('should work with all defined step types', () => {
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

      steps.forEach((step) => {
        const error = createAIBeanImportError(`Error at ${step}`, step);
        expect(error.step).toBe(step);
      });
    });

    it('should handle non-Error original errors', () => {
      const originalError = 'string error';
      const error = createAIBeanImportError(
        'Wrapped error',
        'ocr',
        originalError,
      );
      expect(error.originalError).toBe('string error');
    });

    it('should handle object original errors', () => {
      const originalError = { code: 'ERR_001', details: 'Something failed' };
      const error = createAIBeanImportError(
        'Wrapped error',
        'ocr',
        originalError,
      );
      expect(error.originalError).toEqual({
        code: 'ERR_001',
        details: 'Something failed',
      });
    });
  });
});
