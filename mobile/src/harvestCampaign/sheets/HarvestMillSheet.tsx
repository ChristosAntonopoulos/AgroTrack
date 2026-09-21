import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { equalFieldShares, fieldIdsFromShares, sharesFromSacks } from '../allocation';
import {
  formatDaySpan,
  pendingSacksByDay,
  suggestMillIncludes,
} from '../chain';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestMillWeightEntry, HarvestSackEntry } from '../types';
import type { HarvestSheetSharedProps } from './types';
import { radii, spacing } from '../../theme';

function formatWeekday(date: string, locale: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return date;
  }
}

export const HarvestMillSheet: React.FC<
  HarvestSheetSharedProps & {
    prefillSackIds?: string[];
    initial?: HarvestMillWeightEntry | null;
    onSave: (input: {
      kg: number;
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      sackIds: string[];
      note?: string;
    }) => void;
  }
> = ({
  campaign,
  fields,
  today,
  locale,
  preferredFieldId,
  prefillSackIds,
  initial,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const editing = Boolean(initial);
  const suggested = useMemo(() => suggestMillIncludes(campaign, today), [campaign, today]);
  const allPendingByDay = useMemo(() => {
    const groups = pendingSacksByDay(campaign);
    const editingSackIds = new Set(initial?.sackIds || []);
    const linkedForEdit =
      initial != null
        ? campaign.sacks.filter((s) => editingSackIds.has(s.id) || s.millWeightId === initial.id)
        : [];
    const byDate = new Map(groups.map((g) => [g.date, { ...g, sacks: [...g.sacks] }]));
    for (const sack of linkedForEdit) {
      const existing = byDate.get(sack.date);
      if (existing) {
        if (!existing.sacks.some((s) => s.id === sack.id)) {
          existing.sacks = [...existing.sacks, sack];
        }
      } else {
        byDate.set(sack.date, {
          date: sack.date,
          sacks: [sack],
          sackCount: sack.sacks,
          fieldIds: [sack.fieldId],
        });
      }
    }
    return [...byDate.values()]
      .map((g) => ({
        ...g,
        sacks: g.sacks.filter((s) => s.date <= today),
      }))
      .filter((g) => g.sacks.length > 0)
      .map((g) => ({
        ...g,
        sackCount: g.sacks.reduce((sum, s) => sum + s.sacks, 0),
        fieldIds: [...new Set(g.sacks.map((s) => s.fieldId))],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [campaign, today, initial]);

  const pendingPool = useMemo(
    () => allPendingByDay.flatMap((g) => g.sacks),
    [allPendingByDay]
  );

  const fieldsFromSackIds = (ids: string[]) => [
    ...new Set(campaign.sacks.filter((s) => ids.includes(s.id)).map((s) => s.fieldId)),
  ];

  const initialSackIds = useMemo(() => {
    if (initial?.sackIds?.length) return initial.sackIds;
    if (prefillSackIds && prefillSackIds.length > 0) {
      const allowed = new Set(pendingPool.map((s) => s.id));
      return prefillSackIds.filter((id) => allowed.has(id));
    }
    return suggested.map((s) => s.id);
  }, [initial, prefillSackIds, pendingPool, suggested]);

  const initialFields = useMemo(() => {
    if (initial?.fieldIds?.length) return initial.fieldIds;
    const fromSacks = fieldsFromSackIds(initialSackIds);
    if (fromSacks.length > 0) return fromSacks;
    if (preferredFieldId) return [preferredFieldId];
    return campaign.fieldOrder[0]
      ? [campaign.fieldOrder[0]]
      : fields[0]
        ? [fields[0].id]
        : [];
  }, [initial, initialSackIds, campaign, fields, preferredFieldId]);

  const [kg, setKg] = useState(initial ? String(initial.kg) : '');
  const [fieldIds, setFieldIds] = useState<string[]>(initialFields);
  const [sackIds, setSackIds] = useState<string[]>(initialSackIds);
  const [expandIncludes, setExpandIncludes] = useState(false);
  const [more, setMore] = useState(Boolean(initial?.note));
  const [adjustShares, setAdjustShares] = useState(false);
  const [manualShares, setManualShares] = useState<HarvestFieldShare[]>(
    initial?.fieldShares || []
  );
  const [note, setNote] = useState(initial?.note || '');
  const kgNumber = parseHarvestDecimal(kg);
  const canSave = isPositiveAmount(kgNumber);
  const saveHint = !canSave ? t('fields:harvestCampaign.validation.enterWeight') : null;

  const selectedSacks = useMemo(
    () => pendingPool.filter((s) => sackIds.includes(s.id)),
    [pendingPool, sackIds]
  );

  const includeSummary = useMemo(() => {
    if (selectedSacks.length === 0) return null;
    const byDay = new Map<string, HarvestSackEntry[]>();
    for (const sack of selectedSacks) {
      const list = byDay.get(sack.date) || [];
      list.push(sack);
      byDay.set(sack.date, list);
    }
    const dates = [...byDay.keys()].sort();
    return {
      count: selectedSacks.reduce((sum, s) => sum + s.sacks, 0),
      span: formatDaySpan(dates, locale),
      lines: dates.map((date) => {
        const daySacks = byDay.get(date)!;
        const count = daySacks.reduce((sum, s) => sum + s.sacks, 0);
        const fieldNames = [
          ...new Set(
            daySacks.map((s) =>
              friendlyFieldLabel(fields.find((f) => f.id === s.fieldId)?.name || s.fieldId)
            )
          ),
        ];
        return `${formatWeekday(date, locale)} ${count} · ${fieldNames.join(' + ')}`;
      }),
    };
  }, [selectedSacks, fields, locale]);

  const defaultShares = useMemo(() => {
    if (sackIds.length > 0) return sharesFromSacks(campaign.sacks, sackIds, fieldIds);
    return equalFieldShares(fieldIds);
  }, [campaign.sacks, sackIds, fieldIds]);

  const activeShares = adjustShares && manualShares.length > 0 ? manualShares : defaultShares;

  const toggleSack = (id: string) => {
    setSackIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const nextFields = fieldsFromSackIds(next);
      if (nextFields.length > 0) setFieldIds(nextFields);
      setAdjustShares(false);
      return next;
    });
  };

  return (
    <HarvestSheetShell
      footer={
        <>
          {saveHint ? (
            <Text style={{ color: colors.textTertiary, textAlign: 'center' }}>{saveHint}</Text>
          ) : null}
          <Button
            title={
              editing
                ? t('fields:harvestCampaign.dayActivity.saveChanges')
                : t('fields:harvestCampaign.millKg.save', {
                    kg: formatKg(kgNumber || 0),
                  })
            }
            disabled={!canSave}
            onPress={() =>
              onSave({
                kg: kgNumber!,
                fieldIds: fieldIdsFromShares(activeShares).length
                  ? fieldIdsFromShares(activeShares)
                  : fieldIds,
                fieldShares: activeShares.length > 0 ? activeShares : undefined,
                sackIds,
                note: more && note.trim() ? note.trim() : undefined,
              })
            }
            fullWidth
          />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} fullWidth />
        </>
      }
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {editing
          ? t('fields:harvestCampaign.dayActivity.editMill')
          : t('fields:harvestCampaign.millKg.prompt')}
      </Text>
      <HarvestNumberInput
        label={t('fields:harvestCampaign.actions.mill')}
        value={kg}
        onChange={setKg}
        suffix="kg"
        autoFocus
      />

      {pendingPool.length > 0 ? (
        <View
          style={[
            styles.includes,
            { borderColor: colors.borderLight, backgroundColor: colors.eventHarvestSoft },
          ]}
        >
          <View style={styles.includesHead}>
            <Text style={[styles.section, { color: colors.textSecondary }]}>
              {t('fields:harvestCampaign.chain.includesTitle')}
            </Text>
            <Pressable onPress={() => setExpandIncludes((v) => !v)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {expandIncludes
                  ? t('fields:harvestCampaign.chain.includesDone')
                  : t('fields:harvestCampaign.chain.includesChange')}
              </Text>
            </Pressable>
          </View>
          {!expandIncludes && includeSummary ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('fields:harvestCampaign.chain.includesCount', {
                  count: includeSummary.count,
                  span: includeSummary.span,
                })}
              </Text>
              {includeSummary.lines.map((line) => (
                <Text key={line} style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          {!expandIncludes && !includeSummary ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.chain.includesNone')}
            </Text>
          ) : null}
          {expandIncludes ? (
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
                  const ids = pendingPool.map((s) => s.id);
                  setSackIds(ids);
                  setFieldIds(fieldsFromSackIds(ids));
                  setAdjustShares(false);
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('fields:harvestCampaign.chain.includesAll')}
                </Text>
              </Pressable>
              {allPendingByDay.map((group) => (
                <View key={group.date} style={{ gap: 6 }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>
                    {formatWeekday(group.date, locale)} · {group.sackCount}{' '}
                    {t('fields:harvestCampaign.actions.sacks').toLowerCase()}
                  </Text>
                  <View style={styles.chipRow}>
                    {group.sacks.map((sack) => {
                      const field = fields.find((f) => f.id === sack.fieldId);
                      const checked = sackIds.includes(sack.id);
                      return (
                        <Pressable
                          key={sack.id}
                          onPress={() => toggleSack(sack.id)}
                          style={[
                            styles.chip,
                            {
                              borderColor: checked ? colors.primary : colors.border,
                              backgroundColor: checked ? colors.eventHarvestSoft : colors.surface,
                            },
                          ]}
                        >
                          <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
                            {sack.sacks} · {friendlyFieldLabel(field?.name || sack.fieldId)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <HarvestFieldPicker
        mode="multiple"
        fields={fields}
        value={fieldIds}
        onChange={(next) => {
          setFieldIds(next);
          setAdjustShares(false);
        }}
        sectionLabel={t('fields:harvestCampaign.millKg.whichField')}
      />
      {fieldIds.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>
          {t('fields:harvestCampaign.millKg.split.none')}
        </Text>
      ) : fieldIds.length > 1 ? (
        <Text style={{ color: colors.textSecondary }}>
          {t('fields:harvestCampaign.shared.lotHint')}
        </Text>
      ) : null}
      {fieldIds.length > 1 ? (
        <Pressable
          onPress={() => {
            setManualShares(defaultShares.map((s) => ({ ...s })));
            setAdjustShares(true);
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {adjustShares
              ? t('fields:harvestCampaign.shared.editingShares')
              : t('fields:harvestCampaign.shared.adjustShares')}
          </Text>
        </Pressable>
      ) : null}
      {adjustShares
        ? manualShares.map((share) => {
            const field = fields.find((f) => f.id === share.fieldId);
            return (
              <HarvestNumberInput
                key={share.fieldId}
                label={t('fields:harvestCampaign.shared.shareFor', {
                  field: field?.name || share.fieldId,
                })}
                value={String(share.weight)}
                onChange={(raw) => {
                  const weight = parseHarvestDecimal(raw) ?? 0;
                  setManualShares((prev) =>
                    prev.map((row) =>
                      row.fieldId === share.fieldId ? { ...row, weight: Math.max(0, weight) } : row
                    )
                  );
                }}
                min={0}
              />
            );
          })
        : null}
      <Pressable onPress={() => setMore((v) => !v)}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {more ? t('fields:harvestCampaign.less') : t('fields:harvestCampaign.more')}
        </Text>
      </Pressable>
      {more ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('fields:harvestCampaign.noteOptional')}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            style={[styles.note, { color: colors.textPrimary, borderColor: colors.border }]}
          />
        </View>
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
  note: { borderWidth: 1, borderRadius: 12, minHeight: 72, padding: 12, textAlignVertical: 'top' },
  includes: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  includesHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: { fontSize: 13, fontWeight: '700', flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
