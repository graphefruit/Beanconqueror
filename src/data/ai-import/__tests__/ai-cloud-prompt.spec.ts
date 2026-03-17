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
  });
});
