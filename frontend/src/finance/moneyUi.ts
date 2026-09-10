import type { FinancialCategory } from './display';
import type { FinancialQuantityUnit } from './quantityCalculator';

export const FEATURED_EXPENSE_CATEGORIES: FinancialCategory[] = [
  'labor',
  'fertilizers',
  'fuel_and_energy',
  'plant_protection',
  'irrigation',
];

export const FEATURED_INCOME_CATEGORIES: FinancialCategory[] = [
  'olive_oil_sale',
  'olive_sale',
  'subsidy',
  'compensation',
  'other_income',
];

const UNIT_LABEL = {
  el: {
    litre: 'λίτρα',
    kilogram: 'κιλά',
    tonne: 'τόνοι',
    hour: 'ώρες',
    workday: 'μεροκάματα',
    piece: 'τεμάχια',
    hectare: 'εκτάρια',
    tree: 'δέντρα',
    container: 'δοχεία',
    other: 'άλλο',
  },
  en: {
    litre: 'litres',
    kilogram: 'kilograms',
    tonne: 'tonnes',
    hour: 'hours',
    workday: 'workdays',
    piece: 'pieces',
    hectare: 'hectares',
    tree: 'trees',
    container: 'containers',
    other: 'other',
  },
} as const;

export const UNIT_ABBREVIATION: Record<FinancialQuantityUnit, string> = {
  litre: 'L',
  kilogram: 'kg',
  tonne: 't',
  hour: 'ώρες',
  workday: 'ημέρες',
  piece: 'τεμ.',
  hectare: 'ha',
  tree: 'δέντρα',
  container: 'δοχεία',
  other: '',
};

export function quantityUnitLabel(unit: FinancialQuantityUnit, language = 'el'): string {
  const pack = language.toLowerCase().startsWith('en') ? UNIT_LABEL.en : UNIT_LABEL.el;
  return pack[unit];
}

export function suggestedUnitsForCategory(category?: string | null): FinancialQuantityUnit[] {
  switch (category) {
    case 'fuel_and_energy':
      return ['litre'];
    case 'fertilizers':
      return ['kilogram', 'tonne'];
    case 'plant_protection':
      return ['litre', 'kilogram'];
    case 'labor':
    case 'collaborator_services':
      return ['workday', 'hour'];
    case 'irrigation':
      return ['hour'];
    case 'equipment_and_tools':
      return ['piece', 'hour'];
    case 'mill':
      return ['kilogram', 'litre'];
    case 'transport':
      return ['piece'];
    case 'olive_oil_sale':
      return ['litre'];
    case 'olive_sale':
      return ['kilogram'];
    default:
      return [];
  }
}

export function categorySupportsQuantity(category?: string | null): boolean {
  return suggestedUnitsForCategory(category).length > 0;
}

export function suggestedDescription(category?: string | null, language = 'el'): string {
  const en = language.toLowerCase().startsWith('en');
  switch (category) {
    case 'fuel_and_energy':
      return en ? 'Diesel for the irrigation pump' : 'Πετρέλαιο για αντλία άρδευσης';
    case 'labor':
      return en ? 'Pruning workdays' : 'Μεροκάματα για κλάδεμα';
    case 'fertilizers':
      return en ? 'Fertiliser and transport' : 'Λίπασμα και μεταφορά';
    case 'plant_protection':
      return en ? 'Olive fruit fly spray' : 'Δολωματικός ψεκασμός δάκου';
    case 'irrigation':
      return en ? 'Irrigation' : 'Άρδευση';
    case 'olive_oil_sale':
      return en ? 'Olive oil sale' : 'Πώληση ελαιολάδου';
    case 'olive_sale':
      return en ? 'Olive sale' : 'Πώληση ελιάς';
    case 'mill':
      return en ? 'Olive mill cost' : 'Κόστος ελαιοτριβείου';
    default:
      return '';
  }
}

export function todayIsoDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const source = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${source.getFullYear()}-${String(source.getMonth() + 1).padStart(2, '0')}-${String(source.getDate()).padStart(2, '0')}`;
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const next = new Date(y, (m || 1) - 1, (d || 1) + days);
  return todayIsoDate(next.toISOString());
}

export function yearFromIsoDate(isoDate: string): number {
  const year = Number(isoDate.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

export function formatLongDate(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function formatQuantityLine(
  quantity: number | null | undefined,
  unit: string | null | undefined,
  unitPrice: number | null | undefined,
  locale: string
): string | null {
  if (quantity == null || quantity <= 0) return null;
  const unitKey = (unit || 'other') as FinancialQuantityUnit;
  const abbr = UNIT_ABBREVIATION[unitKey] || quantityUnitLabel(unitKey, locale);
  const qty = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(quantity);
  if (unitPrice == null || unitPrice <= 0) return `${qty} ${abbr}`;
  const price = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(unitPrice);
  return `${qty} ${abbr} × ${price} €/${abbr}`;
}

export function defaultModeForCategory(category?: string | null): 'total_only' | 'quantity_times_unit_price' {
  return category === 'olive_oil_sale' ? 'quantity_times_unit_price' : 'total_only';
}

export const newIdempotencyKey = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `money-${Date.now()}-${Math.random().toString(16).slice(2)}`;
