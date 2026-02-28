import { TestBed } from '@angular/core/testing';

import {
  elevationExistsInOcrText,
  buildThousandSeparatorPattern,
  normalizeElevationUnit,
  removeThousandSeparatorsFromInteger,
  sanitizeElevation,
  TextNormalizationService,
  weightExistsInOcrText,
} from './text-normalization.service';

describe('TextNormalizationService', () => {
  let service: TextNormalizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TextNormalizationService],
    });
    service = TestBed.inject(TextNormalizationService);
  });

  it('should be injectable via TestBed', () => {
    expect(service).toBeTruthy();
  });

  // --- normalizeCase ---

  const normalizeCaseCases = [
    {
      input: 'FINCA EL PARAÍSO',
      expected: 'Finca el Paraíso',
      desc: 'ALL CAPS → Title Case',
    },
    {
      input: 'Square Mile Coffee',
      expected: 'Square Mile Coffee',
      desc: 'preserve mixed case (already correct)',
    },
    {
      input: 'ETHIOPIA YIRGACHEFFE\nNATURAL PROCESS',
      expected: 'Ethiopia Yirgacheffe\nNatural Process',
      desc: 'handle multiple lines independently',
    },
    {
      input: 'KENYA AA',
      expected: 'Kenya AA',
      desc: 'preserve coffee grade acronyms (AA)',
    },
    {
      input: 'SL-28 SL-34',
      expected: 'SL-28 SL-34',
      desc: 'preserve SL variety names',
    },
  ];

  describe('normalizeCase', () => {
    normalizeCaseCases.forEach(({ input, expected, desc }) => {
      it(`should normalize: ${desc}`, () => {
        expect(service.normalizeCase(input)).toBe(expected);
      });
    });
  });

  // --- layout tag preservation (normalizeCase edge cases) ---

  const layoutTagCases = [
    {
      input: '**LARGE:** COFFEE NAME',
      expected: '**LARGE:** Coffee Name',
      desc: 'markdown LARGE prefix → normalize content only',
    },
    {
      input: '**MEDIUM:** VARIETY',
      expected: '**MEDIUM:** Variety',
      desc: 'markdown MEDIUM prefix',
    },
    {
      input: '**SMALL:** DETAILS',
      expected: '**SMALL:** Details',
      desc: 'markdown SMALL prefix',
    },
    {
      input: '=== OCR WITH LAYOUT ===',
      expected: '=== OCR WITH LAYOUT ===',
      desc: 'preserve section headers unchanged',
    },
    {
      input: '--- Label 1 of 2 ---',
      expected: '--- Label 1 of 2 ---',
      desc: 'preserve label markers unchanged',
    },
    {
      input:
        '=== OCR WITH LAYOUT ===\n\n**LARGE:** ROASTER NAME\n\n**MEDIUM:** COFFEE ORIGIN',
      expected:
        '=== OCR WITH LAYOUT ===\n\n**LARGE:** Roaster Name\n\n**MEDIUM:** Coffee Origin',
      desc: 'mixed layout tags and content',
    },
  ];

  describe('normalizeCase — layout tags', () => {
    layoutTagCases.forEach(({ input, expected, desc }) => {
      it(`should handle: ${desc}`, () => {
        expect(service.normalizeCase(input)).toBe(expected);
      });
    });
  });

  // --- normalizeElevation ---
  // Unit conversion and thousand separator removal are tested by
  // normalizeElevationUnit and removeThousandSeparatorsFromInteger standalone tests.
  // These tests focus on range detection, the unique behavior of normalizeElevation.

  const normalizeElevationCases = [
    {
      input: '1850 MASL',
      expected: '1850 MASL',
      desc: 'already normalized MASL',
    },
    {
      input: '800m 1200m',
      expected: '800-1200 MASL',
      desc: 'implicit range (two values without dash)',
    },
    {
      input: '800m 1200 MASL',
      expected: '800-1200 MASL',
      desc: 'implicit range (m + MASL mix)',
    },
    {
      input: '800-1200m',
      expected: '800-1200 MASL',
      desc: 'explicit range (compact)',
    },
    {
      input: '800 - 1200 meters',
      expected: '800-1200 MASL',
      desc: 'explicit range (spaced)',
    },
  ];

  describe('normalizeElevation', () => {
    normalizeElevationCases.forEach(({ input, expected, desc }) => {
      it(`should normalize: ${desc}`, () => {
        expect(service.normalizeElevation(input)).toBe(expected);
      });
    });
  });

  // --- extractWeight ---

  const extractWeightCases: {
    input: string;
    expected: number | null;
    desc: string;
  }[] = [
    { input: '250g', expected: 250, desc: 'grams (no space)' },
    { input: '250 grams', expected: 250, desc: 'grams (with space + unit)' },
    { input: '1kg', expected: 1000, desc: 'kilograms → grams' },
    { input: '1.5 kg', expected: 1500, desc: 'decimal kilograms' },
    { input: '12oz', expected: 340, desc: 'ounces → grams (rounded)' },
    { input: '1lb', expected: 454, desc: 'pounds → grams (rounded)' },
    {
      input: 'Ethiopia Yirgacheffe',
      expected: null,
      desc: 'no weight pattern → null',
    },
  ];

  describe('extractWeight', () => {
    extractWeightCases.forEach(({ input, expected, desc }) => {
      it(`should extract: ${desc}`, () => {
        expect(service.extractWeight(input)).toBe(expected);
      });
    });
  });

  // --- normalizeAll ---
  // normalizeAll chains: normalizeNumbers → normalizeElevation → normalizeCase.
  // Weight extraction is intentionally separate (extractWeight) since it returns
  // a parsed number, not normalized text.

  const normalizeAllCases = [
    {
      input: 'FINCA EL PARAÍSO\n1.850 m.ü.M.\n250g',
      expectedFragments: ['Finca el Paraíso', '1850 MASL', '250g'],
      desc: 'case + thousand sep + elevation unit + weight preserved',
    },
  ];

  describe('normalizeAll', () => {
    normalizeAllCases.forEach(({ input, expectedFragments, desc }) => {
      it(`should normalize: ${desc}`, () => {
        const result = service.normalizeAll(input);
        for (const fragment of expectedFragments) {
          expect(result).toContain(fragment);
        }
      });
    });
  });
});

