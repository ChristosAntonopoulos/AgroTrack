import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Switch,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  usePreferences,
  AppLanguage,
  DefaultStartView,
  DateFormatPref,
} from '../context/PreferencesContext';
import { ThemeMode } from '../theme/themes';
import type { ExperienceMode, FontScale } from '../experience/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { changeAppLanguage } from '../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: ThemeMode[] = ['system', 'light', 'dark'];
const START_VIEWS: DefaultStartView[] = ['today', 'fields', 'chronologio'];
const DATE_FORMATS: DateFormatPref[] = ['dd/MM/yyyy', 'yyyy-MM-dd', 'medium'];
const SAMPLE = new Date(2026, 8, 9);

const formatSample = (format: DateFormatPref, language: AppLanguage) => {
  const d = SAMPLE;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (format === 'dd/MM/yyyy') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (format === 'yyyy-MM-dd') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common', 'nav']);
  const {
    language,
    themeMode,
    setLanguage,
    setThemeMode,
    experienceMode,
    setExperienceMode,
    fontScale,
    setFontScale,
    largeControls,
    setLargeControls,
    defaultView,
    setDefaultView,
    dateFormat,
    setDateFormat,
    tapMin,
    fontScaleMultiplier,
  } = usePreferences();
  const navigation = useNavigation<Nav>();
  const [savedFlash, setSavedFlash] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleLogout = () => {
    Alert.alert(t('settings:logout'), t('settings:logoutConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('settings:logout'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleLanguage = async (lang: AppLanguage) => {
    await setLanguage(lang);
    await changeAppLanguage(lang);
    flashSaved();
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
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        {
          minHeight: Math.max(44, tapMin),
          backgroundColor: selected ? colors.primaryDark : colors.surfaceMuted,
          borderColor: selected ? colors.primaryDark : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.optionText,
          {
            color: selected ? colors.textInverse : colors.textPrimary,
            fontSize: 14 * fontScaleMultiplier,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || '—';

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <ScreenHeader title={t('settings:title')} subtitle={t('settings:subtitle')} />

      {savedFlash ? (
        <Text style={[styles.saved, { color: colors.success }]}>
          ✓ {t('settings:saved')}
        </Text>
      ) : (
        <Text style={[styles.autosave, { color: colors.textTertiary }]}>
          {t('settings:autosaveHint')}
        </Text>
      )}

      <Section title={t('settings:sections.account')}>
        <Text style={[styles.name, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier }]}>
          {displayName}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
          {user?.email}
        </Text>
        <Button
          title={t('settings:myServices')}
          variant="outline"
          onPress={() => navigation.navigate('MyServices')}
          fullWidth
          style={styles.actionBtn}
        />
      </Section>

      <Section title={t('settings:sections.appearance')}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('settings:theme')}</Text>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {t(`settings:themeHints.${themeMode}`)}
        </Text>
        <View style={styles.optionRow}>
          {THEME_OPTIONS.map((mode) => (
            <OptionRow
              key={mode}
              label={t(`settings:themes.${mode}`)}
              selected={themeMode === mode}
              onPress={() => {
                void setThemeMode(mode).then(flashSaved);
              }}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textPrimary, marginTop: spacing.md }]}>
          {t('settings:experience.label')}
        </Text>
        <View style={styles.optionRow}>
          <OptionRow
            label={t('settings:experience.everyday')}
            selected={experienceMode === 'everyday'}
            onPress={() => {
              void setExperienceMode('everyday' as ExperienceMode).then(flashSaved);
            }}
          />
          <OptionRow
            label={t('settings:experience.full')}
            selected={experienceMode === 'full'}
            onPress={() => {
              void setExperienceMode('full' as ExperienceMode).then(flashSaved);
            }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {experienceMode === 'everyday'
            ? t('settings:experience.everydayDesc')
            : t('settings:experience.fullDesc')}
        </Text>

        <Text style={[styles.label, { color: colors.textPrimary, marginTop: spacing.md }]}>
          {t('settings:experience.fontScale')}
        </Text>
        <View style={styles.optionRow}>
          {(['default', 'large', 'xl'] as FontScale[]).map((scale) => (
            <OptionRow
              key={scale}
              label={t(`settings:experience.fontScales.${scale}`)}
              selected={fontScale === scale}
              onPress={() => {
                void setFontScale(scale).then(flashSaved);
              }}
            />
          ))}
        </View>

        <View style={[styles.switchRow, { minHeight: Math.max(44, tapMin) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('settings:experience.largeControls')}
            </Text>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {t('settings:experience.largeControlsDesc')}
            </Text>
          </View>
          <Switch
            value={largeControls}
            onValueChange={(v) => {
              void setLargeControls(v).then(flashSaved);
            }}
            trackColor={{ false: colors.border, true: colors.primaryDark }}
            thumbColor={colors.textInverse}
          />
        </View>
      </Section>

      <Section title={t('settings:sections.locale')}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('settings:language')}</Text>
        <View style={styles.optionRow}>
          <OptionRow
            label={t('common:greek')}
            selected={language === 'el'}
            onPress={() => void handleLanguage('el')}
          />
          <OptionRow
            label={t('common:english')}
            selected={language === 'en'}
            onPress={() => void handleLanguage('en')}
          />
        </View>

        <Text style={[styles.label, { color: colors.textPrimary, marginTop: spacing.md }]}>
          {t('settings:dateFormat')}
        </Text>
        <View style={styles.optionRow}>
          {DATE_FORMATS.map((fmt) => (
            <OptionRow
              key={fmt}
              label={formatSample(fmt, language)}
              selected={dateFormat === fmt}
              onPress={() => {
                void setDateFormat(fmt).then(flashSaved);
              }}
            />
          ))}
        </View>
      </Section>

      <Section title={t('settings:sections.startup')}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{t('settings:startup')}</Text>
        <View style={styles.optionRow}>
          {START_VIEWS.map((view) => (
            <OptionRow
              key={view}
              label={t(`settings:startupOptions.${view}`)}
              selected={defaultView === view}
              onPress={() => {
                void setDefaultView(view).then(flashSaved);
              }}
            />
          ))}
        </View>
      </Section>

      <Pressable
        onPress={() => setTechOpen((v) => !v)}
        style={[styles.techToggle, { minHeight: Math.max(44, tapMin) }]}
      >
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
          {t('settings:sections.technical')}
        </Text>
        <Ionicons
          name={techOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {techOpen ? (
        <View style={styles.techBody}>
          <Text style={{ color: colors.textTertiary }}>
            {t('settings:userId')}: {user?.id || '—'}
          </Text>
          <Text style={{ color: colors.textTertiary }}>{t('settings:appVersion')}: 1.0.0</Text>
        </View>
      ) : null}

      <Button
        title={t('settings:logout')}
        variant="ghost"
        onPress={handleLogout}
        fullWidth
        style={{ marginTop: spacing.lg, borderColor: colors.error + '60' }}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.error} />}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  section: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    ...typography.styles.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  name: { ...typography.styles.h4, fontWeight: '700' },
  email: { ...typography.styles.bodySmall, marginTop: 2, marginBottom: spacing.sm },
  label: { ...typography.styles.body, fontWeight: '600', marginBottom: spacing.xs },
  hint: { ...typography.styles.bodySmall, marginBottom: spacing.sm, lineHeight: 20 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  optionText: { ...typography.styles.bodySmall, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  actionBtn: { marginTop: spacing.sm },
  autosave: { ...typography.styles.caption, marginBottom: spacing.sm },
  saved: { ...typography.styles.bodySmall, fontWeight: '700', marginBottom: spacing.sm },
  techToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  techBody: { gap: spacing.xs, marginBottom: spacing.md },
});

export default SettingsScreen;
