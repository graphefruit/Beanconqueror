export interface IHandoffQuantity<Unit extends string> {
  value: number;
  unit: Unit;
}

export interface IHandoffImport {
  source: string;
  sourceName: string;
  sourceUrl?: string;
  device?: string;
  schema: number;
  params?: Record<string, unknown>;
}

export interface IHandoffMetric {
  key: string;
  name: string;
  unit: string;
  kind: 'measured' | 'target';
  /** Absolute milliseconds since brew start. */
  t: number[];
  v: number[];
}

export interface IHandoffFlow {
  fidelity: 'full' | 'downsampled';
  /** Milliseconds since brew start, delta-coded. */
  t: number[];
  /** Decigrams since the previous sample; importer accumulates to grams. */
  waterDispensed: number[];
  /** Decigrams since the previous sample; importer accumulates to grams. */
  weight: number[];
  /** Absolute Celsius per sample. */
  temperature?: number[];
}

export interface IHandoffBrew {
  date: string;
  doseIn?: IHandoffQuantity<'g'>;
  waterIn: IHandoffQuantity<'ml'>;
  beverageOut: IHandoffQuantity<'g'>;
  brewTime: number;
  // Bare Celsius for schema v1; a future schema should make the unit explicit.
  temperature?: number;
  ratio?: number;
  grindSize?: string;
  grinderRpm?: number;
  grinderName?: string;
  preparationMethod: string;
  bloomTime?: number;
  firstDripTime?: number;
  // Whole stars, on the sending app's own scale, and absent when the brew was
  // never rated. Absent rather than 0, because 0 is a point on the scale.
  rating?: number;
  note: string;
}

export interface IHandoffBean {
  name: string;
  origin?: string;
  process?: string;
  variety?: string;
  aromatics?: string;
  note?: string;
  beanMix?: string;
  imageUrl?: string;
}

export interface IHandoffEnvelope {
  v: 1;
  app: { name: string; version?: string };
  brew: IHandoffBrew;
  bean?: IHandoffBean;
  flow?: IHandoffFlow;
  metrics?: IHandoffMetric[];
  imported: IHandoffImport;
}
