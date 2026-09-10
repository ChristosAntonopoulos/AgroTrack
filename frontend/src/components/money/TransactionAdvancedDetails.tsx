import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { paymentMethodLabel, PAYMENT_METHODS, resultYearHelp } from '../../finance/display';

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
  photos: PhotoItem[];
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (id: string) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  showFullPicture: boolean;
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
  photos,
  onAddPhotos,
  onRemovePhoto,
  fileRef,
  showFullPicture,
}) => {
  const { t, i18n } = useTranslation('capture');
  return (
    <div>
      <button type="button" className="money-text-link" onClick={onToggle}>
        {open ? t('less') : t('money.moreDetails')}
      </button>
      {open ? (
        <div className="money-more" style={{ display: 'grid', gap: 18, marginTop: 12 }}>
          {showFullPicture ? (
            <>
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
              <label className="money-form-label">
                {t('money.counterparty')}
                <input value={counterpartyName} onChange={(e) => onCounterparty(e.target.value)} />
              </label>
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
            </>
          ) : null}
          <label className="money-form-label">
            {t('money.notes')}
            <textarea rows={2} value={notes} onChange={(e) => onNotes(e.target.value)} />
          </label>
          <label className="money-form-label">
            {t('money.resultYearLabel')}
            <input
              type="number"
              min={2000}
              max={2100}
              value={resultYear}
              onChange={(e) => onResultYear(Number(e.target.value))}
            />
            <span className="capture-hint">{resultYearHelp(i18n.language)}</span>
          </label>
        </div>
      ) : null}
    </div>
  );
};

export default TransactionAdvancedDetails;
