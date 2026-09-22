import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { paymentMethodLabel, PAYMENT_METHODS, resultYearHelp } from '../../finance/display';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import { harvestYearRangeLabel, harvestYearSpan } from '../../finance/harvestYear';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

type PhotoItem = { id: string; file: File; preview: string; url?: string };

type Props = {
  open: boolean;
  onToggle: () => void;
  paymentMethod: string;
  onPaymentMethod: (value: string) => void;
  counterpartyName: string;
  onCounterparty: (value: string) => void;
  notes: string;
  onNotes: (value: string) => void;
  resultYear: number;
  onResultYear: (value: number) => void;
  /** Hide the harvest-year stepper (e.g. oil sale already locked to the campaign year). */
  hideResultYear?: boolean;
  /** Hide Από / προς when the parent already shows a buyer picker (oil sale). */
  hideCounterparty?: boolean;
  photos: PhotoItem[];
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  /** Links / category / other fields that belong under More details. */
  children?: React.ReactNode;
};

const TransactionAdvancedDetails: React.FC<Props> = ({
  open,
  onToggle,
  paymentMethod,
  onPaymentMethod,
  counterpartyName,
  onCounterparty,
  notes,
  onNotes,
  resultYear,
  onResultYear,
  hideResultYear = false,
  hideCounterparty = false,
  photos,
  onAddPhotos,
  onRemovePhoto,
  fileRef,
  children,
}) => {
  const { t, i18n } = useTranslation(['capture', 'money']);
  const currentHarvestYear = agriculturalYearFor(new Date());
  const minYear = 2000;
  const maxYear = currentHarvestYear + 1;
  return (
    <div>
      <button
        type="button"
        className={`money-more-toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{open ? t('less') : t('money:moreDetails', { defaultValue: t('money.moreDetails') })}</span>
        <ChevronDown size={18} aria-hidden />
      </button>
      {open ? (
        <div className="money-more" style={{ display: 'grid', gap: 18, marginTop: 12 }}>
          {children}
          <label className="money-form-label">
            {t('money.paymentMethod')}
            <select value={paymentMethod} onChange={(e) => onPaymentMethod(e.target.value)}>
              <option value="">{t('money.none')}</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method, i18n.language)}
                </option>
              ))}
            </select>
          </label>
          {hideCounterparty ? null : (
            <label className="money-form-label">
              {t('money.counterparty')}
              <input value={counterpartyName} onChange={(e) => onCounterparty(e.target.value)} />
            </label>
          )}
          <div className="capture-photos">
            <div className="capture-photo-row">
              {photos.map((photo) => (
                <div key={photo.id} className="capture-photo-thumb">
                  <img src={photo.preview} alt="" />
                  <button type="button" aria-label={t('photos.remove')} onClick={() => onRemovePhoto(photo.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 5 ? (
                <button type="button" className="capture-add-photo" onClick={() => fileRef.current?.click()}>
                  <Camera size={18} />
                  {t('money.addReceipt')}
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => {
                onAddPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
          <label className="money-form-label">
            {t('money.notes')}
            <textarea rows={2} value={notes} onChange={(e) => onNotes(e.target.value)} />
          </label>
          {hideResultYear ? null : (
            <div className="money-form-label">
              <span>{t('money.resultYearLabel')}</span>
              <div className="money-harvest-year-step" role="group" aria-label={t('money.resultYearLabel')}>
                <button
                  type="button"
                  aria-label={t('money:prevYear')}
                  disabled={resultYear <= minYear}
                  onClick={() => onResultYear(resultYear - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  <strong>{harvestYearSpan(resultYear)}</strong>
                  <em>{harvestYearRangeLabel(resultYear, i18n.language)}</em>
                </span>
                <button
                  type="button"
                  aria-label={t('money:nextYear')}
                  disabled={resultYear >= maxYear}
                  onClick={() => onResultYear(resultYear + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="capture-hint">{resultYearHelp(i18n.language)}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TransactionAdvancedDetails;
