export type FinancialCalculationMode =
  | 'total_only'
  | 'quantity_times_unit_price'
  | 'quantity_and_total';

export type FinancialQuantityUnit =
  | 'litre'
  | 'kilogram'
  | 'tonne'
  | 'hour'
  | 'workday'
  | 'piece'
  | 'hectare'
  | 'tree'
  | 'container'
  | 'other';

export type QuantityCalculation = {
  mode: FinancialCalculationMode;
  quantity: number | null;
  quantityUnit: FinancialQuantityUnit | null;
  unitPrice: number | null;
  amount: number;
  amountIsCalculated: boolean;
  unitPriceIsCalculated: boolean;
};

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const roundMoney = (value: number) => roundTo(value, 2);
export const roundQuantity = (value: number) => roundTo(value, 3);
export const roundUnitPrice = (value: number) => roundTo(value, 4);

export function parseDecimal(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim().replace(/\s|\u00a0/g, '');
  if (!trimmed) return null;
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized = trimmed;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = trimmed.replace(',', '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function defaultQuantityUnit(category?: string | null): FinancialQuantityUnit | null {
  switch (category) {
    case 'olive_oil_sale':
    case 'fuel_and_energy':
    case 'plant_protection':
      return 'litre';
    case 'fertilizers':
    case 'mill':
    case 'olive_sale':
      return 'kilogram';
    case 'labor':
    case 'collaborator_services':
      return 'workday';
    case 'irrigation':
      return 'hour';
    case 'equipment_and_tools':
    case 'transport':
      return 'piece';
    default:
      return null;
  }
}

export function resolveQuantityCalculation(input: {
  mode: FinancialCalculationMode;
  quantity?: number | null;
  quantityUnit?: FinancialQuantityUnit | null;
  unitPrice?: number | null;
  amount?: number | null;
}): QuantityCalculation {
  const quantity = input.quantity != null && input.quantity > 0 ? roundQuantity(input.quantity) : null;
  const unitPrice = input.unitPrice != null && input.unitPrice > 0 ? roundUnitPrice(input.unitPrice) : null;
  const unit = quantity ? input.quantityUnit ?? null : null;

  if (input.mode === 'quantity_times_unit_price') {
    if (quantity == null || unitPrice == null) {
      throw new Error('Quantity and unit price must be greater than zero.');
    }
    return {
      mode: input.mode,
      quantity,
      quantityUnit: input.quantityUnit ?? null,
      unitPrice,
      amount: roundMoney(quantity * unitPrice),
      amountIsCalculated: true,
      unitPriceIsCalculated: false,
    };
  }

  if (input.mode === 'quantity_and_total') {
    if (quantity == null || input.amount == null || input.amount <= 0) {
      throw new Error('Quantity and amount must be greater than zero.');
    }
    const amount = roundMoney(input.amount);
    return {
      mode: input.mode,
      quantity,
      quantityUnit: input.quantityUnit ?? null,
      unitPrice: roundUnitPrice(amount / quantity),
      amount,
      amountIsCalculated: false,
      unitPriceIsCalculated: true,
    };
  }

  if (input.amount == null || input.amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  return {
    mode: 'total_only',
    quantity,
    quantityUnit: unit,
    unitPrice,
    amount: roundMoney(input.amount),
    amountIsCalculated: false,
    unitPriceIsCalculated: false,
  };
}

export function switchCalculationMode(
  current: QuantityCalculation,
  next: FinancialCalculationMode
): QuantityCalculation {
  if (current.mode === next) return current;
  try {
    return resolveQuantityCalculation({
      mode: next,
      quantity: current.quantity,
      quantityUnit: current.quantityUnit,
      unitPrice: current.unitPrice,
      amount: current.amount,
    });
  } catch {
    return current;
  }
}
