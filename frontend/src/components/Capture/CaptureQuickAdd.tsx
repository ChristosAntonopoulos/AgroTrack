import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  Camera,
  CheckSquare,
  ChevronRight,
  Cylinder,
  Droplets,
  Plus,
  FileText,
  HandCoins,
  Mic,
  Ruler,
  StickyNote,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { HARVEST_ACTION_ICONS } from '../../harvestCampaign/harvestActions';
import { PRODUCTION_KINDS, type CaptureMove } from '../../capture/menu';
import type { Field } from '../../services/fieldService';
import CaptureContextChips from './CaptureContextChips';

const warehouseTitleKey = {
  add: 'add',
  give: 'give',
  sell: 'sell',
  hold: 'hold',
  fill: 'fillTins',
  count: 'count',
} as const;

type Props = {
  moves: CaptureMove[];
  fields: Field[];
  fieldId: string;
  occurredAtLocal: string;
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (localDateTime: string) => void;
  onPick: (move: CaptureMove) => void;
  onMore: () => void;
  /** Optional one-line hints keyed by move id (e.g. pending sacks). */
  hints?: Partial<Record<string, string>>;
};

const CaptureQuickAdd: React.FC<Props> = ({
  moves,
  fields,
  fieldId,
  occurredAtLocal,
  onFieldChange,
  onOccurredAtChange,
  onPick,
  onMore,
  hints,
}) => {
  const { t } = useTranslation(['capture', 'fields', 'myOil']);

  const copyOf = (move: CaptureMove): { title: string; domain: string } => {
    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') {
        return {
          title: t('capture:types.oilSale.title'),
          domain: t('capture:quickDomain.money'),
        };
      }
      if (move.id === 'payment') {
        return {
          title: t('capture:types.payment.title'),
          domain: t('capture:quickDomain.money'),
        };
      }
      return {
        title: t(`capture:types.${move.type}.title`),
        domain: t(
          `capture:quickDomain.${move.type === 'expense' || move.type === 'income' ? 'money' : 'grove'}`
        ),
      };
    }
    if (move.surface === 'money') {
      return {
        title: t('capture:types.money.title'),
        domain: t('capture:quickDomain.money'),
      };
    }
    if (move.surface === 'harvest') {
      const title = PRODUCTION_KINDS.includes(move.kind)
        ? t(`fields:harvestCampaign.addMenu.title.${move.kind}`)
        : t(`fields:harvestCampaign.actions.${move.kind}`);
      return {
        title,
        domain: t('capture:quickDomain.harvest'),
      };
    }
    return {
      title: t(`myOil:actions.${warehouseTitleKey[move.action]}`),
      domain: t('capture:quickDomain.warehouse'),
    };
  };

  const iconOf = (move: CaptureMove) => {
    if (move.surface === 'harvest') {
      if (move.kind === 'income') return <TrendingUp size={26} strokeWidth={2.1} />;
      if (move.kind === 'expense') return <TrendingDown size={26} strokeWidth={2.1} />;
      const Icon = HARVEST_ACTION_ICONS[move.kind];
      return <Icon size={26} strokeWidth={2.1} />;
    }
    if (move.surface === 'warehouse') {
      if (move.action === 'add') return <Plus size={26} strokeWidth={2.1} />;
      if (move.action === 'give') return <Droplets size={26} strokeWidth={2.1} />;
      if (move.action === 'sell') return <HandCoins size={26} strokeWidth={2.1} />;
      if (move.action === 'hold') return <Bookmark size={26} strokeWidth={2.1} />;
      if (move.action === 'fill') return <Cylinder size={26} strokeWidth={2.1} />;
      return <Ruler size={26} strokeWidth={2.1} />;
    }
    if (move.id === 'oil_sale') return <Droplets size={26} strokeWidth={2.1} />;
    if (move.id === 'payment') return <HandCoins size={26} strokeWidth={2.1} />;
    if (move.surface === 'money' || move.type === 'money') return <Wallet size={26} strokeWidth={2.1} />;
    if (move.type === 'income') return <TrendingUp size={26} strokeWidth={2.1} />;
    if (move.type === 'expense') return <TrendingDown size={26} strokeWidth={2.1} />;
    if (move.type === 'work') return <CheckSquare size={26} strokeWidth={2.1} />;
    if (move.type === 'photo') return <Camera size={26} strokeWidth={2.1} />;
    if (move.type === 'voice') return <Mic size={26} strokeWidth={2.1} />;
    if (move.type === 'document') return <FileText size={26} strokeWidth={2.1} />;
    return <StickyNote size={26} strokeWidth={2.1} />;
  };

  const toneOf = (move: CaptureMove): string => {
    if (move.surface === 'harvest') {
      if (move.kind === 'expense') return 'is-expense';
      if (move.kind === 'income') return 'is-income';
      return 'is-harvest';
    }
    if (move.surface === 'warehouse') return 'is-warehouse';
    if (move.id === 'oil_sale') return 'is-income';
    if (move.id === 'payment') return 'is-expense';
    if (move.surface === 'money' || move.type === 'money') return 'is-money';
    if (move.type === 'income') return 'is-income';
    if (move.type === 'expense') return 'is-expense';
    if (move.type === 'work') return 'is-work';
    if (move.type === 'photo' || move.type === 'observation') return 'is-note';
    return 'is-note';
  };

  return (
    <div className="capture-quick">
      <p className="capture-quick-prompt">{t('capture:whatToRecord')}</p>

      <CaptureContextChips
        fields={fields}
        fieldId={fieldId}
        occurredAtLocal={occurredAtLocal}
        onFieldChange={onFieldChange}
        onOccurredAtChange={onOccurredAtChange}
      />

      {moves.length === 0 ? (
        <div className="capture-tab-empty">
          <p>{t('capture:tabLocked')}</p>
        </div>
      ) : (
        <div className="capture-quick-grid">
          {moves.map((move) => {
            const copy = copyOf(move);
            const hint = hints?.[move.id];
            return (
              <button
                key={move.id}
                type="button"
                className={`capture-quick-tile ${toneOf(move)}`}
                onClick={() => onPick(move)}
              >
                <span className="capture-quick-tile-icon" aria-hidden>
                  {iconOf(move)}
                </span>
                <strong className="capture-quick-tile-title">{copy.title}</strong>
                <span className="capture-quick-tile-domain">{hint || copy.domain}</span>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" className="capture-quick-more" onClick={onMore}>
        <span>{t('capture:allRecords')}</span>
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
};

export default CaptureQuickAdd;
