import { AI_PROVIDER_ENUM } from '../../../enums/settings/aiProvider';
import { CloudFieldExtractionService } from '../cloud-field-extraction.service';
import { CloudLLMConfig } from '../cloud-llm-communication.service';

describe('CloudFieldExtractionService', () => {
  let service: CloudFieldExtractionService;
  let mockConfig: CloudLLMConfig;
  let mockLogger: { log: jasmine.Spy };
  let fetchSpy: jasmine.Spy;

  const defaultConfig: CloudLLMConfig = {
    provider: AI_PROVIDER_ENUM.OPENAI,
    apiKey: 'test-key',
    model: 'gpt-4o',
  };

  /**
   * Helper: wrap bean JSON in an OpenAI-compatible API response
   * and configure fetchSpy to return it.
   */
  function mockFetchWithBeanJson(beanJson: object): void {
    const responseContent = JSON.stringify(beanJson);
    fetchSpy.and.returnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: responseContent } }],
            model: 'gpt-4o',
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
      } as unknown as Response),
    );
  }

  /**
   * Helper: wrap bean JSON in markdown code block, then in API response.
   */
  function mockFetchWithMarkdownWrappedJson(beanJson: object): void {
    const responseContent = '```json\n' + JSON.stringify(beanJson) + '\n```';
    fetchSpy.and.returnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: responseContent } }],
            model: 'gpt-4o',
          }),
      } as unknown as Response),
    );
  }

  beforeEach(() => {
    mockConfig = { ...defaultConfig };
    mockLogger = { log: jasmine.createSpy('log') };
    fetchSpy = spyOn(globalThis, 'fetch');

    // Create the service without calling the constructor because inject()
    // requires Angular's injection context (TestBed). This test intentionally
    // avoids TestBed for speed. Config and logger are passed explicitly.
    service = Object.create(CloudFieldExtractionService.prototype);
  });

  // ── Successful extraction ──────────────────────────────────────────

  describe('successful extraction', () => {
    it('should extract all fields from a well-formed single origin response', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'Yirgacheffe',
        roaster: 'Counter Culture',
        weight: '250g',
        bean_roasting_type: 'FILTER',
        aromatics: 'Blueberry, Jasmine, Lemon',
        decaffeinated: false,
        cupping_points: 88.5,
        roasting_date: '2025-01-15',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [
          {
            country: 'Ethiopia',
            region: 'Yirgacheffe',
            variety: 'Heirloom',
            processing: 'Washed',
            elevation: '1900 MASL',
            farm: 'Konga',
            farmer: 'Abebe Bekele',
            percentage: 'NOT_FOUND',
          },
        ],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert — top-level fields
      expect(bean.name).toBe('Yirgacheffe');
      expect(bean.roaster).toBe('Counter Culture');
      expect(bean.weight).toBe(250);
      expect(bean.aromatics).toBe('Blueberry, Jasmine, Lemon');
      expect(bean.decaffeinated).toBe(false);
      expect(bean.cupping_points).toBe('88.5');
      expect(bean.roastingDate).toBe('2025-01-15');

      // Assert — origin fields
      expect(bean.bean_information.length).toBe(1);
      expect(bean.bean_information[0].country).toBe('Ethiopia');
      expect(bean.bean_information[0].region).toBe('Yirgacheffe');
      expect(bean.bean_information[0].variety).toBe('Heirloom');
      expect(bean.bean_information[0].processing).toBe('Washed');
      expect(bean.bean_information[0].elevation).toBe('1900 MASL');
      expect(bean.bean_information[0].farm).toBe('Konga');
      expect(bean.bean_information[0].farmer).toBe('Abebe Bekele');
    });

    it('should handle markdown-wrapped JSON response', async () => {
      // WHY: Some models wrap their JSON in ```json ... ``` code blocks

      // Arrange
      mockFetchWithMarkdownWrappedJson({
        name: 'Geisha',
        roaster: 'Ninety Plus',
        weight: '100g',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [{ country: 'Panama', region: 'Boquete' }],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.name).toBe('Geisha');
      expect(bean.roaster).toBe('Ninety Plus');
      expect(bean.weight).toBe(100);
      expect(bean.bean_information[0].country).toBe('Panama');
      expect(bean.bean_information[0].region).toBe('Boquete');
    });

    it('should map ESPRESSO roasting type correctly', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'Dark Roast',
        roaster: 'Local Roaster',
        weight: '1kg',
        bean_roasting_type: 'ESPRESSO',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [{ country: 'Brazil' }],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.weight).toBe(1000);
      // constructBeanFromExtractedData converts enum values to key strings
      expect(bean.bean_roasting_type).toBe('ESPRESSO' as any);
    });

    it('should handle numeric weight value', async () => {
      // WHY: Some models may return weight as a number instead of string

      // Arrange
      mockFetchWithBeanJson({
        name: 'Test',
        roaster: 'Test',
        weight: 500,
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [{ country: 'Kenya' }],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.weight).toBe(500);
    });

    it('should handle decaffeinated as true', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'Decaf Blend',
        roaster: 'Test Roaster',
        weight: '250g',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: true,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [{ country: 'Mexico' }],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.decaffeinated).toBe(true);
    });

    it('should log token usage when available', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'Test',
        roaster: 'Test',
        weight: 'NOT_FOUND',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [],
      });

      // Act
      await service.extractAllFields('sample OCR text', mockConfig, mockLogger);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith('[Cloud LLM] model: gpt-4o');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token usage: 100 prompt, 50 completion',
      );
    });
  });

  // ── NOT_FOUND handling ─────────────────────────────────────────────

  describe('NOT_FOUND handling', () => {
    it('should set fields to defaults when all values are NOT_FOUND', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'NOT_FOUND',
        roaster: 'NOT_FOUND',
        weight: 'NOT_FOUND',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: 'NOT_FOUND',
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'NOT_FOUND',
        origins: [],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert — all fields should be at defaults
      expect(bean.name).toBe('');
      expect(bean.roaster).toBe('');
      expect(bean.weight).toBe(0);
      expect(bean.aromatics).toBe('');
      // bean_information should have at least one empty entry (from constructBeanFromExtractedData)
      expect(bean.bean_information.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle null values the same as NOT_FOUND', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: null,
        roaster: null,
        weight: null,
        bean_roasting_type: null,
        aromatics: null,
        decaffeinated: null,
        cupping_points: null,
        roasting_date: null,
        bean_mix: null,
        origins: [],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.name).toBe('');
      expect(bean.roaster).toBe('');
      expect(bean.weight).toBe(0);
    });

    it('should handle "unknown" and "N/A" as null-like values', async () => {
      // WHY: LLMs may return different null-like strings

      // Arrange
      mockFetchWithBeanJson({
        name: 'Actual Name',
        roaster: 'unknown',
        weight: 'N/A',
        bean_roasting_type: 'none',
        aromatics: 'unknown',
        decaffeinated: false,
        cupping_points: 'N/A',
        roasting_date: 'unknown',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [
          {
            country: 'Colombia',
            region: 'unknown',
            variety: 'N/A',
            processing: 'none',
          },
        ],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.name).toBe('Actual Name');
      expect(bean.roaster).toBe('');
      expect(bean.weight).toBe(0);
      expect(bean.bean_information[0].country).toBe('Colombia');
      expect(bean.bean_information[0].region).toBe('');
      expect(bean.bean_information[0].variety).toBe('');
      expect(bean.bean_information[0].processing).toBe('');
    });

    it('should strip NOT_FOUND from origin fields', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'Test Coffee',
        roaster: 'Test Roaster',
        weight: '250g',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'SINGLE_ORIGIN',
        origins: [
          {
            country: 'Ethiopia',
            region: 'NOT_FOUND',
            variety: 'NOT_FOUND',
            processing: 'Washed',
            elevation: 'NOT_FOUND',
            farm: 'NOT_FOUND',
            farmer: 'NOT_FOUND',
            percentage: 'NOT_FOUND',
          },
        ],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.bean_information[0].country).toBe('Ethiopia');
      expect(bean.bean_information[0].region).toBe('');
      expect(bean.bean_information[0].variety).toBe('');
      expect(bean.bean_information[0].processing).toBe('Washed');
      expect(bean.bean_information[0].elevation).toBe('');
      expect(bean.bean_information[0].farm).toBe('');
      expect(bean.bean_information[0].farmer).toBe('');
    });
  });

  // ── Blend handling ─────────────────────────────────────────────────

  describe('blend handling', () => {
    it('should produce multiple origin entries for a blend', async () => {
      // Arrange
      mockFetchWithBeanJson({
        name: 'House Blend',
        roaster: 'Blue Bottle',
        weight: '340g',
        bean_roasting_type: 'ESPRESSO',
        aromatics: 'Chocolate, Caramel, Hazelnut',
        decaffeinated: false,
        cupping_points: 85,
        roasting_date: '2025-02-20',
        bean_mix: 'BLEND',
        origins: [
          {
            country: 'Brazil',
            region: 'Cerrado',
            variety: 'Bourbon',
            processing: 'Natural',
            elevation: '1100 MASL',
            farm: 'Fazenda',
            farmer: 'NOT_FOUND',
            percentage: 60,
          },
          {
            country: 'Ethiopia',
            region: 'Sidamo',
            variety: 'Heirloom',
            processing: 'Washed',
            elevation: '1800 MASL',
            farm: 'NOT_FOUND',
            farmer: 'NOT_FOUND',
            percentage: 40,
          },
        ],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.bean_information.length).toBe(2);

      // First origin
      expect(bean.bean_information[0].country).toBe('Brazil');
      expect(bean.bean_information[0].region).toBe('Cerrado');
      expect(bean.bean_information[0].variety).toBe('Bourbon');
      expect(bean.bean_information[0].processing).toBe('Natural');
      expect(bean.bean_information[0].elevation).toBe('1100 MASL');
      expect(bean.bean_information[0].farm).toBe('Fazenda');
      expect(bean.bean_information[0].farmer).toBe('');
      expect(bean.bean_information[0].percentage).toBe(60);

      // Second origin
      expect(bean.bean_information[1].country).toBe('Ethiopia');
      expect(bean.bean_information[1].region).toBe('Sidamo');
      expect(bean.bean_information[1].variety).toBe('Heirloom');
      expect(bean.bean_information[1].processing).toBe('Washed');
      expect(bean.bean_information[1].elevation).toBe('1800 MASL');
      expect(bean.bean_information[1].farm).toBe('');
      expect(bean.bean_information[1].farmer).toBe('');
      expect(bean.bean_information[1].percentage).toBe(40);
    });

    it('should handle percentage as string with % sign', async () => {
      // WHY: The prompt asks for "N%" format; some models may return it as a string

      // Arrange
      mockFetchWithBeanJson({
        name: 'Blend',
        roaster: 'Roaster',
        weight: '250g',
        bean_roasting_type: 'NOT_FOUND',
        aromatics: 'NOT_FOUND',
        decaffeinated: false,
        cupping_points: 'NOT_FOUND',
        roasting_date: 'NOT_FOUND',
        bean_mix: 'BLEND',
        origins: [
          { country: 'Brazil', percentage: '70%' },
          { country: 'Colombia', percentage: '30%' },
        ],
      });

      // Act
      const bean = await service.extractAllFields(
        'sample OCR text',
        mockConfig,
        mockLogger,
      );

      // Assert
      expect(bean.bean_information[0].percentage).toBe(70);
      expect(bean.bean_information[1].percentage).toBe(30);
    });
  });

  // ── Error handling ─────────────────────────────────────────────────

  describe('error handling', () => {
    it('should throw on malformed JSON response', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'This is not JSON at all' } }],
              model: 'gpt-4o',
            }),
        } as unknown as Response),
      );

      // Act & Assert
      try {
        await service.extractAllFields(
          'sample OCR text',
          mockConfig,
          mockLogger,
        );
        fail('Expected extractAllFields to throw');
      } catch (error) {
        expect(error.message).toBe(
          'Failed to parse JSON from cloud LLM response',
        );
      }
    });

    it('should throw on API error', async () => {
      // Arrange
      fetchSpy.and.returnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal server error'),
        } as unknown as Response),
      );

      // Act & Assert
      try {
        await service.extractAllFields(
          'sample OCR text',
          mockConfig,
          mockLogger,
        );
        fail('Expected extractAllFields to throw');
      } catch (error) {
        expect(error.message).toBe(
          'Cloud LLM API error (500): Internal server error',
        );
      }
    });

    it('should throw on network error', async () => {
      // Arrange
      fetchSpy.and.callFake(() =>
        Promise.reject(new TypeError('Failed to fetch')),
      );

      // Act & Assert
      try {
        await service.extractAllFields(
          'sample OCR text',
          mockConfig,
          mockLogger,
        );
        fail('Expected extractAllFields to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toBe('Failed to fetch');
      }
    });
  });
});
