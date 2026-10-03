import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilPack } from '../../myOil/formatOilPack';
import {
  commitmentStoryKey,
  deliverButtonKey,
  type CommitmentView,
} from '../../myOil/commitmentCopy';
import { commitmentFieldLabel } from '../../myOil/fieldPools';
import type { OilCommitment, OilLot } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: OilCommitment[];
  closed?: OilCommitment[];
  lots: OilLot[];
  fieldNames: Record<string, string>;
  busy: boolean;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
  /** Commitment ids that need action soon — floated to the top of waiting. */
  urgentIds?: string[];
  onDeliver: (c: OilCommitment) => void;
  onCancel: (c: OilCommitment) => void;
  onGive: () => void;
};

type Pill = 'waiting' | 'paid' | 'delivered' | 'held' | 'unpaid';

const isOpen = (c: OilCommitment) =>
  !c.cancelled && c.derivedStatus !== 'delivered' && c.derivedStatus !== 'cancelled';

const isPaid = (c: OilCommitment) =>
  c.isSale && ((c.amount != null && c.amount > 0) || Boolean(c.financialTransactionId));

const pillFor = (c: OilCommitment): Pill => {
  if (isOpen(c) && c.derivedStatus === 'pending_delivery') return 'waiting';
  if (c.isSale && !isPaid(c)) return 'unpaid';
  if (!isOpen(c) && isPaid(c)) return 'paid';
  if (!isOpen(c)) return 'delivered';
  return 'held';
};

const PILL_KEY: Record<Pill, string> = {
  waiting: 'where.waitingPill',
  paid: 'where.paid',
  delivered: 'commitments.delivered',
  held: 'commitments.held',
  unpaid: 'hero.unpaid',
};

/**
 * Where the oil went: kind (all / held / sold) and whether it is still waiting or already handed over.
 */