// =============================================================================
// Standalone exported functions
// =============================================================================

// --- removeThousandSeparatorsFromInteger ---

const removeThousandSepCases = [
  { input: '1.850', expected: '1850', desc: 'European dot separator' },
  { input: '1,850', expected: '1850', desc: 'European comma separator' },
  { input: "1'850", expected: '1850', desc: 'Swiss apostrophe' },
  {
    input: '1\u2019850',
    expected: '1850',
    desc: 'right single quote (U+2019)',
  },
  { input: '1 850', expected: '1850', desc: 'French space separator' },
  {
    input: "1'234'567",
    expected: '1234567',
    desc: 'multiple Swiss separators',
  },
  {
    input: '1.234.567',
    expected: '1234567',
    desc: 'multiple dot separators',
  },
  { input: '1850', expected: '1850', desc: 'clean number (no-op)' },
  { input: '1.5', expected: '1.5', desc: 'preserve decimal (2 digits)' },
  { input: '1.50', expected: '1.50', desc: 'preserve decimal (2 digits)' },
  {
    input: "elevation 1'850 MASL",
    expected: 'elevation 1850 MASL',
    desc: 'number in context',
  },
  {
    input: "1'850 to 2.100",
    expected: '1850 to 2100',
    desc: 'mixed formats in same string',
  },
];

// Strips thousand separators from formatted numbers (normalization direction).
// Counterpart: buildThousandSeparatorPattern tests below (matching direction).
describe('removeThousandSeparatorsFromInteger', () => {
  removeThousandSepCases.forEach(({ input, expected, desc }) => {
    it(`should handle: ${desc}`, () => {
      expect(removeThousandSeparatorsFromInteger(input)).toBe(expected);
    });
  });
});

