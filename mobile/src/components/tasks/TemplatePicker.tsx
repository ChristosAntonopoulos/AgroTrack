import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TaskSuggestion } from '../../services/taskService';
import {
  MINIMAL_TASK_TEMPLATES,
  minimalTemplateTitle,
} from '../../data/minimalTaskTemplates';
import { useTheme } from '../../context/ThemeContext';
import TaskCategoryGlyph from './TaskCategoryGlyph';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { radii, spacing } from '../../theme';

export type TemplatePickerSelection =
  | {
      kind: 'template';
      templateCode: string;
      title: string;
      description: string;
      checklistLines: string[];
    }
  | { kind: 'custom' };

type Props = {
  suggestions?: TaskSuggestion[];
  language?: string;
  onSelect: (selection: TemplatePickerSelection) => void;
  onCancel: () => void;
};

const TemplatePicker: React.FC<Props> = ({
  suggestions = [],
  language = 'el',
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const lang = language.toLowerCase().startsWith('en') ? 'en' : 'el';

  const row = (
    key: string,
    templateCode: string | undefined,
    title: string,
    subtitle?: string,
    onPress?: () => void
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={[
        styles.row,
        {
          minHeight: Math.max(52, tapMin),
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {templateCode ? (
        <TaskCategoryGlyph
          templateCode={templateCode}
          accent={resolveTaskCategoryAccent(templateCode)}
          size={36}
        />
      ) : null}
      <View style={styles.copy}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 * fontScaleMultiplier }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {suggestions.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.textSecondary }]}>
            {t('schedule.templates.suggestedNow')}
          </Text>
          <View style={styles.list}>
            {suggestions.map((item) => {
              const meta = MINIMAL_TASK_TEMPLATES.find(
                (t) => t.code.toUpperCase() === item.templateCode.toUpperCase()
              );
              const title = item.title || minimalTemplateTitle(item.templateCode, language);
              return row(
                `${item.fieldId}-${item.templateCode}`,
                item.templateCode,
                title,
                item.whyNow,
                () =>
                  onSelect({
                    kind: 'template',
                    templateCode: item.templateCode,
                    title,
                    description: meta?.description[lang] || '',
                    checklistLines: meta?.checklist[lang] || [],
                  })
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textSecondary }]}>
          {t('schedule.templates.curated')}
        </Text>
        <View style={styles.list}>
          {MINIMAL_TASK_TEMPLATES.map((item) =>
            row(
              item.code,
              item.code,
              item.title[lang],
              item.description[lang],
              () =>
                onSelect({
                  kind: 'template',
                  templateCode: item.code,
                  title: item.title[lang],
                  description: item.description[lang],
                  checklistLines: item.checklist[lang],
                })
            )
          )}
        </View>
      </View>

      <Pressable
        onPress={() => onSelect({ kind: 'custom' })}
        style={[
          styles.custom,
          {
            minHeight: Math.max(48, tapMin * 0.95),
            borderColor: colors.oliveBorder,
            backgroundColor: colors.primaryLight,
          },
        ]}
      >
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {t('schedule.templates.writeOwn')}
        </Text>
      </Pressable>

      <Pressable onPress={onCancel} style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('schedule.cancel')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: { gap: spacing.sm },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  custom: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
});

export default TemplatePicker;