export function CommitmentsTab({
  open,
  closed = [],
  lots,
  fieldNames,
  busy,
  packLabels,
  formatDate,
  urgentIds = [],
  onDeliver,
  onCancel,
  onGive,
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [view, setView] = useState<CommitmentView>('all');
  const [detail, setDetail] = useState<OilCommitment | null>(null);

  const urgent = useMemo(() => new Set(urgentIds), [urgentIds]);

  const shortDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filtered = useMemo(() => {
    const pool = [...open, ...closed].filter((c) => !c.cancelled);
    const rows = pool.filter((c) => {
      if (view === 'waiting') return isOpen(c);
      if (view === 'delivered') return c.derivedStatus === 'delivered';
      if (view === 'unpaid') return c.isSale && !isPaid(c);
      return true;
    });
    return [...rows].sort((a, b) => {
      const rank = Number(isOpen(b)) - Number(isOpen(a));
      if (rank !== 0) return rank;
      const urgentRank = Number(urgent.has(b.id)) - Number(urgent.has(a.id));
      if (urgentRank !== 0) return urgentRank;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [view, open, closed, urgent]);

  const storyFor = (c: OilCommitment) => {
    const key = commitmentStoryKey(c);
    if (key === 'heldForDate' && c.promisedFor) {
      return t('story.heldForDate', { date: formatDate(c.promisedFor) });
    }
    if (key === 'heldForSomeone') {
      return t('story.heldForSomeone', { name: c.counterpartyName });
    }
    return t(`story.${key}`);
  };

  const placeFor = (c: OilCommitment) =>
    commitmentFieldLabel(c.allocations, lots, fieldNames, t('lots.noField'));

  const nameFor = (c: OilCommitment) =>
    (c.counterpartyName || '').trim() || t('give.unnamed');

  const views: CommitmentView[] = ['all', 'waiting', 'delivered', 'unpaid'];

  return (
    <View>
      <View style={styles.kindRow} accessibilityRole="tablist">
        {views.map((id) => {
          const on = view === id;
          return (
            <Pressable
              key={id}
              onPress={() => setView(id)}
              style={[styles.kindChip, on && styles.kindChipOn]}
            >
              <Text style={[styles.kindChipText, on && styles.kindChipTextOn]}>
                {t(`commitments.filters.${id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.panel}>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {view === 'delivered'
                ? t('commitments.emptyDeliveredTitle')
                : t('commitments.emptyTitle')}
            </Text>
            {view === 'all' || view === 'waiting' ? (
              <>
                <Text style={styles.emptyBody}>{t('commitments.emptyBody')}</Text>
                <Pressable
                  onPress={onGive}
                  style={[styles.btnPrimary, styles.btnSm, { marginTop: 12, alignSelf: 'flex-start' }]}
                >
                  <Text style={styles.btnPrimaryText}>{t('commitments.emptyCta')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.waiting}>
          {filtered.map((c) => {
            const place = placeFor(c);
            const pill = pillFor(c);
            const openRow = isOpen(c);
            const calm = pill === 'paid' || pill === 'delivered';
            return (
              <Pressable
                key={c.id}
                style={[styles.whereCard, urgent.has(c.id) && openRow && styles.holdCardUrgent]}
                onPress={() => setDetail(c)}
              >
                <View style={styles.whereTop}>
                  <View style={styles.whereIcon}>
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.holdCardTop}>
                      <Text style={styles.waitingName} numberOfLines={1}>
                        {nameFor(c)}
                      </Text>
                      <Text style={styles.holdPack} numberOfLines={1}>
                        {formatOilPack(openRow ? c.remaining : c.requested, packLabels)}
                      </Text>
                    </View>
                    {place ? (
                      <Text style={styles.whereMeta} numberOfLines={1}>
                        {place}
                      </Text>
                    ) : null}
                    <Text style={styles.whereMeta}>{shortDate(c.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.whereFoot}>
                  <View style={[styles.statusPill, calm ? styles.statusPillOk : styles.statusPillWait]}>
                    <Text style={[styles.statusPillText, calm ? styles.statusPillTextOk : styles.statusPillTextWait]}>
                      {t(PILL_KEY[pill])}
                    </Text>
                  </View>
                  {openRow ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => onDeliver(c)}
                      style={[styles.holdDeliver, busy && styles.btnPrimaryDisabled]}
                      hitSlop={6}
                    >
                      <Text style={styles.holdDeliverText}>{t(deliverButtonKey(c))}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        edge="end"
        size="lg"
        accent
        title={detail ? nameFor(detail) : undefined}
        subtitle={
          detail
            ? formatOilPack(isOpen(detail) ? detail.remaining : detail.requested, packLabels)
            : undefined
        }
        icon={<Ionicons name="bookmark-outline" size={18} color={colors.primary} />}
        footer={
          detail ? (
            <View style={styles.footerRow}>
              <Pressable onPress={() => setDetail(null)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
              </Pressable>
              {isOpen(detail) ? (
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    const active = detail;
                    setDetail(null);
                    onDeliver(active);
                  }}
                  style={[styles.btnPrimary, busy && styles.btnPrimaryDisabled]}
                >
                  <Text style={styles.btnPrimaryText}>{t(deliverButtonKey(detail))}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
      >
        {detail ? (
          <View style={styles.flow}>
            <Text style={styles.waitingStory}>{storyFor(detail)}</Text>
            {detail.isSale && detail.amount != null ? (
              <Text style={styles.waitingStory}>
                {t('commitments.paidOn', { date: formatDate(detail.createdAt) })}
              </Text>
            ) : null}
            {isOpen(detail) ? (
              <Text style={styles.waitingStory}>{t('commitments.notDeliveredYet')}</Text>
            ) : (
              <Text style={styles.waitingStory}>{t('commitments.delivered')}</Text>
            )}
            {placeFor(detail) ? (
              <>
                <Text style={styles.flowStep}>{t('commitments.fromLots')}</Text>
                <Text style={styles.flowListItem}>{placeFor(detail)}</Text>
              </>
            ) : null}
            {detail.derivedStatus === 'reserved' && !detail.cancelled ? (
              <Pressable
                style={styles.linkish}
                onPress={() => {
                  const active = detail;
                  setDetail(null);
                  onCancel(active);
                }}
              >
                <Text style={styles.linkishText}>{t('commitments.cancelHold')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
