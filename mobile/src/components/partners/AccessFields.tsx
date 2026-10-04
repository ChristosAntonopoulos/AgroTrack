import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  FAMILY_MODULES,
  FamilyAccessLevel,
  FamilyModule,
} from '../../services/familyService';
import { spacing } from '../../theme';

type Props = {
  modules: FamilyModule[];
  accessLevel: FamilyAccessLevel;
  onToggleModule: (module: FamilyModule) => void;
  onSetLevel: (level: FamilyAccessLevel) => void;
  showLevels?: boolean;
};

const AccessFields: React.FC<Props> = ({ modules, accessLevel, onToggleModule, onSetLevel, showLevels = true }) => {
  const { t } = useTranslation(['partners']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{t('partners:family.partsTitle')}</Text>
      <View style={styles.chips}>
        {FAMILY_MODULES.map((module) => {
          const on = modules.includes(module);
          return (
            <Pressable
              key={module}
              onPress={() => onToggleModule(module)}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? colors.primaryLight : colors.surface,
                  borderColor: on ? colors.oliveBorder : colors.border,
                },
              ]}
            >
              <Text style={{ color: on ? colors.primary : colors.textPrimary, fontWeight: '600' }}>
                {t(`partners:family.modules.${module}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showLevels ? <Text style={[styles.label, { color: colors.textPrimary }]}>{t('partners:family.levelTitle')}</Text> : null}
      {showLevels ? (
      <View style={{ gap: 8 }}>
        {(['view', 'help', 'work'] as FamilyAccessLevel[]).map((level) => {
          const on = accessLevel === level;
          return (
            <Pressable
              key={level}
              onPress={() => onSetLevel(level)}
              style={[
                styles.levelCard,
                {
                  borderColor: on ? colors.oliveBorder : colors.border,
                  backgroundColor: on ? colors.primaryLight : colors.surface,
                  minHeight: tapMin,
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t(`partners:family.levels.${level}`)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {t(`partners:family.levelHints.${level}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  levelCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

export default AccessFields;
