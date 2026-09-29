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
  type CommitmentFilter,
} from '../../myOil/commitmentCopy';
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
  onDeliver: (c: OilCommitment) => void;
  onCancel: (c: OilCommitment) => void;
  onGive: () => void;
};

export function CommitmentsTab({
  open,
  closed = [],
  lots,
  fieldNames,
  busy,
  packLabels,
  formatDate,
  onDeliver,
  onCancel,
  onGive,
}: Props) {
  const { t } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const [filter, setFilter] = useState<CommitmentFilter>('all');
  const [detail, setDetail] = useState<OilCommitment | null>(null);

  const delivered = useMemo(
    () =>
      closed.length
        ? closed
        : [...open, ...closed].filter((c) => c.derivedStatus === 'delivered' || c.cancelled),
    [open, closed]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return open;
    if (filter === 'held') return open.filter((c) => c.derivedStatus === 'reserved');
    if (filter === 'pending') return open.filter((c) => c.derivedStatus === 'pending_delivery');
    return delivered;
  }, [filter, open, delivered]);

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

  const lotLines = (c: OilCommitment) =>
    c.allocations
      .map((a) => {
        const lot = lots.find((l) => l.id === a.oilLotId);
        if (!lot) return null;
        const where = lot.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');
        return `${formatDate(lot.pressedOn)}${where ? ` · ${where}` : ''}`;
      })
      .filter(Boolean) as string[];

  const filters: CommitmentFilter[] = ['all', 'held', 'pending', 'delivered'];

  return (
    <View>
      <View style={styles.chipsRow} accessibilityRole="tablist">
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chipFilter, filter === f && styles.chipFilterOn]}
          >
            <Text style={[styles.chipFilterText, filter === f && styles.chipFilterTextOn]}>
              {t(`commitments.filters.${f}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.panel}>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {filter === 'delivered'
                ? t('commitments.emptyDeliveredTitle')
                : t('commitments.emptyTitle')}
            </Text>
            {filter !== 'delivered' ? (
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
          {filtered.map((c) => (
            <Pressable key={c.id} style={styles.holdCard} onPress={() => setDetail(c)}>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <Text style={styles.waitingName} numberOfLines={1}>
                  {(c.counterpartyName || '').trim() ||
                    t('commitments.unnamedHold', { defaultValue: t('commitments.unnamed') })}
                </Text>
                <Text style={styles.waitingPack}>
                  {formatOilPack(
                    c.derivedStatus === 'delivered' ? c.requested : c.remaining,
                    packLabels
                  )}
                </Text>
                <Text style={styles.waitingStory} numberOfLines={1}>
                  {storyFor(c)}
                </Text>
              </View>
              {c.derivedStatus !== 'delivered' && !c.cancelled ? (
                <Pressable
                  disabled={busy}
                  onPress={() => onDeliver(c)}
                  style={[styles.btnPrimary, styles.btnSm, busy && styles.btnPrimaryDisabled]}
                >
                  <Text style={styles.btnPrimaryText}>{t(deliverButtonKey(c))}</Text>
                </Pressable>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        edge="end"
        size="lg"
        accent
        title={
          detail
            ? (detail.counterpartyName || '').trim() ||
              t('commitments.unnamedHold', { defaultValue: t('commitments.unnamed') })
            : undefined
        }
        subtitle={
          detail
            ? formatOilPack(
                detail.derivedStatus === 'delivered' ? detail.requested : detail.remaining,
                packLabels
              )
            : undefined
        }
        icon={<Ionicons name="bookmark-outline" size={18} color={colors.primary} />}
        footer={
          detail ? (
            <View style={styles.footerRow}>
              <Pressable onPress={() => setDetail(null)} style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>{t('cancel')}</Text>
              </Pressable>
              {detail.derivedStatus !== 'delivered' && !detail.cancelled ? (
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
            {detail.derivedStatus !== 'delivered' ? (
              <Text style={styles.waitingStory}>{t('commitments.notDeliveredYet')}</Text>
            ) : (
              <Text style={styles.waitingStory}>{t('commitments.delivered')}</Text>
            )}
            {lotLines(detail).length > 0 ? (
              <>
                <Text style={styles.flowStep}>{t('commitments.fromLots')}</Text>
                {lotLines(detail).map((line) => (
                  <Text key={line} style={styles.flowListItem}>
                    · {line}
                  </Text>
                ))}
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
