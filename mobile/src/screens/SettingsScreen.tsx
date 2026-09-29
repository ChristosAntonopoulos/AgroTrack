import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Switch,
  Pressable,
  Modal,
} from 'react-native';
import { useLayoutEffect } from 'react';
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
import type { FontScale } from '../experience/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { changeAppLanguage } from '../i18n';
import { isMockMode } from '../services/serviceFactory';
import { NOTIFICATION_PREF_KEYS } from '../services/userPreferencesService';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: ThemeMode[] = ['system', 'light', 'dark'];
const START_VIEWS: DefaultStartView[] = ['chronologio', 'fields'];
const DATE_FORMATS: DateFormatPref[] = ['dd/MM/yyyy', 'yyyy-MM-dd', 'medium'];
const FONT_SCALES: FontScale[] = ['default', 'large', 'xl'];
const SAMPLE = new Date(2026, 8, 9);

const formatSample = (format: DateFormatPref, language: AppLanguage) => {
  const d = SAMPLE;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (format === 'dd/MM/yyyy') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (format === 'yyyy-MM-dd') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.toLocaleDateString(
    language === 'el' ? 'el-GR' : language === 'it' ? 'it-IT' : 'en-US',
    {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const initialsOf = (name: string, email?: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
  return (email?.[0] || '?').toUpperCase();
};

type SheetOption = { value: string; label: string };

const SettingsScreen = () => {
  const { user, logout, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['settings', 'common', 'nav', 'onboarding', 'auth']);
  const activation = useOwnerActivationOptional();
  const {
    language,
    themeMode,
    setLanguage,
    setThemeMode,
    fontScale,
    setFontScale,
    largeControls,
    setLargeControls,
    defaultView,
    setDefaultView,
    dateFormat,
    setDateFormat,
    notificationPrefs,
    setNotificationPref,
    tapMin,
    fontScaleMultiplier,
  } = usePreferences();
  const navigation = useNavigation<Nav>();
  const [savedFlash, setSavedFlash] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [sheet, setSheet] = useState<'language' | 'date' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlH = largeControls ? Math.max(50, tapMin) : 42;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('settings:title'),
      headerShadowVisible: false,
    });
  }, [navigation, t]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
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
    setSheet(null);
    flashSaved();
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || '—';
  const roleLabel = user?.role
    ? t(`settings:roles.${user.role}`, { defaultValue: user.role })
    : t('settings:roles.account');

  const Segmented = ({
    options,
    value,
    onChange,
  }: {
    options: SheetOption[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <View style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.segmentItem,
              {
                minHeight: controlH,
                backgroundColor: on ? colors.primaryLight : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: on ? colors.primary : colors.textSecondary,
                fontWeight: on ? '700' : '500',
                fontSize: 13 * fontScaleMultiplier,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const SelectRow = ({
    title,
    valueLabel,
    onPress,
  }: {
    title: string;
    valueLabel: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.selectRow, { minHeight: Math.max(48, controlH + 6) }]}
      accessibilityRole="button"
    >
      <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {title}
      </Text>
      <View style={styles.selectValue}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }} numberOfLines={1}>
          {valueLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
        {title}
      </Text>
      <View style={[styles.panel, { backgroundColor: colors.surfaceElevated }]}>{children}</View>
    </View>
  );

  const FieldBlock = ({
    title,
    hint,
    children,
  }: {
    title: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.fieldBlock}>
      <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {title}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier }]}>
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );

  const languageLabel =
    language === 'el'
      ? t('common:greek')
      : language === 'it'
        ? t('common:italian')
        : t('common:english');
  const dateLabel = formatSample(dateFormat, language);

  const sheetOptions: SheetOption[] =
    sheet === 'language'
      ? [
          { value: 'el', label: t('common:greek') },
          { value: 'en', label: t('common:english') },
          { value: 'it', label: t('common:italian') },
        ]
      : DATE_FORMATS.map((fmt) => ({ value: fmt, label: formatSample(fmt, language) }));

  return (
    <ScreenLayout scroll padded canvasOpacity={0.35} contentContainerStyle={styles.content}>
      <Text style={[styles.autosave, { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }]}>
        {savedFlash ? `✓ ${t('settings:saved')}` : t('settings:autosaveHint')}
      </Text>

      <Group title={t('settings:sections.account')}>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              {initialsOf(displayName, user?.email)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.profileName, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {user?.email ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            <Text style={{ color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier, marginTop: 2 }}>
              {roleLabel}
            </Text>
          </View>
        </View>
      </Group>

      <Group title={t('settings:sections.notifications')}>
        <Text style={[styles.hint, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier }]}>
          {t(isMockMode() ? 'settings:notifications.accountHintDemo' : 'settings:notifications.accountHint')}
        </Text>
        {NOTIFICATION_PREF_KEYS.map((key, index) => (
          <View key={key}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.gray200 }]} /> : null}
            <View style={[styles.switchRow, { minHeight: Math.max(52, controlH + 10) }]}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
                  {t(`settings:notifications.prefs.${key}`)}
                </Text>
                <Text
                  style={[
                    styles.hint,
                    { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier, marginBottom: 0 },
                  ]}
                >
                  {t(`settings:notifications.prefsHints.${key}`)}
                </Text>
              </View>
              <Switch
                value={notificationPrefs[key]}
                onValueChange={(enabled) => {
                  void setNotificationPref(key, enabled)
                    .then(flashSaved)
                    .catch(() => Alert.alert(t('settings:saveError')));
                }}
                trackColor={{ false: colors.warmStone, true: colors.sage }}
                thumbColor={colors.white}
                accessibilityLabel={t(`settings:notifications.prefs.${key}`)}
              />
            </View>
          </View>
        ))}
      </Group>

      <Group title={t('settings:sections.appearance')}>
        <FieldBlock title={t('settings:theme')} hint={t(`settings:themeHints.${themeMode}`)}>
          <Segmented
            value={themeMode}
            options={THEME_OPTIONS.map((mode) => ({
              value: mode,
              label: t(`settings:themes.${mode}`),
            }))}
            onChange={(v) => void setThemeMode(v as ThemeMode).then(flashSaved)}
          />
        </FieldBlock>

        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        <FieldBlock title={t('settings:experience.fontScale')}>
          <Segmented
            value={fontScale}
            options={FONT_SCALES.map((scale) => ({
              value: scale,
              label: t(`settings:experience.fontScales.${scale}`),
            }))}
            onChange={(v) => void setFontScale(v as FontScale).then(flashSaved)}
          />
        </FieldBlock>

        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('settings:experience.easyUsePreset')}
          </Text>
          <Text style={[styles.hint, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier }]}>
            {t('settings:experience.easyUsePresetDesc')}
          </Text>
          <Button
            title={t('settings:experience.easyUseApply')}
            variant="secondary"
            onPress={() => {
              void setFontScale('large')
                .then(() => setLargeControls(true))
                .then(flashSaved);
            }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        <View style={[styles.switchRow, { minHeight: Math.max(52, controlH + 10) }]}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
              {t('settings:experience.largeControls')}
            </Text>
            <Text style={[styles.hint, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier, marginBottom: 0 }]}>
              {t('settings:experience.largeControlsDesc')}
            </Text>
          </View>
          <Switch
            value={largeControls}
            onValueChange={(v) => {
              void setLargeControls(v).then(flashSaved);
            }}
            trackColor={{ false: colors.warmStone, true: colors.sage }}
            thumbColor={colors.white}
          />
        </View>
      </Group>

      <Group title={t('settings:sections.locale')}>
        <SelectRow
          title={t('settings:language')}
          valueLabel={languageLabel}
          onPress={() => setSheet('language')}
        />
        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
        <SelectRow
          title={t('settings:dateFormat')}
          valueLabel={dateLabel}
          onPress={() => setSheet('date')}
        />
      </Group>

      <Group title={t('settings:sections.startup')}>
        <FieldBlock title={t('settings:startup')} hint={t('settings:startupHint')}>
          <Segmented
            value={defaultView}
            options={START_VIEWS.map((view) => ({
              value: view,
              label: t(`settings:startupOptions.${view}`),
            }))}
            onChange={(v) => void setDefaultView(v as DefaultStartView).then(flashSaved)}
          />
        </FieldBlock>
        {isFieldOwner() ? (
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={t('onboarding:settings.showTips')}
              variant="outline"
              onPress={() => {
                activation?.reopen();
                flashSaved();
              }}
              fullWidth
            />
          </View>
        ) : null}
      </Group>

      <Group title={t('nav:help', { defaultValue: 'Help' })}>
        <SelectRow
          title={t('nav:help', { defaultValue: 'Help' })}
          valueLabel=""
          onPress={() => navigation.navigate('Help')}
        />
        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
        <SelectRow
          title={t('nav:feedback', { defaultValue: 'Feedback' })}
          valueLabel=""
          onPress={() => navigation.navigate('Feedback')}
        />
      </Group>

      <Group title={t('settings:sections.legal')}>
        <SelectRow
          title={t('auth:login.privacy')}
          valueLabel=""
          onPress={() => navigation.navigate('Legal', { kind: 'privacy' })}
        />
        <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
        <SelectRow
          title={t('auth:login.terms')}
          valueLabel=""
          onPress={() => navigation.navigate('Legal', { kind: 'terms' })}
        />
      </Group>

      <Group title={t('settings:sections.advanced')}>
        <Pressable
          onPress={() => setTechOpen((v) => !v)}
          style={[styles.selectRow, { minHeight: Math.max(48, controlH + 6) }]}
        >
          <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('settings:sections.technical')}
          </Text>
          <Ionicons
            name={techOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </Pressable>
        {techOpen ? (
          <View style={styles.techBody}>
            <View style={styles.techLine}>
              <Text style={{ color: colors.textTertiary }}>{t('settings:appVersion')}</Text>
              <Text style={{ color: colors.textSecondary }}>1.0.0</Text>
            </View>
            <View style={styles.techLine}>
              <Text style={{ color: colors.textTertiary }}>{t('settings:userId')}</Text>
              <Text style={{ color: colors.textSecondary }} numberOfLines={1}>
                {user?.id || '—'}
              </Text>
            </View>
            <View style={styles.techLine}>
              <Text style={{ color: colors.textTertiary }}>{t('settings:language')}</Text>
              <Text style={{ color: colors.textSecondary }}>{languageLabel}</Text>
            </View>
          </View>
        ) : null}
      </Group>

      <Button
        title={t('settings:logout')}
        variant="ghost"
        onPress={handleLogout}
        fullWidth
        style={{ marginTop: spacing.md }}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.error} />}
      />

      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSheet(null)} />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            {sheet === 'language' ? t('settings:language') : t('settings:dateFormat')}
          </Text>
          {sheetOptions.map((opt) => {
            const selected =
              sheet === 'language' ? language === opt.value : dateFormat === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  if (sheet === 'language') void handleLanguage(opt.value as AppLanguage);
                  else {
                    void setDateFormat(opt.value as DateFormatPref).then(() => {
                      setSheet(null);
                      flashSaved();
                    });
                  }
                }}
                style={[styles.sheetOption, { minHeight: controlH + 8 }]}
              >
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontWeight: selected ? '700' : '500',
                    fontSize: 16 * fontScaleMultiplier,
                  }}
                >
                  {opt.label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  autosave: { marginBottom: spacing.md, fontWeight: '500' },
  group: { marginBottom: spacing.lg },
  groupTitle: {
    ...typography.styles.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  panel: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontWeight: '700' },
  fieldBlock: { paddingVertical: spacing.md },
  rowTitle: { fontWeight: '600' },
  hint: { marginTop: 4, marginBottom: spacing.sm, lineHeight: 18 },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  selectValue: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  techBody: { paddingBottom: spacing.md, gap: spacing.sm },
  techLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(28, 36, 24, 0.4)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontWeight: '800', fontSize: 18, marginBottom: spacing.sm },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});

export default SettingsScreen;
