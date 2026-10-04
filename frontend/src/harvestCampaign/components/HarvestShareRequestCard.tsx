import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, HandHelping } from 'lucide-react';
import Button from '../../components/Common/Button';
import { HarvestNumberStepper } from './HarvestNumberInput';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import {
  oilStockService,
  type OilShareSource,
} from '../../services/oilStockService';
import '../HarvestSheets.css';

type Props = {
  fieldIds: string[];
  source: OilShareSource;
  onSubmitted?: () => void;
};

export function HarvestShareRequestCard({ fieldIds, source, onSubmitted }: Props) {
  const { t, i18n } = useTranslation(['fields', 'myOil']);
  const [tin16, setTin16] = useState(0);
  const [tin17, setTin17] = useState(0);
  const [bulk, setBulk] = useState(0);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const packLabels = useMemo(
    () => ({
      tin: (count: number, size: number) => t('myOil:tin', { count, size }),
      bulk: (amount: number) =>
        t('myOil:bulk', { amount: formatOilNumber(amount, i18n.language) }),
      litres: (amount: number) =>
        t('myOil:litres', { amount: formatOilNumber(amount, i18n.language) }),
    }),
    [t, i18n.language]
  );

  const freeLine = formatOilPack(source.available, packLabels);
  const canSubmit = tin16 > 0 || tin17 > 0 || bulk > 0.05;
  const tinSuffix = t('harvestCampaign.oil.tinSuffix');

  // Almost every ask is "one or two tins". Only the rare exact amount needs the steppers.
  const quickCounts = [1, 2].filter((count) => source.available.tin17 >= count);
  const pickQuick = (count: number) => {
    setTin16(0);
    setTin17(count);
    setBulk(0);
    setCustom(false);
  };
  const quickPicked = (count: number) =>
    !custom && tin17 === count && tin16 === 0 && bulk <= 0.05;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await oilStockService.createShareRequest({
        fieldIds,
        requested: { tin16, tin17, bulkLitres: bulk },
      });
      setDone(true);
      setTin16(0);
      setTin17(0);
      setBulk(0);
      setCustom(false);
      onSubmitted?.();
      window.setTimeout(() => setDone(false), 4200);
    } catch {
      setError(t('harvestCampaign.shareRequest.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="hc-share-request" aria-labelledby="hc-share-request-title">
      <header className="hc-share-request__head">
        <span className="hc-action-icon" aria-hidden>
          <HandHelping size={18} strokeWidth={1.75} />
        </span>
        <div>
          <p className="hc-kicker">{t('harvestCampaign.shareRequest.from', {
            name: source.fromDisplayName || t('harvestCampaign.shareRequest.admin'),
          })}</p>
          <h3 id="hc-share-request-title">{t('harvestCampaign.shareRequest.title')}</h3>
          {freeLine ? (
            <p className="hc-share-request__free">
              <Droplets size={14} strokeWidth={1.75} aria-hidden />
              <span>{t('harvestCampaign.shareRequest.free', { pack: freeLine })}</span>
            </p>
          ) : null}
        </div>
      </header>

      {done ? (
        <p className="hc-share-request__ok" role="status">
          {t('harvestCampaign.shareRequest.sent')}
        </p>
      ) : (
        <div className="hc-form">
          <div className="hc-share-request__chips" role="group" aria-label={t('harvestCampaign.shareRequest.title')}>
            {quickCounts.map((count) => (
              <button
                key={count}
                type="button"
                className={`hc-chip${quickPicked(count) ? ' is-on' : ''}`}
                onClick={() => pickQuick(count)}
              >
                {t('harvestCampaign.shareRequest.quickTins', { tins: count })}
              </button>
            ))}
            <button
              type="button"
              className={`hc-chip${custom ? ' is-on' : ''}`}
              onClick={() => setCustom((v) => !v)}
            >
              {t('harvestCampaign.shareRequest.custom')}
            </button>
          </div>

          {custom ? (
            <>
              <HarvestNumberStepper
                label={t('harvestCampaign.shareRequest.tin16')}
                value={tin16}
                onChange={(next) =>
                  setTin16(Math.max(0, Math.min(source.available.tin16, Math.round(next))))
                }
                min={0}
                suffix={tinSuffix}
              />
              <HarvestNumberStepper
                label={t('harvestCampaign.shareRequest.tin17')}
                value={tin17}
                onChange={(next) =>
                  setTin17(Math.max(0, Math.min(source.available.tin17, Math.round(next))))
                }
                min={0}
                suffix={tinSuffix}
              />
              <HarvestNumberStepper
                label={t('harvestCampaign.shareRequest.bulk')}
                value={bulk}
                onChange={(next) =>
                  setBulk(
                    Math.max(0, Math.min(source.available.bulkLitres, Math.round(next * 10) / 10))
                  )
                }
                min={0}
                step={0.1}
                suffix="L"
              />
            </>
          ) : null}
          {error ? <p className="hc-share-request__err">{error}</p> : null}
          <div className="hc-share-request__actions">
            <Button variant="primary" disabled={busy || !canSubmit} onClick={() => void submit()}>
              {t('harvestCampaign.shareRequest.submit')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
