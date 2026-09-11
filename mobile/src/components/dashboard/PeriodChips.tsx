import React from 'react';
import { useTranslation } from 'react-i18next';
import FilterChips from '../ui/FilterChips';

export interface PeriodChipsProps {
  period: 'today' | 'week' | 'month';
  onChange: (period: 'today' | 'week' | 'month') => void;
  /** @deprecated Kept for call-site compatibility; FilterChips owns height. */
  tapMin?: number;
}

/** Dashboard period selector — thin wrapper over shared FilterChips. */
const PeriodChips: React.FC<PeriodChipsProps> = ({ period, onChange }) => {
  const { t } = useTranslation('dashboard');
  const options: Array<'today' | 'week' | 'month'> = ['today', 'week', 'month'];

  return (
    <FilterChips
      wrap
      compact
      selected={period}
      onSelect={onChange}
      options={options.map((p) => ({
        value: p,
        label: t(`myActions.period.${p}`),
      }))}
      contentStyle={{ marginBottom: 12 }}
    />
  );
};

export default PeriodChips;
