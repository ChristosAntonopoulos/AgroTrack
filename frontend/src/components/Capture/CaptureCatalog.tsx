import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  Camera,
  CheckSquare,
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
import type { HarvestCaptureKind } from '../../harvestCampaign/types';
import {
  PRODUCTION_KINDS,
  type CaptureMenuGroup,
  type CaptureMove,
} from '../../capture/menu';
import { catalogSectionOrder, type CatalogSectionId } from '../../capture/quickAdd';
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

const SECTION_KEY: Record<string, string> = {
  day: 'catalogSections.harvest',
  grove: 'catalogSections.grove',
  money: 'catalogSections.money',
  warehouse: 'catalogSections.warehouse',
};

type Props = {
  groups: CaptureMenuGroup[];
  harvestHint?: Partial<Record<HarvestCaptureKind, string>>;
  fields: Field[];
  fieldId: string;
  occurredAtLocal: string;
  recentIds?: readonly string[];
  /** On Χρήματα, expense/income ids belong to money, not the harvest day. */
  preferMoneyMoves?: boolean;
  onFieldChange: (id: string) => void;
  onOccurredAtChange: (localDateTime: string) => void;
  onPick: (move: CaptureMove) => void;
};

const CaptureCatalog: React.FC<Props> = ({
  groups,
  harvestHint,
  fields,
  fieldId,
  occurredAtLocal,
  recentIds = [],
  preferMoneyMoves = false,
  onFieldChange,
  onOccurredAtChange,
  onPick,
}) => {
  const { t } = useTranslation(['capture', 'fields', 'myOil']);
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const allMoves = useMemo(() => {
    const map = new Map<string, CaptureMove>();
    for (const group of groups) {
      for (const move of group.moves) {
        const existing = map.get(move.id);
        if (!existing) {
          map.set(move.id, move);
          continue;
        }
        if (preferMoneyMoves && existing.surface === 'harvest' && move.surface === 'capture') {
          map.set(move.id, move);
        }
      }
    }
    return map;
  }, [groups, preferMoneyMoves]);

  const recentMoves = useMemo(() => {
    const picked: CaptureMove[] = [];
    const seen = new Set<string>();
    for (const id of recentIds) {
      if (seen.has(id)) continue;
      const move = allMoves.get(id);
      if (!move) continue;
      seen.add(id);
      picked.push(move);
      if (picked.length >= 3) break;
    }
    return picked;
  }, [recentIds, allMoves]);

  const copyOf = (move: CaptureMove): { title: string; description: string } => {
    if (move.surface === 'capture') {
      if (move.id === 'oil_sale') {
        return {
          title: t('capture:types.oilSale.title'),
          description: t('capture:types.oilSale.description'),
        };
      }
      if (move.id === 'payment') {
        return {
          title: t('capture:types.payment.title'),
          description: t('capture:types.payment.description'),
        };
      }
      return {
        title: t(`capture:types.${move.type}.title`),
        description: t(`capture:types.${move.type}.description`),
      };
    }
    if (move.surface === 'money') {
      return {
        title: t('capture:types.money.title'),
        description: t('capture:types.money.description'),
      };
    }
    if (move.surface === 'harvest') {
      const title = PRODUCTION_KINDS.includes(move.kind)
        ? t(`fields:harvestCampaign.addMenu.title.${move.kind}`)
        : t(`fields:harvestCampaign.actions.${move.kind}`);
      return {
        title,
        description: harvestHint?.[move.kind] || t(`fields:harvestCampaign.actionHint.${move.kind}`),
      };
    }
    return {
      title: t(`myOil:actions.${warehouseTitleKey[move.action]}`),
      description: t(`capture:warehouseHint.${move.action}`),
    };
  };

  const iconOf = (move: CaptureMove) => {
    if (move.surface === 'harvest') {
      if (move.kind === 'income') return <TrendingUp size={18} strokeWidth={2.25} />;
      if (move.kind === 'expense') return <TrendingDown size={18} strokeWidth={2.25} />;
      const Icon = HARVEST_ACTION_ICONS[move.kind];
      return <Icon size={18} strokeWidth={2.25} />;
    }
    if (move.surface === 'warehouse') {
      if (move.action === 'add') return <Plus size={18} strokeWidth={2.25} />;
      if (move.action === 'give') return <Droplets size={18} strokeWidth={2.25} />;
      if (move.action === 'sell') return <HandCoins size={18} strokeWidth={2.25} />;
      if (move.action === 'hold') return <Bookmark size={18} strokeWidth={2.25} />;
      if (move.action === 'fill') return <Cylinder size={18} strokeWidth={2.25} />;
      return <Ruler size={18} strokeWidth={2.25} />;
    }
    if (move.id === 'oil_sale') return <Droplets size={18} strokeWidth={2.25} />;
    if (move.id === 'payment') return <HandCoins size={18} strokeWidth={2.25} />;
    if (move.surface === 'money' || move.type === 'money') return <Wallet size={18} strokeWidth={2.25} />;
    if (move.type === 'income') return <TrendingUp size={18} strokeWidth={2.25} />;
    if (move.type === 'expense') return <TrendingDown size={18} strokeWidth={2.25} />;
    if (move.type === 'work') return <CheckSquare size={18} strokeWidth={2.25} />;
    if (move.type === 'photo') return <Camera size={18} strokeWidth={2.25} />;
    if (move.type === 'voice') return <Mic size={18} strokeWidth={2.25} />;
    if (move.type === 'document') return <FileText size={18} strokeWidth={2.25} />;
    return <StickyNote size={18} strokeWidth={2.25} />;
  };

  const toneOf = (move: CaptureMove): string => {
    if (move.surface === 'harvest') {
      if (move.kind === 'income') return 'is-income';
      if (move.kind === 'expense') return 'is-expense';
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
    if (move.type === 'voice') return 'is-voice';
    if (move.type === 'document') return 'is-doc';
    return 'is-note';
  };

  const tile = (move: CaptureMove) => {
    const copy = copyOf(move);
    const featured = 'featured' in move && Boolean(move.featured);
    return (
      <button
        key={move.id}
        type="button"
        className={`capture-catalog-tile ${toneOf(move)}${featured ? ' is-next' : ''}`}
        onClick={() => onPick(move)}
        title={copy.description}
        aria-label={copy.description ? `${copy.title}. ${copy.description}` : copy.title}
      >
        <span className="capture-catalog-tile-icon" aria-hidden>
          {iconOf(move)}
        </span>
        <strong className="capture-catalog-tile-title">{copy.title}</strong>
      </button>
    );
  };

  return (
    <div className="capture-catalog">
      <CaptureContextChips
        fields={fields}
        fieldId={fieldId}
        occurredAtLocal={occurredAtLocal}
        onFieldChange={onFieldChange}
        onOccurredAtChange={onOccurredAtChange}
      />

      {recentMoves.length > 0 ? (
        <section className="capture-catalog-section">
          <h3 className="capture-catalog-section-title">{t('capture:recentSection')}</h3>
          <div className="capture-catalog-grid">
            {recentMoves.map((move) => tile(move))}
          </div>
        </section>
      ) : null}

      {(preferMoneyMoves
        ? (['money', ...catalogSectionOrder().filter((id) => id !== 'money')] as CatalogSectionId[])
        : catalogSectionOrder()
      ).map((sectionId) => {
        const group = byId.get(sectionId) || { id: sectionId, moves: [] as CaptureMove[] };

        if (group.moves.length === 0) return null;

        return (
          <section key={sectionId} className="capture-catalog-section">
            <h3 className="capture-catalog-section-title">{t(`capture:${SECTION_KEY[sectionId]}`)}</h3>
            <div className="capture-catalog-grid">{group.moves.map((m) => tile(m))}</div>
          </section>
        );
      })}
    </div>
  );
};

export default CaptureCatalog;
