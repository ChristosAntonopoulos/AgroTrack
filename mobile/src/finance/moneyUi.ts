import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import type { FinancialQuantityUnit } from './quantityCalculator';

const UNIT_LABEL = {
  el: {
    litre: 'λίτρα',
    kilogram: 'κιλά',
    tonne: 'τόνοι',
    hour: 'ώρες',
    workday: 'μεροκάματα',
    piece: 'τεμάχια',
    hectare: 'στρέμματα',
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
    hectare: 'stremmata',
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
  hectare: 'στρ.',
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

export function defaultModeForCategory(
  category?: string | null
): 'total_only' | 'quantity_times_unit_price' {
  return category === 'olive_oil_sale' ? 'quantity_times_unit_price' : 'total_only';
}

export function yearFromIsoDate(isoDate: string): number {
  return agriculturalYearFor(isoDate);
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
  if (unitPrice == null || unitPrice <= 0) return `${qty} ${abbr}`.trim();
  const price = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(unitPrice);
  return `${qty} ${abbr} × ${price} €/${abbr}`.trim();
}
