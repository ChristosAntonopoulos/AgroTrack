import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences, AppLanguage } from '../context/PreferencesContext';
import { ThemeMode } from '../theme/themes';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
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
          backgroundColor: selected ? colors.primaryDark : colors.surfaceMuted,
          borderColor: selected ? colors.primaryDark : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.optionText,
          { color: selected ? colors.textInverse : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const roleLabel = user?.role ? t(`common:roles.${user.role}`, { defaultValue: user.role }) : '';

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <ScreenHeader title={t('settings:title')} subtitle={user?.email} />

      <Card variant="elevated" style={styles.section}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
            <Ionicons name="person" size={24} color={colors.primaryDark} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.profileRole, { color: colors.primaryDark }]}>{roleLabel}</Text>
          </View>
        </View>
      </Card>

      <Card variant="outlined" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('settings:language')}
        </Text>
        <View style={styles.optionRow}>
          <OptionRow label={t('common:english')} selected={language === 'en'} onPress={() => handleLanguage('en')} />
          <OptionRow label={t('common:greek')} selected={language === 'el'} onPress={() => handleLanguage('el')} />
        </View>
      </Card>

      <Card variant="outlined" style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('settings:theme')}
        </Text>
        <View style={styles.optionRow}>
          <OptionRow label={t('settings:themes.system')} selected={themeMode === 'system'} onPress={() => handleTheme('system')} />
          <OptionRow label={t('settings:themes.light')} selected={themeMode === 'light'} onPress={() => handleTheme('light')} />
          <OptionRow label={t('settings:themes.dark')} selected={themeMode === 'dark'} onPress={() => handleTheme('dark')} />
        </View>
      </Card>

      {isFieldOwner() ? (
        <Button
          title={t('nav:notifications', { defaultValue: 'Notifications' })}
          variant="outline"
          onPress={() => navigation.navigate('Notifications')}
          fullWidth
          style={styles.actionBtn}
          icon={<Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />}
        />
      ) : null}

      <Button
        title={t('settings:logout')}
        variant="ghost"
        onPress={handleLogout}
        fullWidth
        style={{ marginTop: spacing.sm, borderColor: colors.error + '60' }}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.error} />}
      />

      <Text style={[styles.version, { color: colors.textTertiary }]}>
        {t('common:version')} 1.0.0
      </Text>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    ...typography.styles.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { ...typography.styles.h4, fontWeight: '700' },
  profileRole: { ...typography.styles.bodySmall, fontWeight: '600', marginTop: 2 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: { ...typography.styles.bodySmall, fontWeight: '600' },
  actionBtn: { marginTop: spacing.sm },
  version: { ...typography.styles.caption, textAlign: 'center', marginTop: spacing.xl },
});

export default SettingsScreen;
