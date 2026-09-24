import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import FieldColorMark from '../../components/fields/FieldColorMark';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing, typography } from '../../theme';
import type { FieldLocationGuess } from '../fieldGuess';

type SingleProps = {
  mode: 'single';
  fields: Field[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  recommendation?: FieldLocationGuess | null;
  locationUnavailable?: boolean;
  sectionLabel?: string;
  /** Auto-apply confident GPS guess once (caller can still change). */
  autoApplyGuess?: boolean;
};
type MultiProps = {
  mode: 'multiple';
  fields: Field[];
  value: string[];
  onChange: (ids: string[]) => void;
  sectionLabel?: string;
};
export type HarvestFieldPickerProps = SingleProps | MultiProps;

export const HarvestFieldPicker: React.FC<HarvestFieldPickerProps> = (props) => {
  const { t } = useTranslation('fields');
  const { colors, tapMin } = useTheme();
  const [manual, setManual] = useState(false);
  const autoApplied = useRef(false);
  const guessed =
    props.mode === 'single' && props.recommendation?.confident ? props.recommendation.field : null;

  useEffect(() => {
    if (props.mode !== 'single') return;
    if (!props.autoApplyGuess || !guessed || autoApplied.current || manual) return;
    if (props.value === guessed.id) {
      autoApplied.current = true;
      return;
    }
    autoApplied.current = true;
    props.onChange(guessed.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply confident guess once per mount
  }, [guessed?.id, props.mode, manual]);

  const chip = (
    id: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    color?: string | null
  ) => (
    <Pressable
      key={id || 'none'}
      onPress={onPress}
      accessibilityRole={props.mode === 'multiple' ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: props.mode === 'multiple' ? selected : undefined }}
      style={[
        styles.chip,
        {
          minHeight: tapMin,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primaryLight : colors.surface,
        },
      ]}
    >
      <FieldColorMark color={color} fieldId={id || undefined} hollow={!id} size={10} />
      <Text style={{ color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '800' : '600' }}>
        {label}
      </Text>
    </Pressable>
  );

  const showGuessCard = props.mode === 'single' && guessed && !manual;

  return (
    <View style={styles.group}>
      {props.sectionLabel ? (
        <Text style={[styles.label, { color: colors.textPrimary }]}>{props.sectionLabel}</Text>
      ) : null}
      {showGuessCard ? (
        <View style={[styles.guess, { borderColor: colors.oliveBorder, backgroundColor: colors.primaryLight }]}>
          <FieldColorMark color={guessed.color} fieldId={guessed.id} size={12} />
          <Text style={{ color: colors.textSecondary, flex: 1 }}>
            {t('harvestCampaign.sacks.nearField', { field: friendlyFieldLabel(guessed.name) })}
          </Text>
          <Pressable onPress={() => setManual(true)} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('harvestCampaign.sacks.changeField')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {props.mode === 'single' && props.locationUnavailable ? (
            <Text style={{ color: colors.textTertiary }}>{t('harvestCampaign.sacks.locationUnavailable')}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {props.fields.map((field) => {
              const selected =
                props.mode === 'single' ? props.value === field.id : props.value.includes(field.id);
              return chip(field.id, friendlyFieldLabel(field.name), selected, () => {
                if (props.mode === 'single') props.onChange(field.id);
                else
                  props.onChange(
                    selected ? props.value.filter((id) => id !== field.id) : [...props.value, field.id]
                  );
              }, field.color);
            })}
            {props.mode === 'single' && props.allowNone
              ? chip('', props.noneLabel || t('harvestCampaign.millKg.split.none'), !props.value, () =>
                  props.onChange('')
                )
              : null}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { ...typography.styles.bodySmall, fontWeight: '700' },
  chips: { gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  guess: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
});
