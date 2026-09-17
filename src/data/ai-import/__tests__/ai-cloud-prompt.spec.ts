import {
  buildCloudExtractionPrompt,
  CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS,
} from '../ai-cloud-prompt';

describe('Cloud Bean Import Prompt', () => {
  describe('CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS', () => {
    it('should contain anti-hallucination instructions', () => {
      expect(CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS).toContain('NOT_FOUND');
      expect(CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS).toContain(
        'NEVER hallucinate',
      );
    });

    it('should require JSON-only responses', () => {
      expect(CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS).toContain(
        'ONLY valid JSON',
      );
    });
  });

  describe('buildCloudExtractionPrompt', () => {
    const sampleOcrText =
      'LARGE: Ethiopia Yirgacheffe\nMEDIUM: Roasted by Coffee Co\nSMALL: 250g';
    let prompt: string;

    beforeEach(() => {
      prompt = buildCloudExtractionPrompt(sampleOcrText);
    });

    it('should include OCR misreading explanation', () => {
      expect(prompt).toContain('OCR');
      expect(prompt).toContain('misread');
    });

    it('should include the OCR text verbatim', () => {
      expect(prompt).toContain(sampleOcrText);
    });

    it('should include layout hint explanation', () => {
      expect(prompt).toContain('LARGE:');
      expect(prompt).toContain('font size');
    });

    it('should request JSON response format', () => {
      expect(prompt).toContain('"name"');
      expect(prompt).toContain('"roaster"');
      expect(prompt).toContain('"origins"');
    });

    it('should contain all expected field names', () => {
      const expectedFields = [
        'name',
        'roaster',
        'weight',
        'bean_roasting_type',
        'aromatics',
        'decaffeinated',
        'cupping_points',
        'roasting_date',
        'bean_mix',
        'origins',
        'country',
        'region',
        'variety',
        'processing',
        'elevation',
        'farm',
        'farmer',
        'percentage',
      ];
      for (const field of expectedFields) {
        expect(prompt).toContain(`"${field}"`);
      }
    });

    it('should wrap OCR text in delimiters', () => {
      expect(prompt).toContain('--- OCR TEXT ---');
      expect(prompt).toContain('--- END OCR TEXT ---');
    });

    it('omits the prompt appendix heading when no appendix is provided', () => {
      // Arrange
      const heading = 'Additional extraction instructions from the user:';

      // Act
      const result = buildCloudExtractionPrompt(sampleOcrText);

      // Assert
      expect(result).not.toContain(heading);
    });

    it('preserves the normal prompt ending for empty appendices', () => {
      // Arrange
      const expectedEnding =
        'For blends: one object per component in "origins". For single origin: one object.';

      // Act
      const emptyResult = buildCloudExtractionPrompt(sampleOcrText, '');
      const whitespaceResult = buildCloudExtractionPrompt(
        sampleOcrText,
        '  \n\t  ',
      );

      // Assert
      expect(emptyResult.endsWith(expectedEnding)).toBe(true);
      expect(whitespaceResult.endsWith(expectedEnding)).toBe(true);
    });

    it('appends a trimmed prompt appendix as the final prompt content', () => {
      // Arrange
      const appendix = '  Prefer the farm name.\n\nKeep  internal spacing.  \n';
      const expectedSuffix =
        'For blends: one object per component in "origins". For single origin: one object.\n\n' +
        'Additional extraction instructions from the user:\n' +
        'Prefer the farm name.\n\nKeep  internal spacing.';

      // Act
      const result = buildCloudExtractionPrompt(sampleOcrText, appendix);

      // Assert
      expect(result.endsWith(expectedSuffix)).toBe(true);
    });
  });
});