// --- normalizeElevationUnit ---

const normalizeElevationUnitCases = [
  { input: '1850 m.ü.M.', expected: '1850 MASL', desc: 'German m.ü.M.' },
  { input: '1850 M.Ü.M.', expected: '1850 MASL', desc: 'German M.Ü.M. (uppercase)' },
  { input: '1850 meters', expected: '1850 MASL', desc: '"meters" suffix' },
  { input: '1850 meter', expected: '1850 MASL', desc: '"meter" suffix' },
  { input: '1850 msnm', expected: '1850 MASL', desc: 'Spanish msnm' },
  { input: '1850 m', expected: '1850 MASL', desc: 'bare "m" suffix' },
  { input: '1850m', expected: '1850 MASL', desc: '"m" directly attached (adds space)' },
  { input: '1700-1900m', expected: '1700-1900 MASL', desc: 'range with m' },
  { input: '1700-1900 meters', expected: '1700-1900 MASL', desc: 'range with meters' },
  { input: '1850 MASL', expected: '1850 MASL', desc: 'already uppercase MASL' },
  { input: '1850 masl', expected: '1850 MASL', desc: 'lowercase masl → MASL' },
  { input: '1850 Masl', expected: '1850 MASL', desc: 'mixed case Masl → MASL' },
];

describe('normalizeElevationUnit', () => {
  normalizeElevationUnitCases.forEach(({ input, expected, desc }) => {
    it(`should normalize: ${desc}`, () => {
      expect(normalizeElevationUnit(input)).toBe(expected);
    });
  });
});

// --- buildThousandSeparatorPattern ---

// Builds a regex to match separator variants in raw OCR text (matching direction).
// Counterpart: removeThousandSeparatorsFromInteger tests above (normalization direction).
describe('buildThousandSeparatorPattern', () => {
  const noSepCases = [
    { input: '250', desc: '3-digit number' },
    { input: '999', desc: 'max 3-digit number' },
  ];

  noSepCases.forEach(({ input, desc }) => {
    it(`should return plain digits for ${desc}`, () => {
      expect(buildThousandSeparatorPattern(input)).toBe(input);
    });
  });

  const sepMatchCases = [
    {
      digits: '1000',
      shouldMatch: ['1000', '1.000', '1,000', "1'000", '1 000'],
      desc: '4-digit number',
    },
    {
      digits: '12500',
      shouldMatch: ['12500', '12.500', '12,500'],
      desc: '5-digit number',
    },
    {
      digits: '123456',
      shouldMatch: ['123456', '123.456'],
      desc: '6-digit number',
    },
  ];

  sepMatchCases.forEach(({ digits, shouldMatch, desc }) => {
    it(`should match separator variants for ${desc}`, () => {
      const pattern = buildThousandSeparatorPattern(digits);
      const regex = new RegExp(`^${pattern}$`);
      for (const variant of shouldMatch) {
        expect(regex.test(variant))
          .withContext(`expected "${variant}" to match pattern for ${digits}`)
          .toBeTrue();
      }
    });
  });
});

// --- weightExistsInOcrText ---

