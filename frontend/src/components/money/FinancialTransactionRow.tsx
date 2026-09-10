import React from 'react';
import { Droplets, Fuel, Sprout, Wheat, Wallet } from 'lucide-react';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import {
  financialCategoryLabel,
  financialStatusLabel,
  isRawFinancialValue,
  unassignedFieldLabel,
} from '../../finance/display';
import { formatOfficialAmount } from '../../finance/format';
import { formatQuantityLine } from '../../finance/moneyUi';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import './Money.css';

type Props = {
  item: FinancialTransaction;
  locale: string;
  fieldNames: Record<string, string>;
  relatedLabel?: string;
  onOpen: (id: string) => void;
};

const iconFor = (category?: string) => {
  if (category === 'fuel_and_energy') return Fuel;
  if (category === 'fertilizers') return Sprout;
  if (category === 'olive_oil_sale' || category === 'irrigation') return Droplets;
  if (category === 'labor') return Wheat;
  return Wallet;
};

const FinancialTransactionRow: React.FC<Props> = ({ item, locale, fieldNames, relatedLabel, onOpen }) => {
  const Icon = iconFor(item.category);
  const category = item.category
    ? item.categoryLabel && !isRawFinancialValue(item.categoryLabel)
      ? item.categoryLabel
      : financialCategoryLabel(item.category, locale)
    : null;
  const field = item.fieldId
    ? fieldNames[item.fieldId] || friendlyFieldLabel(item.fieldId)
    : unassignedFieldLabel(locale);
  const qty = formatQuantityLine(item.quantity, item.quantityUnit, item.unitPrice, locale);
  const date = new Date(item.occurredOn).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const sign = item.type === 'income' ? '+' : '−';
  const showStatus = item.status === 'draft' || item.status === 'void';

  return (
    <button type="button" className="transaction-row" onClick={() => onOpen(item.id)}>
      <div>
        <span className="transaction-row-title">
          <Icon size={16} aria-hidden /> {item.description}
        </span>
        <p className="transaction-row-meta">
          {[category, field, relatedLabel].filter(Boolean).join(' · ')}
        </p>
        {qty ? <p className="transaction-row-qty">{qty}</p> : null}
        {showStatus ? (
          <span className="money-status-badge">{financialStatusLabel(item.status, locale)}</span>
        ) : null}
      </div>
      <div>
        <span className={`transaction-row-amount${item.type === 'income' ? ' is-income' : ''}`}>
          {sign}
          {formatOfficialAmount(item.amount, item.currency, locale, '—')}
        </span>
        <span className="transaction-row-date">{date}</span>
      </div>
    </button>
  );
};

export default FinancialTransactionRow;
