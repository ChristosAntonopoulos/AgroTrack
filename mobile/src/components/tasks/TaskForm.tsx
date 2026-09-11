import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography, radii } from '../../theme';
import Button from '../ui/Button';
import type { Field } from '../../services/fieldService';
import type { FieldWeather } from '../../services/geospatialService';
import type { TaskProposal } from '../../services/fieldWorkService';
import { TASK_FORM_TYPES, type TaskFormTypeId, templateFromType } from '../../utils/taskFormTypes';
import {
  addDaysToIso,
  athensTodayIso,
  daysInMonth,
  formatLongTaskDate,
  formatMonthHeading,
  greekWeekdayHeaders,
  parseIsoDateParts,
  toEndIso,
  toIsoDate,
  toStartIso,
  weekdayIndexMondayFirst,
  weekSundayIso,
} from '../../utils/taskFormDates';
import { deriveResultYear, crossesHarvestYear, resultYearChoices } from '../../utils/taskResultYear';
import { formatFieldArea } from '../../utils/fieldGeo';
import { getFieldShortLocation } from '../../utils/shortLocation';
import { checklistPreviewItems } from '../../utils/taskChecklistPreview';
import {
  evaluateProposalWeather,
  formatRecommendedPeriod,
  proposalExplanation,
  proposalTitle,
  weatherExplanationCopy,
} from '../../utils/proposalPresentation';
import { formatTaskDateRange } from '../../utils/taskDateRange';
import { TaskChoiceChips, TaskHelpText, TaskSectionLabel, TaskWeatherChip } from './TaskChoiceChips';

export type DatePreset = 'today' | 'tomorrow' | 'thisWeek' | 'pick' | 'undecided';
export type TimeWindowId = 'morning' | 'midday' | 'afternoon' | 'anytime' | 'specific';

export type AssigneeOption = {
  key: string;
  label: string;
  hint?: string;
  group?: 'self' | 'partner' | 'family' | 'contact' | 'later';
};

export type TaskFormSubmitPayload = {
  fieldId: string;
  title: string;
  templateCode?: string;
  plannedStart?: string;
  plannedEnd?: string;
  preferredTimeWindow?: string;
  assignedUserId?: string;
  assignedCollaboratorId?: string;
  notes?: string;
  estimatedCost?: number;
  resultYear: number;
};

const timeWindowValue = (id: TimeWindowId | '', specific: string, language: string): string | undefined => {
  const greek = language.toLowerCase().startsWith('el');
  if (id === 'specific' && specific) return specific;
  if (id === 'morning') return greek ? 'Πρωί' : 'Morning';
  if (id === 'midday') return greek ? 'Μεσημέρι' : 'Midday';
  if (id === 'afternoon') return greek ? 'Απόγευμα' : 'Afternoon';
  if (id === 'anytime') return greek ? 'Οποιαδήποτε ώρα' : 'Any time';
  return undefined;
};