const weightTrueCases: { grams: number; ocrText: string; desc: string }[] = [
  // Gram matches
  { grams: 250, ocrText: 'Coffee 250g Ethiopia', desc: '250g exact' },
  { grams: 250, ocrText: 'Coffee 250 g Ethiopia', desc: '250 g with space' },
  { grams: 250, ocrText: 'Coffee 250 grams', desc: '250 grams' },
  { grams: 250, ocrText: '250g Ethiopia', desc: 'weight at start of text' },
  { grams: 250, ocrText: 'Ethiopia 250g', desc: 'weight at end of text' },
  // Grams with thousand separators
  { grams: 1000, ocrText: 'Coffee 1.000g pack', desc: '1000g with dot sep' },
  {
    grams: 1000,
    ocrText: 'Coffee 1,000g pack',
    desc: '1000g with comma sep',
  },
  {
    grams: 1000,
    ocrText: "Coffee 1'000g pack",
    desc: '1000g with apostrophe sep',
  },
  {
    grams: 1000,
    ocrText: 'Coffee 1 000g pack',
    desc: '1000g with space sep',
  },
  // Kilogram matches
  { grams: 1000, ocrText: 'Coffee 1kg bag', desc: '1kg' },
  { grams: 1000, ocrText: 'Coffee 1 kg bag', desc: '1 kg with space' },
  { grams: 2000, ocrText: 'Coffee 2kg bag', desc: '2kg' },
  { grams: 1000, ocrText: 'Coffee 1.0kg bag', desc: '1.0kg' },
  { grams: 1000, ocrText: 'Coffee 1,0kg bag', desc: '1,0kg' },
  { grams: 1500, ocrText: 'Coffee 1.5kg bag', desc: '1.5kg decimal' },
  { grams: 1500, ocrText: 'Coffee 1,5kg bag', desc: '1,5kg decimal' },
  { grams: 1000, ocrText: 'Coffee 1 kilo', desc: '"kilo" variant' },
  { grams: 1000, ocrText: 'Coffee 1 kilogram', desc: '"kilogram" variant' },
];

const weightFalseCases: { grams: number; ocrText: string; desc: string }[] = [
  {
    grams: 1000,
    ocrText: 'Label 1 of 2',
    desc: 'number without weight unit',
  },
  {
    grams: 1000,
    ocrText: 'Roasted 15.01.2025',
    desc: 'number in date context',
  },
  {
    grams: 1000,
    ocrText: 'Ethiopia 250g Natural',
    desc: 'OCR has 250g, not 1kg (hallucination)',
  },
  {
    grams: 1000,
    ocrText: 'Ethiopia 250g Roasted 15.01.2025',
    desc: '"1" in date should not match 1kg',
  },
  {
    grams: 1000,
    ocrText: 'Ethiopia 100g bag',
    desc: '"1" in 100g should not match 1kg',
  },
  {
    grams: 1000,
    ocrText: 'Ethiopia 250g --- Label 1 of 2 ---',
    desc: '"1" in label marker should not match 1kg',
  },
];

describe('weightExistsInOcrText', () => {
  weightTrueCases.forEach(({ grams, ocrText, desc }) => {
    it(`should find: ${desc}`, () => {
      expect(weightExistsInOcrText(grams, ocrText))
        .withContext(`expected ${grams}g to be found in "${ocrText}"`)
        .toBeTrue();
    });
  });

  weightFalseCases.forEach(({ grams, ocrText, desc }) => {
    it(`should reject: ${desc}`, () => {
      expect(weightExistsInOcrText(grams, ocrText))
        .withContext(`expected ${grams}g NOT to be found in "${ocrText}"`)
        .toBeFalse();
    });
  });
});

// --- sanitizeElevation ---

// Unit conversion and thousand separator removal are tested by
// normalizeElevationUnit and removeThousandSeparatorsFromInteger standalone tests.
// These tests focus on sanitize-specific behavior: whitespace, LLM quirks, validation.
const sanitizeElevationValidCases: {
  input: string | null | undefined;
  expected: string;
  desc: string;
}[] = [
  { input: '1850 MASL', expected: '1850 MASL', desc: 'valid MASL format' },
  {
    input: '1700-1900 MASL',
    expected: '1700-1900 MASL',
    desc: 'valid range format',
  },
  {
    input: '1800\nMASL',
    expected: '1800 MASL',
    desc: 'linebreak → space',
  },
  {
    input: '1850   MASL',
    expected: '1850 MASL',
    desc: 'normalize multiple spaces',
  },
  {
    input: '2300 MASL 2400 MASL',
    expected: '2300-2400 MASL',
    desc: 'LLM quirk: two MASL values → range',
  },
  { input: '4999 MASL', expected: '4999 MASL', desc: 'just below 5000 limit' },
  {
    input: '1800-4999 MASL',
    expected: '1800-4999 MASL',
    desc: 'range just below 5000 limit',
  },
];

