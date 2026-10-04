import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { RootStackParamList } from '../navigation/types';
import { openChronologioHome } from '../navigation/intents';
import {
  filterHelpTopics,
  HELP_QUICK_ACTIONS,
  type HelpQuickActionId,
  type HelpTopicId,
} from '../help/helpCatalog';
import { spacing, radii } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HelpScreen = () => {
  const { t } = useTranslation(['help', 'common', 'nav']);
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const navigation = useNavigation<Nav>();
  const capture = useCaptureOptional();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<HelpTopicId | null>(null);

  const topics = useMemo(
    () =>
      filterHelpTopics(query, (id) => ({
        title: t(`help:topics.${id}.title`),
        body: t(`help:topics.${id}.body`),
      })),
    [query, t],
  );

  const runQuick = (id: HelpQuickActionId) => {
    switch (id) {
      case 'record':
        capture?.openCapture();
        return;
      case 'chronologio':
        openChronologioHome(navigation);
        return;
      case 'fields':
        navigation.navigate('Main', { screen: 'Fields', params: { screen: 'FieldsHome' } });
        return;
      case 'tasks':
        navigation.navigate('Main', { screen: 'Tasks' });
        return;
      case 'feedback':
        navigation.navigate('Feedback');
        return;
      case 'settings':
        navigation.navigate('Settings');
        return;
    }
  };

  const toggleTopic = (id: HelpTopicId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <ScreenLayout scroll padded contentContainerStyle={styles.content}>
      <View style={styles.lead}>
        <View style={[styles.leadMark, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.leadCopy}>
          <Text style={[styles.kicker, { color: colors.accentGold, fontSize: 12 * fontScaleMultiplier }]}>
            {t('help:kicker')}
          </Text>
          <Text style={[styles.intro, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('help:intro')}
          </Text>
        </View>
      </View>

      <Input
        label={t('help:searchLabel')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('help:searchPlaceholder')}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
        containerStyle={styles.search}
        accessibilityLabel={t('help:searchLabel')}
      />

      <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}>
        {t('help:quickTitle')}
      </Text>
      <View style={styles.quickGrid}>
        {HELP_QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => runQuick(action.id)}
            accessibilityRole="button"
            accessibilityLabel={t(`help:quick.${action.id}`)}
            style={({ pressed }) => [
              styles.quickTile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                minHeight: Math.max(tapMin, 56),
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={action.icon} size={18} color={colors.primary} />
            </View>
            <Text
              style={[styles.quickLabel, { color: colors.textPrimary, fontSize: 13 * fontScaleMultiplier }]}
              numberOfLines={2}
            >
              {t(`help:quick.${action.id}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}>
        {t('help:topicsTitle')}
      </Text>

      {topics.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
            {t('help:searchEmpty')}
          </Text>
          <Button
            title={t('help:sendFeedback')}
            onPress={() => navigation.navigate('Feedback')}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {topics.map((topic, index) => {
            const expanded = openId === topic.id;
            return (
              <View key={topic.id}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                <Pressable
                  onPress={() => toggleTopic(topic.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={[styles.topicRow, { minHeight: Math.max(tapMin, 52) }]}
                >
                  <View style={[styles.topicIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name={topic.icon} size={18} color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.topicTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
                    numberOfLines={2}
                  >
                    {t(`help:topics.${topic.id}.title`)}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
                {expanded ? (
                  <Text
                    style={[styles.topicBody, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}
                  >
                    {t(`help:topics.${topic.id}.body`)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.footer, { borderColor: colors.border }]}>
        <Text style={[styles.footerTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('help:stillStuck')}
        </Text>
        <Text style={[styles.footerBody, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
          {t('help:stillStuckBody')}
        </Text>
        <Button
          title={t('help:sendFeedback')}
          onPress={() => navigation.navigate('Feedback')}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
        <Button
          title={t('help:openSettings')}
          variant="ghost"
          onPress={() => navigation.navigate('Settings')}
          fullWidth
          style={{ marginTop: spacing.xs }}
        />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['2xl'] },
  lead: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, alignItems: 'flex-start' },
  leadMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadCopy: { flex: 1, gap: 4 },
  kicker: { fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  intro: { lineHeight: 22 },
  search: { marginBottom: spacing.lg },
  sectionLabel: { fontWeight: '700', marginBottom: spacing.sm },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickTile: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontWeight: '600' },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: { flex: 1, fontWeight: '600' },
  topicBody: {
    paddingLeft: 40,
    paddingBottom: spacing.md,
    lineHeight: 22,
  },
  divider: { height: StyleSheet.hairlineWidth },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  emptyText: { lineHeight: 22 },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerTitle: { fontWeight: '700', marginBottom: 4 },
  footerBody: { lineHeight: 20, marginBottom: spacing.sm },
});

export default HelpScreen;
