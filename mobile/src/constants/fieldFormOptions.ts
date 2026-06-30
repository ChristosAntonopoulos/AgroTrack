export const CROP_TYPE_OPTIONS = ['Olive'] as const;

export const VARIETY_OPTIONS = [
  'Koroneiki',
  'Kalamon',
  'Megaritiki',
  'Manaki',
  'Unknown',
  'Other',
] as const;

export const IRRIGATION_OPTIONS = [
  'Rainfed',
  'Drip irrigation',
  'Sprinkler',
  'Mixed',
  'Unknown',
] as const;

export const SLOPE_OPTIONS = [
  'Flat',
  'Slight slope',
  'Moderate slope',
  'Steep',
  'Unknown',
] as const;

export const SOIL_OPTIONS = [
  'Clay Loam',
  'Sandy Loam',
  'Loam',
  'Rocky',
  'Calcareous',
  'Unknown',
  'Other',
] as const;

export type SelectOption = { label: string; value: string };

export const toSelectOptions = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ label: value, value }));
