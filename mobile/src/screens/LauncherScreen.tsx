import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import BrandLogo from '../components/ui/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useHarvestCampaignOptional } from '../context/HarvestCampaignContext';
import { useTasks } from '../hooks/useTasks';
import { openHarvestCampaign } from '../navigation/intents';
import type { RootStackParamList } from '../navigation/types';
import { oilStockService } from '../services/oilStockService';
import { formatOilLitres } from '../myOil/formatOilPack';
import { isActiveFieldTask } from '../services/fieldWorkService';
import { radii, spacing, typography } from '../theme';
import { isTaskDueToday, isTaskOverdue } from '../utils/taskListUtils';
import GuideTarget from '../components/onboarding/GuideTarget';
import PendingInvitesBanner from '../components/partners/PendingInvitesBanner';
import type { GuideTargetId } from '../onboarding/steps';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ModuleId =
  | 'chronologio'
  | 'fields'
  | 'tasks'
  | 'harvest'
  | 'myOil'
  | 'money'
  | 'photos'
  | 'partners';

type StatusKind = 'none' | 'value' | 'success' | 'idle' | 'neutral' | 'attention' | 'oil' | 'production';

type CardModel = {
  id: ModuleId;
  icon: IconName;
  motif: IconName;
  title: string;
  helper: string;
  status: string;
  statusKind: StatusKind;
  /** Harvest season is open — the card itself should stand out. */
  live?: boolean;
  onPress: () => void;
};

const GOLD_MODULES = new Set<ModuleId>(['harvest', 'myOil']);

const cardShadow: ViewStyle = {
  shadowColor: '#273625',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.055,
  shadowRadius: 18,
  elevation: 1,
};

const groupShadow: ViewStyle = {
  shadowColor: '#273625',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 1,
};

