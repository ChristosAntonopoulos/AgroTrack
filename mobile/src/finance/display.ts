export type FinancialTransactionType = 'income' | 'expense';
export type FinancialTransactionStatus = 'draft' | 'posted' | 'void';
export type FinancialTransactionSourceType = 'manual' | 'task' | 'harvest' | 'service';

export const EXPENSE_CATEGORIES = [
  'labor',
  'fertilizers',
  'plant_protection',
  'fuel_and_energy',
  'irrigation',
  'equipment_and_tools',
  'transport',
  'mill',
  'collaborator_services',
  'land_rent',
  'other_expense',
] as const;

export const INCOME_CATEGORIES = [
  'olive_oil_sale',
  'olive_sale',
  'subsidy',
  'compensation',
  'service_provision',
  'other_income',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type FinancialCategory = ExpenseCategory | IncomeCategory;

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const CATEGORY_EL: Record<FinancialCategory, string> = {
  labor: 'Εργασία',
  fertilizers: 'Λιπάσματα',
  plant_protection: 'Φυτοπροστασία',
  fuel_and_energy: 'Καύσιμα και ενέργεια',
  irrigation: 'Άρδευση',
  equipment_and_tools: 'Εξοπλισμός και εργαλεία',
  transport: 'Μεταφορές',
  mill: 'Ελαιοτριβείο',
  collaborator_services: 'Υπηρεσίες συνεργατών',
  land_rent: 'Ενοίκιο γης',
  other_expense: 'Άλλο έξοδο',
  olive_oil_sale: 'Πώληση ελαιολάδου',
  olive_sale: 'Πώληση ελιάς',
  subsidy: 'Επιδότηση',
  compensation: 'Αποζημίωση',
  service_provision: 'Παροχή υπηρεσίας',
  other_income: 'Άλλο έσοδο',
};

const CATEGORY_EN: Record<FinancialCategory, string> = {
  labor: 'Labor',
  fertilizers: 'Fertilizers',
  plant_protection: 'Plant protection',
  fuel_and_energy: 'Fuel and energy',
  irrigation: 'Irrigation',
  equipment_and_tools: 'Equipment and tools',
  transport: 'Transport',
  mill: 'Olive mill',
  collaborator_services: 'Collaborator services',
  land_rent: 'Land rent',
  other_expense: 'Other expense',
  olive_oil_sale: 'Olive oil sale',
  olive_sale: 'Olive sale',
  subsidy: 'Subsidy',
  compensation: 'Compensation',
  service_provision: 'Service provided',
  other_income: 'Other income',
};

const PAYMENT_EL: Record<PaymentMethod, string> = {
  cash: 'Μετρητά',
  bank_transfer: 'Τραπεζική μεταφορά',
  card: 'Κάρτα',
  other: 'Άλλο',
};

const PAYMENT_EN: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  other: 'Other',
};

const isEnglish = (language?: string) => (language || 'el').toLowerCase().startsWith('en');

export function financialCategoryLabel(category: string, language = 'el'): string {
  const key = category as FinancialCategory;
  const map = isEnglish(language) ? CATEGORY_EN : CATEGORY_EL;
  return map[key] || CATEGORY_EL[key] || category;
}

export function financialTypeLabel(type: FinancialTransactionType, language = 'el'): string {
  if (type === 'income') return isEnglish(language) ? 'Income' : 'Έσοδο';
  return isEnglish(language) ? 'Expense' : 'Έξοδο';
}

export function financialTypeHelp(type: FinancialTransactionType, language = 'el'): string {
  if (type === 'income') return isEnglish(language) ? 'Money you received' : 'Χρήματα που πήρες';
  return isEnglish(language) ? 'Money you paid' : 'Χρήματα που πλήρωσες';
}

export function financialStatusLabel(status: FinancialTransactionStatus, language = 'el'): string {
  if (status === 'draft') return isEnglish(language) ? 'Draft' : 'Πρόχειρο';
  if (status === 'void') return isEnglish(language) ? 'Voided' : 'Ακυρωμένο';
  return isEnglish(language) ? 'Posted' : 'Καταχωρημένο';
}

export function financialSourceLabel(source: FinancialTransactionSourceType, language = 'el'): string {
  if (source === 'task') return isEnglish(language) ? 'Task' : 'Εργασία';
  if (source === 'harvest') return isEnglish(language) ? 'Harvest' : 'Συγκομιδή';
  if (source === 'service') return isEnglish(language) ? 'Service' : 'Υπηρεσία';
  return isEnglish(language) ? 'Manual entry' : 'Χειροκίνητη καταχώρηση';
}

export function paymentMethodLabel(method: string, language = 'el'): string {
  const key = method as PaymentMethod;
  const map = isEnglish(language) ? PAYMENT_EN : PAYMENT_EL;
  return map[key] || method;
}

export function unassignedFieldLabel(language = 'el'): string {
  return isEnglish(language) ? 'General farm' : 'Γενική εκμετάλλευση';
}

export function resultYearHelp(language = 'el'): string {
  return isEnglish(language)
    ? 'The year this entry should count toward.'
    : 'Το έτος στο οποίο θέλεις να υπολογιστεί αυτή η καταχώρηση.';
}

export function categoriesForType(type: FinancialTransactionType): readonly FinancialCategory[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function defaultCategoryForType(type: FinancialTransactionType): FinancialCategory {
  return type === 'income' ? 'olive_oil_sale' : 'labor';
}

export function resultLabel(
  net: number | null | undefined,
  hasPostedRecords: boolean,
  language = 'el'
): string {
  if (!hasPostedRecords || net == null) {
    return isEnglish(language) ? 'There are no entries yet' : 'Δεν υπάρχουν ακόμη καταχωρήσεις';
  }
  if (net > 0) return isEnglish(language) ? 'Profit' : 'Κέρδος';
  if (net < 0) return isEnglish(language) ? 'Loss' : 'Ζημιά';
  return isEnglish(language) ? 'Balanced' : 'Ισοσκελισμένο';
}

export function noMonthEntriesLabel(language = 'el'): string {
  return isEnglish(language) ? 'No entries' : 'Καμία καταχώρηση';
}

export function isRawFinancialValue(text: string): boolean {
  if (!text) return true;
  if (/[Α-ω]/.test(text)) return false;
  if (text.includes('_')) return true;
  return text === text.toLowerCase() && /^(income|expense|draft|posted|void|manual|labor)$/.test(text);
}
