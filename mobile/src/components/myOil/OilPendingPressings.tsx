import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Sheet from '../ui/Sheet';
import { useTheme } from '../../context/ThemeContext';
import { formatOilNumber } from '../../myOil/formatOilPack';
import { OilSectionHeader } from './OilStockChrome';
import type { OilPressing } from '../../services/oilStockService';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  pressings: OilPressing[];
  fieldNames: Record<string, string>;
  busy: boolean;
  onAllocate: (
    pressing: OilPressing,
    allocations: { cellarOwnerUserId: string; litres: number }[]
  ) => void;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const groveLine = (pressing: OilPressing, fieldNames: Record<string, string>) =>
  pressing.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');

/**
 * Oil is at the mill gate but nobody has said whose cellar it goes into — usually because a
 * partner brought the ticket in. The list stays one line per batch; the split opens in a sheet.
 */
export function OilPendingPressings({ pressings, fieldNames, busy, onAllocate }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = pressings.find((p) => p.id === activeId) || null;

  if (pressings.length === 0) return null;

  return (
    <>
      <View style={[styles.panel, styles.panelAction]}>
        <OilSectionHeader
          titleKey="pendingPressings.title"
          introKey="pendingPressings.hint"
          icon="git-branch-outline"
        />
        <View style={styles.byGrove}>
          {pressings.map((pressing) => {
            const groves = groveLine(pressing, fieldNames);
            return (
              <Pressable
                key={pressing.id}
                disabled={busy}
                onPress={() => setActiveId(pressing.id)}
                style={styles.groveCard}
              >
                <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.groveTitle}>
                    {t('litres', { amount: formatOilNumber(pressing.farmerLitres, locale) })}
                  </Text>
                  <Text style={styles.grovePack} numberOfLines={1}>
                    {groves || t('byGrove.unassigned')}
                  </Text>
                  <Text style={styles.groveMeta} numberOfLines={1}>
                    {t('pendingPressings.batch', { batch: pressing.batchId })}
                  </Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{t('pendingPressings.distribute')}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {active ? (
        <AllocatePressingSheet
          pressing={active}
          fieldNames={fieldNames}
          busy={busy}
          onClose={() => setActiveId(null)}
          onSubmit={(allocations) => {
            onAllocate(active, allocations);
            setActiveId(null);
          }}
        />
      ) : null}
    </>
  );
}

function AllocatePressingSheet({
  pressing,
  fieldNames,
  busy,
  onClose,
  onSubmit,
}: {
  pressing: OilPressing;
  fieldNames: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (allocations: { cellarOwnerUserId: string; litres: number }[]) => void;
}) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const locale = i18n.language;
  const [draft, setDraft] = useState<Record<string, string>>({});

  // One tap should be enough for the common case: it is all mine unless the farmer says otherwise.
  useEffect(() => {
    const mine = pressing.candidates.find((c) => c.isYou) || pressing.candidates[0] || null;
    setDraft(
      Object.fromEntries(
        pressing.candidates.map((c) => [
          c.userId,
          c.userId === mine?.userId ? String(pressing.farmerLitres) : '',
        ])
      )
    );
  }, [pressing.id, pressing.candidates, pressing.farmerLitres]);

  const entries = useMemo(
    () =>
      pressing.candidates.map((candidate) => ({
        candidate,
        litres: Math.max(0, Number(draft[candidate.userId]) || 0),
      })),
    [pressing.candidates, draft]
  );

  const taken = round1(entries.reduce((sum, e) => sum + e.litres, 0));
  const left = round1(pressing.farmerLitres - taken);
  const over = left < -0.05;
  const ready = taken > 0.05 && !over;
  const groves = groveLine(pressing, fieldNames);

  return (
    <Sheet
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      edge="end"
      size="md"
      accent
      title={t('pendingPressings.title')}
      subtitle={t('pendingPressings.batch', { batch: pressing.batchId })}
      icon={<Ionicons name="git-branch-outline" size={18} color={colors.primary} />}
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={onClose} disabled={busy} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{t('sheet.cancel')}</Text>
          </Pressable>
          <Pressable
            disabled={busy || !ready}
            onPress={() =>
              onSubmit(
                entries
                  .filter((e) => e.litres > 0.05)
                  .map((e) => ({ cellarOwnerUserId: e.candidate.userId, litres: e.litres }))
              )
            }
            style={[styles.btnPrimary, (busy || !ready) && styles.btnPrimaryDisabled]}
          >
            <Text style={styles.btnPrimaryText}>{t('pendingPressings.save')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.flow}>
        <Text style={[styles.flowStep, styles.flowStepFirst]}>
          {t('litres', { amount: formatOilNumber(pressing.farmerLitres, locale) })}
          {groves ? ` · ${groves}` : ''}
        </Text>

        {pressing.candidates.map((candidate) => (
          <View style={styles.field} key={candidate.userId}>
            <Text style={styles.fieldLabel}>
              {candidate.isYou
                ? t('pendingPressings.you')
                : candidate.displayName || candidate.userId}
            </Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={draft[candidate.userId] ?? ''}
              onChangeText={(raw) =>
                setDraft((prev) => ({ ...prev, [candidate.userId]: raw }))
              }
            />
          </View>
        ))}

        <Text style={[styles.flowHint, over && styles.waitingMetaWarn]}>
          {over
            ? t('pendingPressings.over', { amount: formatOilNumber(Math.abs(left), locale) })
            : t('pendingPressings.left', { amount: formatOilNumber(Math.max(0, left), locale) })}
        </Text>
      </View>
    </Sheet>
  );
}
