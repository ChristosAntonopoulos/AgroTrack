import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import EmptyState from '../Common/EmptyState';
import { CreateHarvestInput, HarvestRecord } from '../../services/harvestService';
import './AddCostSheet.css';
import './FieldCostsPanel.css';

type Props = {
  fieldId: string;
  records: HarvestRecord[];
  canAdd: boolean;
  onCreate: (input: CreateHarvestInput) => Promise<void>;
};

const FieldHarvestPanel: React.FC<Props> = ({ fieldId, records, canAdd, onCreate }) => {
  const { t, i18n } = useTranslation(['fields', 'common']);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [harvestDate, setHarvestDate] = useState('');
  const [oliveKg, setOliveKg] = useState('');
  const [oilKg, setOilKg] = useState('');
  const [workers, setWorkers] = useState('');
  const [method, setMethod] = useState('');
  const [millName, setMillName] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [millCost, setMillCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const olives = Number(oliveKg.replace(',', '.'));
    if (!Number.isFinite(olives) || olives <= 0) {
      setError(t('fields:harvest.oliveRequired'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const sale = Number(saleAmount.replace(',', '.'));
      const mill = Number(millCost.replace(',', '.'));
      const oil = Number(oilKg.replace(',', '.'));
      await onCreate({
        fieldId,
        harvestDate: harvestDate ? new Date(harvestDate).toISOString() : undefined,
        oliveKg: olives,
        oilKg: Number.isFinite(oil) && oil > 0 ? oil : undefined,
        workersUsed: Number(workers) || 0,
        harvestMethod: method.trim() || undefined,
        millName: millName.trim() || undefined,
        saleAmount: Number.isFinite(sale) && sale > 0 ? sale : undefined,
        millCost: Number.isFinite(mill) && mill > 0 ? mill : undefined,
        notes: notes.trim() || undefined,
      });
      setHarvestDate('');
      setOliveKg('');
      setOilKg('');
      setWorkers('');
      setMethod('');
      setMillName('');
      setSaleAmount('');
      setMillCost('');
      setNotes('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="field-costs">
      <header className="field-costs-header">
        <div>
          <h2>{t('fields:harvest.title')}</h2>
        </div>
        {canAdd ? (
          <Button variant={open ? 'outline' : 'primary'} onClick={() => setOpen((value) => !value)}>
            {open ? t('common:close') : t('fields:harvest.add')}
          </Button>
        ) : null}
      </header>

      {canAdd && open ? (
        <form className="add-cost-sheet" onSubmit={handleSubmit}>
          <label className="add-cost-sheet-field">
            <span>{t('fields:harvest.date')}</span>
            <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
          </label>
          <div className="add-cost-sheet-row">
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.oliveKg')}</span>
              <input type="number" min="0" step="0.01" value={oliveKg} onChange={(e) => setOliveKg(e.target.value)} />
            </label>
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.oilKg')}</span>
              <input type="number" min="0" step="0.01" value={oilKg} onChange={(e) => setOilKg(e.target.value)} />
            </label>
          </div>
          <div className="add-cost-sheet-row">
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.workers')}</span>
              <input type="number" min="0" step="1" value={workers} onChange={(e) => setWorkers(e.target.value)} />
            </label>
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.method')}</span>
              <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} />
            </label>
          </div>
          <div className="add-cost-sheet-row">
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.millName')}</span>
              <input type="text" value={millName} onChange={(e) => setMillName(e.target.value)} />
            </label>
            <label className="add-cost-sheet-field">
              <span>{t('fields:harvest.millCost')}</span>
              <input type="number" min="0" step="0.01" value={millCost} onChange={(e) => setMillCost(e.target.value)} />
            </label>
          </div>
          <label className="add-cost-sheet-field">
            <span>{t('fields:harvest.saleAmount')}</span>
            <input type="number" min="0" step="0.01" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
          </label>
          <label className="add-cost-sheet-field">
            <span>{t('fields:harvest.notes')}</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error ? <p className="add-cost-sheet-error">{error}</p> : null}
          <Button type="submit" variant="primary" loading={submitting} fullWidth>
            {t('fields:harvest.save')}
          </Button>
        </form>
      ) : null}

      {records.length === 0 ? (
        <EmptyState title={t('fields:harvest.emptyTitle')} description={t('fields:harvest.emptyHint')} />
      ) : (
        <ul className="field-costs-list">
          {records.map((record) => (
            <li key={record.id} className="field-costs-item">
              <div>
                <div className="field-costs-item-title">
                  {record.oliveKg} kg
                  {record.oilKg ? ` · ${record.oilKg} kg oil` : ''}
                </div>
                <div className="field-costs-item-meta">
                  {new Date(record.harvestDate).toLocaleDateString(i18n.language)}
                  {record.millName ? ` · ${record.millName}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default FieldHarvestPanel;
