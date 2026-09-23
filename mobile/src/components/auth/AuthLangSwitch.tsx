import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreferences, AppLanguage } from '../../context/PreferencesContext';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing } from '../../theme';

const LANGS: AppLanguage[] = ['el', 'en'];

const AuthLangSwitch: React.FC = () => {
  const { t } = useTranslation('common');
  const { language, setLanguage } = usePreferences();

  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={t('language', { defaultValue: 'Language' })}
    >
      {LANGS.map((code, index) => (
        <React.Fragment key={code}>
          {index > 0 ? <Text style={styles.sep}>|</Text> : null}
          <TouchableOpacity
            onPress={() => setLanguage(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: language === code }}
            hitSlop={8}
          >
            <Text style={[styles.item, language === code && styles.active]}>{code.toUpperCase()}</Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sep: {
    color: loginTheme.heroMuted,
  },
  item: {
    ...typography.styles.caption,
    color: loginTheme.heroMuted,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  active: {
    color: loginTheme.heroText,
  },
});

export default AuthLangSwitch;
