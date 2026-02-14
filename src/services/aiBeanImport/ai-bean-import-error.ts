/**
 * Steps in the AI bean import process.
 * Used for error tracking and debugging.
 */
export type AIImportStep =
  | 'init'
  | 'camera_permission'
  | 'take_photo'
  | 'ocr_setup'
  | 'ocr'
  | 'ocr_metadata'
  | 'language_detection'
  | 'multi_step_extraction'
  | 'processing';

/**
 * Custom error interface for AI bean import operations.
 * Extends standard Error with additional context for debugging.
 */
export interface AIBeanImportError extends Error {
  /** The step in the import process where the error occurred */
  step: AIImportStep;
  /** The original error that was caught, if any */
  originalError?: unknown;
}

/**
 * Creates an AIBeanImportError with proper typing.
 *
 * @param message - Error message
 * @param step - The import step where the error occurred
 * @param originalError - The original error that was caught
 * @returns A properly typed AIBeanImportError
 */
export function createAIBeanImportError(
  message: string,
  step: AIImportStep,
  originalError?: unknown,
): AIBeanImportError {
  const error = new Error(message) as AIBeanImportError;
  error.step = step;
  error.originalError = originalError;
  return error;
}
