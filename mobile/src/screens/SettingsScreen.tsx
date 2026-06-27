import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences, AppLanguage } from '../context/PreferencesContext';
import { ThemeMode } from '../theme/themes';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { changeAppLanguage } from '../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen = () => {
  const { user, logout, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common', 'nav']);
  const { language, themeMode, setLanguage, setThemeMode } = usePreferences();
  const navigation = useNavigation<Nav>();

  const handleLogout = () => {
    Alert.alert(t('settings:logout'), t('settings:logoutConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('settings:logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleLanguage = async (lang: AppLanguage) => {
    await setLanguage(lang);
    await changeAppLanguage(lang);
  };

  const handleTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  const OptionRow = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: selected ? colors.primary + '18' : colors.background,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.optionText, { color: selected ? colors.primary : colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const roleLabel = user?.role ? t(`common:roles.${user.role}`, { defaultValue: user.role }) : '';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('settings:title')}</Text>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings:profile')}</Text>
        <Text style={[styles.profileName, { color: colors.textPrimary }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Text style={[styles.profileMeta, { color: colors.primary }]}>{roleLabel}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings:language')}</Text>
        <View style={styles.optionRow}>
          <OptionRow
            label={t('common:english')}
            selected={language === 'en'}
            onPress={() => handleLanguage('en')}
          />
          <OptionRow
            label={t('common:greek')}
            selected={language === 'el'}
            onPress={() => handleLanguage('el')}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings:theme')}</Text>
        <View style={styles.optionRow}>
          <OptionRow
            label={t('settings:themes.system')}
            selected={themeMode === 'system'}
            onPress={() => handleTheme('system')}
          />
          <OptionRow
            label={t('settings:themes.light')}
            selected={themeMode === 'light'}
            onPress={() => handleTheme('light')}
          />
          <OptionRow
            label={t('settings:themes.dark')}
            selected={themeMode === 'dark'}
            onPress={() => handleTheme('dark')}
          />
        </View>
      </Card>

      {isFieldOwner() ? (
        <Button
          title={t('nav:notifications', { defaultValue: 'Notifications' })}
          variant="outline"
          onPress={() => navigation.navigate('Notifications')}
          fullWidth
          style={styles.actionBtn}
        />
      ) : null}

      <Button
        title={t('settings:logout')}
        variant="outline"
        onPress={handleLogout}
        fullWidth
        style={[styles.actionBtn, { borderColor: colors.error }]}
      />

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        {t('common:version')} 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  pageTitle: { ...typography.styles.h2, fontWeight: '700', marginBottom: spacing.lg, paddingTop: spacing.sm },
  section: { marginBottom: spacing.md, padding: spacing.md },
  sectionTitle: {
    ...typography.styles.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  profileName: { ...typography.styles.h4, fontWeight: '700', marginBottom: 4 },
  profileMeta: { ...typography.styles.bodySmall, marginBottom: 2 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  optionText: { ...typography.styles.bodySmall, fontWeight: '600' },
  actionBtn: { marginTop: spacing.sm },
  version: { ...typography.styles.caption, textAlign: 'center', marginTop: spacing.xl },
});

export default SettingsScreen;