const sanitizeElevationNullCases: {
  input: string | null | undefined;
  desc: string;
}[] = [
  { input: null, desc: 'null input' },
  { input: undefined, desc: 'undefined input' },
  { input: 'NOT_FOUND', desc: 'LLM NOT_FOUND sentinel' },
  { input: 'null', desc: 'string "null"' },
  { input: 'unknown', desc: 'string "unknown"' },
  { input: '', desc: 'empty string' },
  {
    input: '74158 MASL',
    desc: 'variety number (74158 >= 5000)',
  },
  { input: '5000 MASL', desc: 'exactly 5000 (boundary)' },
  {
    input: '1800-5000 MASL',
    desc: 'range with one value >= 5000',
  },
];

describe('sanitizeElevation', () => {
  sanitizeElevationValidCases.forEach(({ input, expected, desc }) => {
    it(`should sanitize: ${desc}`, () => {
      expect(sanitizeElevation(input as string)).toBe(expected);
    });
  });

  sanitizeElevationNullCases.forEach(({ input, desc }) => {
    it(`should return null: ${desc}`, () => {
      expect(sanitizeElevation(input as string)).toBeNull();
    });
  });
});

// --- elevationExistsInOcrText ---

const elevationTrueCases: {
  elevation: string;
  ocrText: string;
  desc: string;
}[] = [
  {
    elevation: '1850 MASL',
    ocrText: 'Coffee 1850m',
    desc: 'exact match in OCR',
  },
  {
    elevation: '1850 MASL',
    ocrText: 'elevation 1850',
    desc: 'number without unit',
  },
  {
    elevation: '1850 MASL',
    ocrText: 'Coffee 1.850m',
    desc: 'dot thousand separator in OCR',
  },
  {
    elevation: '1850 MASL',
    ocrText: 'Coffee 1,850m',
    desc: 'comma thousand separator in OCR',
  },
  {
    elevation: '1850 MASL',
    ocrText: "Coffee 1'850m",
    desc: 'apostrophe separator in OCR',
  },
  {
    elevation: '1850 MASL',
    ocrText: 'Coffee 1 850m',
    desc: 'space separator in OCR',
  },
  {
    elevation: '1700-1900 MASL',
    ocrText: '1700-1900m',
    desc: 'range — both numbers present',
  },
  {
    elevation: '1700-1900 MASL',
    ocrText: '1.700-1.900m',
    desc: 'range with thousand separators',
  },
  {
    elevation: '800 MASL',
    ocrText: 'Grown at 800m',
    desc: '3-digit elevation',
  },
];

const elevationFalseCases: {
  elevation: string;
  ocrText: string;
  desc: string;
}[] = [
  {
    elevation: '1850 MASL',
    ocrText: 'Coffee 250g',
    desc: 'number not in OCR (hallucination)',
  },
  {
    elevation: '2000 MASL',
    ocrText: 'Grown at 1850m',
    desc: 'wrong number in OCR',
  },
  {
    elevation: '1700-1900 MASL',
    ocrText: '1700m',
    desc: 'range — only first number present',
  },
  {
    elevation: '1700-1900 MASL',
    ocrText: '1900m',
    desc: 'range — only second number present',
  },
  { elevation: '', ocrText: 'Coffee 1850m', desc: 'empty elevation input' },
  { elevation: '1850 MASL', ocrText: '', desc: 'empty OCR text' },
];

describe('elevationExistsInOcrText', () => {
  elevationTrueCases.forEach(({ elevation, ocrText, desc }) => {
    it(`should find: ${desc}`, () => {
      expect(elevationExistsInOcrText(elevation, ocrText))
        .withContext(`expected "${elevation}" to be found in "${ocrText}"`)
        .toBeTrue();
    });
  });

  elevationFalseCases.forEach(({ elevation, ocrText, desc }) => {
    it(`should reject: ${desc}`, () => {
      expect(elevationExistsInOcrText(elevation, ocrText))
        .withContext(`expected "${elevation}" NOT to be found in "${ocrText}"`)
        .toBeFalse();
    });
  });
});