const LauncherScreen: React.FC = () => {
  const { t, i18n } = useTranslation('nav');
  const { colors, isDark, fontScaleMultiplier: scale } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const harvest = useHarvestCampaignOptional();
  const { tasks, loading } = useTasks();
  const [oilFreeLitres, setOilFreeLitres] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    oilStockService
      .getSummary()
      .then((summary) => {
        if (!cancelled) setOilFreeLitres(summary.available.litres);
      })
      .catch(() => {
        if (!cancelled) setOilFreeLitres(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const role = user?.role || '';
  const canMoney = ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'].includes(role);

  const openTasks = tasks.filter(isActiveFieldTask);
  const overdue = openTasks.filter((task) => isTaskOverdue(task)).length;
  const dueToday = openTasks.filter((task) => isTaskDueToday(task)).length;
  const sacksTotal = (harvest?.campaign.sacks ?? []).reduce(
    (sum, row) => sum + (Number(row.sacks) || 0),
    0
  );
  const tasksNeedAttention = !loading && (overdue > 0 || dueToday > 0);

  const cards = useMemo(() => {
    const items: CardModel[] = [];
    const push = (card: CardModel | null) => {
      if (card) items.push(card);
    };

    // Product modules stay visible; permissions filter grove data inside each screen.
    push({
      id: 'chronologio',
      icon: 'time-outline',
      motif: 'time-outline',
      title: t('chronologio'),
      helper: t('launcher.helpers.chronologio'),
      status: '',
      statusKind: 'none',
      onPress: () => navigation.navigate('Main', { screen: 'ChronologioTab' }),
    });
    push({
      id: 'fields',
      icon: 'leaf-outline',
      motif: 'leaf-outline',
      title: t('fields'),
      helper: t('launcher.helpers.fields'),
      status: '',
      statusKind: 'none',
      onPress: () =>
        navigation.navigate('Main', { screen: 'Fields', params: { screen: 'FieldsHome' } }),
    });
    push({
      id: 'tasks',
      icon: 'checkmark-circle-outline',
      motif: 'checkmark-circle-outline',
      title: t('tasks'),
      helper: '',
      status: loading
        ? ' '
        : openTasks.length === 0
          ? t('launcher.status.tasksEmpty')
          : dueToday > 0
            ? t('launcher.status.tasksTodayLine', { pending: openTasks.length, today: dueToday })
            : overdue > 0
              ? t('launcher.status.tasksOverdue', { count: overdue })
              : t('launcher.status.tasksPending', { count: openTasks.length }),
      statusKind: loading
        ? 'none'
        : openTasks.length === 0
          ? 'success'
          : tasksNeedAttention
            ? 'attention'
            : 'value',
      onPress: () => navigation.navigate('Main', { screen: 'Tasks' }),
    });
    push({
      id: 'harvest',
      icon: 'basket-outline',
      motif: 'basket-outline',
      title: t('launcher.modules.harvest'),
      helper: '',
      live: Boolean(harvest?.isLive),
      status: harvest?.isLive
        ? sacksTotal > 0
          ? t('launcher.status.sacks', { count: sacksTotal })
          : t('launcher.status.inProgress')
        : '',
      statusKind: harvest?.isLive ? 'production' : 'none',
      onPress: () => openHarvestCampaign(navigation),
    });
    push(
      canMoney
        ? {
            id: 'myOil',
            icon: 'cube-outline',
            motif: 'cube-outline',
            title: t('myOil'),
            helper: '',
            status: oilFreeLitres == null ? '' : formatOilLitres(oilFreeLitres, i18n.language),
            statusKind: oilFreeLitres == null ? 'none' : 'oil',
            onPress: () => navigation.navigate('MyOil'),
          }
        : null
    );
    push(
      canMoney
        ? {
            id: 'money',
            icon: 'cash-outline',
            motif: 'receipt-outline',
            title: t('launcher.modules.money'),
            helper: t('launcher.helpers.money'),
            status: '',
            statusKind: 'none',
            onPress: () => navigation.navigate('Money'),
          }
        : null
    );
    push({
      id: 'photos',
      icon: 'images-outline',
      motif: 'images-outline',
      title: t('photos'),
      helper: '',
      status: '',
      statusKind: 'none',
      onPress: () => navigation.navigate('Photos'),
    });
    push({
      id: 'partners',
      icon: 'people-outline',
      motif: 'people-outline',
      title: t('partners'),
      helper: '',
      status: '',
      statusKind: 'none',
      onPress: () => navigation.navigate('Partners'),
    });
    return items;
  }, [
    canMoney,
    dueToday,
    harvest?.isLive,
    loading,
    navigation,
    oilFreeLitres,
    openTasks.length,
    overdue,
    sacksTotal,
    tasksNeedAttention,
    t,
    i18n.language,
  ]);

  const pressedSurface = isDark ? colors.surfaceHover : '#F5F7F0';
  const oliveInk = isDark ? colors.olive : '#52733F';
  const iconTile = isDark ? colors.primaryLight : '#E6EDDE';
  const iconInk = isDark ? colors.primary : '#587747';
  const goldTile = isDark ? 'rgba(180, 138, 71, 0.2)' : '#F2EBDD';
  const goldInk = isDark ? colors.accentGold : '#9A7135';

  return (
    <ScreenLayout scroll tabBarInset padded canvasOpacity={0.38} canvasSettle>
      <View style={styles.brandRow}>
        <BrandLogo
          variant="horizontal"
          tone={isDark ? 'on-dark' : 'on-light'}
          size={40}
        />
        <HeaderIconButton
          paper
          icon="notifications-outline"
          accessibilityLabel={t('inbox')}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      <PendingInvitesBanner />

      <View style={styles.grid} accessibilityRole="list">
        {cards.map((card) => {
          const gold = GOLD_MODULES.has(card.id);
          const showStatus =
            card.statusKind === 'oil' ||
            (card.statusKind !== 'none' && card.status.trim().length > 0);
          const capsule =
            card.statusKind === 'success'
              ? { bg: isDark ? colors.successLight : '#E5EDDC', fg: oliveInk, mark: '✓' }
              : card.statusKind === 'idle'
                ? { bg: goldTile, fg: goldInk, mark: '○' }
                : card.statusKind === 'neutral'
                  ? { bg: isDark ? colors.neutralLight : '#EEF2E7', fg: colors.textSecondary, mark: '—' }
                  : null;
          const valueColor =
            card.statusKind === 'production'
              ? goldInk
              : card.statusKind === 'attention'
                ? isDark
                  ? colors.warning
                  : '#8A6230'
                : colors.textPrimary;

          const coachId: GuideTargetId | null =
            card.id === 'fields' ? 'fieldsCard' : card.id === 'chronologio' ? 'historyCard' : null;
          const pressable = (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[card.title, card.helper, card.status]
                .filter((part) => part && part.trim())
                .join('. ')}
              onPress={card.onPress}
              style={({ pressed }) => [
                styles.cardShell,
                coachId ? styles.cardInSlot : null,
                card.live ? styles.cardLive : null,
                !isDark && cardShadow,
                {
                  backgroundColor: pressed
                    ? pressedSurface
                    : card.live
                      ? isDark
                        ? 'rgba(180, 138, 71, 0.18)'
                        : '#FBF6EC'
                      : colors.surfaceElevated,
                  borderColor: card.live ? goldInk : colors.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View pointerEvents="none" style={styles.motifClip}>
                <Ionicons
                  name={card.motif}
                  size={78}
                  color={gold ? goldInk : oliveInk}
                  style={[styles.motif, { opacity: gold ? 0.14 : 0.11 }]}
                />
              </View>
              <View style={[styles.iconWell, { backgroundColor: gold ? goldTile : iconTile }]}>
                <Ionicons name={card.icon} size={18} color={gold ? goldInk : iconInk} />
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: card.live ? goldInk : colors.textPrimary,
                    fontSize: 18 * scale,
                    lineHeight: 22 * scale,
                  },
                ]}
                numberOfLines={1}
              >
                {card.title}
              </Text>
              {card.helper ? (
                <Text
                  style={[styles.helper, { color: colors.textSecondary, fontSize: 13 * scale, lineHeight: 16 * scale }]}
                  numberOfLines={1}
                >
                  {card.helper}
                </Text>
              ) : null}
              {showStatus ? (
                <View style={styles.statusBlock}>
                  {card.statusKind === 'oil' ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.status, { color: oliveInk, fontSize: 15 * scale, lineHeight: 19 * scale }]}
                    >
                      {card.status}
                    </Text>
                  ) : capsule ? (
                    <View style={[styles.capsule, { backgroundColor: capsule.bg }]}>
                      <Text
                        style={[styles.capsuleText, { color: capsule.fg, fontSize: 13 * scale, lineHeight: 16 * scale }]}
                        numberOfLines={1}
                      >
                        {capsule.mark} {card.status}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={[styles.status, { color: valueColor, fontSize: 15 * scale, lineHeight: 19 * scale }]}
                    >
                      {card.status}
                    </Text>
                  )}
                </View>
              ) : null}
            </Pressable>
          );
          if (!coachId) return <React.Fragment key={card.id}>{pressable}</React.Fragment>;
          // One wrapper only: the card fills the slot (cardInSlot), so the
          // measured rect the spotlight frames is the visible tile.
          return (
            <GuideTarget key={card.id} id={coachId} style={styles.cardSlot}>
              {pressable}
            </GuideTarget>
          );
        })}
      </View>

      <Text
        style={[
          styles.sectionLabel,
          styles.accountLabel,
          { color: colors.textSecondary, fontSize: 13 * scale, lineHeight: 18 * scale },
        ]}
      >
        {t('launcher.utilities')}
      </Text>
      <View style={[styles.accountShell, !isDark && groupShadow]}>
        <View style={[styles.accountCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <UtilityRow
            icon="settings-outline"
            label={t('launcher.settings')}
            onPress={() => navigation.navigate('Settings')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <UtilityRow
            icon="heart-outline"
            label={t('launcher.feedback')}
            onPress={() => navigation.navigate('Feedback')}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <UtilityRow
            icon="help-circle-outline"
            label={t('launcher.help')}
            onPress={() => navigation.navigate('Help')}
          />
        </View>
      </View>
    </ScreenLayout>
  );
};

const UtilityRow: React.FC<{ icon: IconName; label: string; onPress: () => void }> = ({
  icon,
  label,
  onPress,
}) => {
  const { colors, isDark, fontScaleMultiplier: scale } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.utility,
        pressed && { backgroundColor: isDark ? colors.surfaceHover : '#F5F7F0' },
      ]}
    >
      <Ionicons name={icon} size={20} color={isDark ? colors.primary : '#587747'} />
      <Text style={[styles.utilityLabel, { color: colors.textPrimary, fontSize: 16 * scale }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardSlot: {
    width: '47%',
    flexGrow: 1,
  },
  cardInSlot: {
    // Fills the measured GuideTarget slot exactly, so the spotlight ring frames
    // the tile even when the row stretches to the taller neighbour.
    flex: 1,
    width: '100%',
  },
  cardShell: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardLive: {
    borderWidth: 1.5,
  },
  motifClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  motif: {
    position: 'absolute',
    right: -10,
    bottom: -14,
  },
  iconWell: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 1,
  },
  cardTitle: {
    zIndex: 1,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  helper: {
    zIndex: 1,
    marginTop: 1,
    fontFamily: typography.fontFamily.regular,
    fontWeight: '400',
  },
  statusBlock: {
    zIndex: 1,
    marginTop: 6,
  },
  status: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  capsule: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  capsuleText: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
  },
  accountLabel: {
    marginTop: 26,
    marginBottom: 10,
  },
  accountShell: {
    borderRadius: 22,
  },
  accountCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  utility: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  utilityLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontWeight: '500',
  },
});

export default LauncherScreen;