const TaskForm = ({
  mode,
  fields,
  proposal,
  weather,
  assigneeOptions,
  initialTitle,
  initialFieldId,
  initialType = '',
  initialStart = '',
  initialEnd = '',
  initialAssigneeKey = '',
  saving,
  error,
  onFieldChange,
  onCancel,
  onSubmit,
}: {
  mode: 'manual' | 'proposal';
  fields: Field[];
  proposal?: TaskProposal | null;
  weather?: FieldWeather | null;
  assigneeOptions: AssigneeOption[];
  initialTitle: string;
  initialFieldId: string;
  initialType?: TaskFormTypeId | '';
  initialStart?: string;
  initialEnd?: string;
  initialAssigneeKey?: string;
  saving: boolean;
  error?: string | null;
  onFieldChange?: (fieldId: string) => void;
  onCancel: () => void;
  onSubmit: (payload: TaskFormSubmitPayload) => void;
}) => {
  const { t, i18n } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const selfKey =
    assigneeOptions.find((option) => option.group === 'self')?.key || assigneeOptions[0]?.key || 'later';
  const [title, setTitle] = useState(initialTitle);
  const [fieldId, setFieldId] = useState(initialFieldId);
  const [typeId, setTypeId] = useState<TaskFormTypeId | ''>(initialType);
  const [preset, setPreset] = useState<DatePreset | ''>(initialStart ? 'pick' : '');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [multiDay, setMultiDay] = useState(Boolean(initialStart && initialEnd && initialStart !== initialEnd));
  const [assigneeKey, setAssigneeKey] = useState(initialAssigneeKey || selfKey);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindowId | ''>('');
  const [specificTime, setSpecificTime] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [resultYear, setResultYear] = useState<number | undefined>(undefined);
  const [showChecklist, setShowChecklist] = useState(false);
  const [pickingOther, setPickingOther] = useState(false);

  const templateCode = mode === 'proposal' ? proposal?.templateCode : templateFromType(typeId);
  const suggestions = useMemo(() => {
    const option = TASK_FORM_TYPES.find((item) => item.id === typeId);
    if (!option) return [];
    const raw = t(option.suggestionsKey, { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [typeId, t]);

  const today = athensTodayIso();
  const startParts = parseIsoDateParts(start) || parseIsoDateParts(today)!;
  const [cursor, setCursor] = useState({ year: startParts.year, month: startParts.month });

  const applyPreset = (next: DatePreset) => {
    setPreset(next);
    if (next === 'today') {
      setStart(today);
      setEnd(multiDay ? end || today : '');
    } else if (next === 'tomorrow') {
      const tomorrow = addDaysToIso(today, 1);
      setStart(tomorrow);
      setEnd(multiDay ? end || tomorrow : '');
    } else if (next === 'thisWeek') {
      setStart(today);
      setEnd(weekSundayIso(today));
      setMultiDay(true);
    } else if (next === 'undecided') {
      setStart('');
      setEnd('');
      setMultiDay(false);
    } else if (next === 'pick' && !start) {
      setStart(today);
    }
  };

  const toggleMultiDay = () => {
    setMultiDay((value) => {
      const next = !value;
      if (next && start && !end) setEnd(start);
      if (!next) setEnd('');
      return next;
    });
  };

  const disabledReason = !title.trim()
    ? t('fieldWork.form.needTitle')
    : !fieldId
      ? t('fieldWork.form.needField')
      : !preset
        ? t('fieldWork.form.needDate')
        : preset === 'pick' && !start
          ? t('fieldWork.form.needDate')
          : undefined;

  const handleType = (next: TaskFormTypeId) => {
    setTypeId(next);
    const option = TASK_FORM_TYPES.find((item) => item.id === next);
    const labels = option ? (t(option.suggestionsKey, { returnObjects: true }) as unknown) : [];
    const first = Array.isArray(labels) ? String(labels[0] || '') : '';
    if (!title.trim() && first) setTitle(first);
  };

  const laterOption = assigneeOptions.find((option) => option.group === 'later' || option.key === 'later');
  const peopleOptions = assigneeOptions.filter(
    (option) => option.key !== selfKey && option.group !== 'later' && option.key !== 'later'
  );
  const selectedPerson = peopleOptions.find((option) => option.key === assigneeKey);
  const showPicker = pickingOther || Boolean(selectedPerson);

  const preview = checklistPreviewItems(templateCode, i18n.language);
  const derivedYear = deriveResultYear(start || undefined);
  const showYear = crossesHarvestYear(start || undefined);
  const years = resultYearChoices(start || undefined);

  const weatherStub = {
    templateCode: templateCode || '',
    sourceType: '',
    reasonCodes: [] as string[],
  } as TaskProposal;
  const weatherEval = evaluateProposalWeather(weatherStub, weather);
  const weatherCopy = weatherExplanationCopy(weatherEval.kind, weatherEval.facts, i18n.language);

  const handleSubmit = () => {
    if (disabledReason) return;
    const plannedStart = preset === 'undecided' ? undefined : toStartIso(start);
    const plannedEnd = preset === 'undecided' || !multiDay ? undefined : toEndIso(end || start);
    const selected = assigneeOptions.find((option) => option.key === assigneeKey);
    onSubmit({
      fieldId,
      title: title.trim(),
      templateCode,
      plannedStart,
      plannedEnd,
      preferredTimeWindow: timeWindowValue(timeWindow, specificTime, i18n.language),
      assignedUserId: selected?.key.startsWith('user:') ? selected.key.slice(5) : undefined,
      assignedCollaboratorId: selected?.key.startsWith('contact:') ? selected.key.slice(8) : undefined,
      notes: notes.trim() || undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      resultYear: resultYear ?? derivedYear,
    });
  };

  const pickingEnd = multiDay && Boolean(start) && preset === 'pick';
  const blanks = weekdayIndexMondayFirst(cursor.year, cursor.month, 1);
  const count = daysInMonth(cursor.year, cursor.month);
  const dateDisplay =
    preset === 'undecided'
      ? ''
      : multiDay && start && end
        ? formatTaskDateRange(start, end, i18n.language)
        : formatLongTaskDate(start, i18n.language);

  return (
    <View style={styles.form}>
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {mode === 'proposal' && proposal ? (
        <View style={[styles.summary, { borderColor: colors.oliveBorder, backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
            {t('fieldWork.form.proposalSummary')}
          </Text>
          <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>
            {proposalTitle(proposal, i18n.language)}
          </Text>
          <TaskHelpText>{proposalExplanation(proposal, i18n.language)}</TaskHelpText>
          {formatRecommendedPeriod(proposal, i18n.language) ? (
            <TaskHelpText>
              {`${t('fieldWork.form.recommendedWindow')}: ${formatRecommendedPeriod(proposal, i18n.language)}`}
            </TaskHelpText>
          ) : null}
        </View>
      ) : null}

      <View>
        <TaskSectionLabel>{t('fieldWork.form.whatQuestion')}</TaskSectionLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('fieldWork.form.titlePlaceholder')}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[
            styles.titleInput,
            {
              color: colors.textPrimary,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              fontSize: 18 * fontScaleMultiplier,
              minHeight: Math.max(88, tapMin * 1.6),
            },
          ]}
        />
        {mode === 'manual' && suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setTitle(suggestion)}
                style={[styles.suggestion, { borderColor: colors.borderLight, backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 * fontScaleMultiplier }}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {mode === 'manual' ? (
        <View>
          <TaskSectionLabel>{t('fieldWork.form.typeLabel')}</TaskSectionLabel>
          <TaskChoiceChips
            options={TASK_FORM_TYPES.map((option) => ({ id: option.id, label: t(option.labelKey) }))}
            value={typeId}
            onChange={handleType}
          />
        </View>
      ) : null}

      <View>
        <TaskSectionLabel>{t('fieldWork.form.fieldQuestion')}</TaskSectionLabel>
        {fields.map((field) => {
          const selected = field.id === fieldId;
          const meta = [formatFieldArea(field) !== '—' ? formatFieldArea(field) : '', getFieldShortLocation(field)]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={field.id}
              onPress={() => {
                setFieldId(field.id);
                onFieldChange?.(field.id);
              }}
              style={[
                styles.fieldCard,
                {
                  borderColor: selected ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: selected ? colors.primaryLight : colors.surface,
                  minHeight: tapMin + 8,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldName, { color: colors.textPrimary }]}>{field.name}</Text>
                {meta ? <Text style={[styles.fieldMeta, { color: colors.textSecondary }]}>{meta}</Text> : null}
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View>
        <TaskSectionLabel>{t('fieldWork.form.whenQuestion')}</TaskSectionLabel>
        <TaskChoiceChips
          options={(
            [
              ['today', t('fieldWork.form.when.today')],
              ['tomorrow', t('fieldWork.form.when.tomorrow')],
              ['thisWeek', t('fieldWork.form.when.thisWeek')],
              ['pick', t('fieldWork.form.when.pick')],
              ['undecided', t('fieldWork.form.when.undecided')],
            ] as Array<[DatePreset, string]>
          ).map(([id, label]) => ({ id, label }))}
          value={preset}
          onChange={applyPreset}
        />
        {dateDisplay ? (
          <Text style={[styles.dateDisplay, { color: colors.textPrimary }]}>{dateDisplay}</Text>
        ) : null}
        {proposal && preset !== 'undecided' && formatRecommendedPeriod(proposal, i18n.language) ? (
          <TaskHelpText>
            {`${t('fieldWork.form.recommendedWindow')}: ${formatRecommendedPeriod(proposal, i18n.language)}`}
          </TaskHelpText>
        ) : null}
        {preset && preset !== 'undecided' ? (
          <Pressable onPress={toggleMultiDay} style={styles.linkBtn}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {multiDay ? t('fieldWork.form.singleDay') : t('fieldWork.form.moreDays')}
            </Text>
          </Pressable>
        ) : null}
        {preset === 'pick' ? (
          <View style={[styles.cal, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
            <View style={styles.calNav}>
              <Pressable
                onPress={() => {
                  const next = new Date(cursor.year, cursor.month - 2, 1);
                  setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
                }}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </Pressable>
              <Text style={[styles.calHeading, { color: colors.textPrimary }]}>
                {formatMonthHeading(cursor.year, cursor.month, i18n.language)}
              </Text>
              <Pressable
                onPress={() => {
                  const next = new Date(cursor.year, cursor.month, 1);
                  setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
                }}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <View style={styles.calGrid}>
              {greekWeekdayHeaders().map((day) => (
                <Text key={day} style={[styles.calDow, { color: colors.textTertiary }]}>
                  {day}
                </Text>
              ))}
              {Array.from({ length: blanks }, (_, index) => (
                <View key={`e-${index}`} style={styles.calDay} />
              ))}
              {Array.from({ length: count }, (_, index) => {
                const day = index + 1;
                const iso = toIsoDate(cursor.year, cursor.month, day);
                const selected = pickingEnd ? iso === end : iso === start;
                return (
                  <Pressable
                    key={iso}
                    onPress={() => {
                      if (pickingEnd) setEnd(iso);
                      else {
                        setStart(iso);
                        setPreset('pick');
                      }
                    }}
                    style={[
                      styles.calDay,
                      selected ? { backgroundColor: colors.primary, borderRadius: radii.full } : null,
                    ]}
                  >
                    <Text style={{ color: selected ? colors.onOlive : colors.textPrimary, fontWeight: '600' }}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {preset && preset !== 'undecided' && start && weatherEval.kind !== 'not_sensitive' ? (
          <View style={styles.weatherBlock}>
            <TaskWeatherChip
              kind={
                weatherEval.kind === 'good'
                  ? 'good'
                  : weatherEval.kind === 'caution'
                    ? 'caution'
                    : weatherEval.kind === 'unsuitable'
                      ? 'unsuitable'
                      : 'unknown'
              }
              label={
                weatherEval.kind === 'unknown'
                  ? t('fieldWork.weather.unknown')
                  : t(`fieldWork.proposal.chips.${weatherEval.kind}`)
              }
            />
            {weatherCopy.headline ? <TaskHelpText>{weatherCopy.headline}</TaskHelpText> : null}
            {weatherCopy.facts.map((fact) => (
              <TaskHelpText key={fact}>{fact}</TaskHelpText>
            ))}
          </View>
        ) : null}
      </View>

      <View>
        <TaskSectionLabel>{t('fieldWork.form.whoQuestion')}</TaskSectionLabel>
        <TaskChoiceChips
          options={[
            { id: selfKey, label: t('fieldWork.form.assigneeMe') },
            ...(peopleOptions.length > 0
              ? [{ id: '__other__' as const, label: t('fieldWork.form.assigneeSomeoneElse') }]
              : []),
            ...(laterOption ? [{ id: laterOption.key, label: laterOption.label }] : []),
          ]}
          value={showPicker ? '__other__' : assigneeKey}
          onChange={(key) => {
            if (key === '__other__') {
              setPickingOther(true);
              if (!selectedPerson && peopleOptions[0]) setAssigneeKey(peopleOptions[0].key);
              return;
            }
            setPickingOther(false);
            setAssigneeKey(key);
          }}
        />
        {showPicker && peopleOptions.length > 0 ? (
          <View style={styles.peopleList}>
            {peopleOptions.map((option) => {
              const selected = option.key === assigneeKey;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setAssigneeKey(option.key)}
                  style={[
                    styles.personRow,
                    {
                      borderColor: selected ? colors.oliveBorder : colors.borderLight,
                      backgroundColor: selected ? colors.primaryLight : colors.surface,
                      minHeight: tapMin,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{option.label}</Text>
                    {option.hint ? (
                      <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{option.hint}</Text>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {!showPicker && assigneeKey === selfKey ? (
          <TaskHelpText>{t('fieldWork.form.assigneeMeHint')}</TaskHelpText>
        ) : null}
      </View>

      <Pressable onPress={() => setShowAdvanced((value) => !value)} style={styles.linkBtn}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {showAdvanced ? t('fieldWork.form.hideMore') : t('fieldWork.form.moreDetails')}
        </Text>
      </Pressable>

      {showAdvanced ? (
        <View style={styles.advanced}>
          <TaskSectionLabel>{t('fieldWork.form.preferredTime')}</TaskSectionLabel>
          <TaskChoiceChips
            options={(['morning', 'midday', 'afternoon', 'anytime', 'specific'] as TimeWindowId[]).map((id) => ({
              id,
              label: t(`fieldWork.form.time.${id}`),
            }))}
            value={timeWindow}
            onChange={setTimeWindow}
          />
          {timeWindow === 'specific' ? (
            <TextInput
              value={specificTime}
              onChangeText={setSpecificTime}
              placeholder="09:00"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
          ) : null}

          {templateCode ? (
            <View>
              <TaskHelpText>{t('fieldWork.form.checklistIntro', { count: preview.total })}</TaskHelpText>
              {(showChecklist ? preview.items : preview.items.slice(0, 3)).map((item) => (
                <Text key={item} style={[styles.checkItem, { color: colors.textSecondary }]}>
                  • {item}
                </Text>
              ))}
              <Pressable onPress={() => setShowChecklist((value) => !value)} style={styles.linkBtn}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  {showChecklist ? t('fieldWork.form.hideChecklist') : t('fieldWork.form.showChecklist')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <TaskSectionLabel>{t('fieldWork.form.estimatedCost')}</TaskSectionLabel>
          <View style={styles.costRow}>
            <TextInput
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>€</Text>
          </View>
          <TaskHelpText>{t('fieldWork.form.costHint')}</TaskHelpText>

          <TaskSectionLabel>{t('fieldWork.form.notesForPerson')}</TaskSectionLabel>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[
              styles.notes,
              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />

          {showYear ? (
            <View>
              <TaskSectionLabel>{t('fieldWork.form.resultYear')}</TaskSectionLabel>
              <TaskHelpText>{t('fieldWork.form.resultYearHint')}</TaskHelpText>
              <TaskChoiceChips
                options={years.map((year) => ({ id: String(year), label: String(year) }))}
                value={String(resultYear ?? derivedYear)}
                onChange={(id) => setResultYear(Number(id))}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {disabledReason ? <TaskHelpText>{disabledReason}</TaskHelpText> : null}

      <View style={styles.actions}>
        <Button title={t('fieldWork.form.cancel')} variant="outline" onPress={onCancel} disabled={saving} style={{ flex: 1 }} />
        <Button
          title={mode === 'proposal' ? t('fieldWork.form.scheduleSubmit') : t('fieldWork.form.createSubmit')}
          onPress={handleSubmit}
          disabled={Boolean(disabledReason) || saving}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingBottom: spacing['3xl'] },
  errorBox: { borderRadius: radii.md, padding: spacing.md },
  summary: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.base, gap: spacing.xs },
  summaryTitle: { ...typography.styles.bodySmall, fontWeight: '700' },
  summaryBody: { ...typography.styles.body, fontWeight: '700' },
  titleInput: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  suggestion: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  fieldName: { ...typography.styles.body, fontWeight: '700' },
  fieldMeta: { ...typography.styles.caption, marginTop: 2 },
  dateDisplay: { ...typography.styles.body, fontWeight: '600', marginTop: spacing.sm },
  linkBtn: { paddingVertical: spacing.sm },
  cal: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, marginTop: spacing.sm },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  calHeading: { ...typography.styles.body, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDow: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  calDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weatherBlock: { marginTop: spacing.sm, gap: spacing.xs },
  peopleList: { gap: spacing.xs, marginTop: spacing.sm },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  advanced: { gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, minHeight: 48 },
  notes: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, minHeight: 88, textAlignVertical: 'top' },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkItem: { ...typography.styles.bodySmall, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});

export default TaskForm;
