import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useHarvestCampaignOptional } from '../context/HarvestCampaignContext';
import { useFamilyMembershipModules } from '../hooks/useFamilyMembershipModules';
import type { FamilyModule } from '../services/familyService';
import { useTasks } from '../hooks/useTasks';
import { openHarvestCampaign } from '../navigation/intents';
import type { RootStackParamList } from '../navigation/types';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { oilStockService } from '../services/oilStockService';
import { photoService } from '../services/photoService';
import { isActiveFieldTask } from '../services/fieldWorkService';
import { radii, spacing, typography } from '../theme';
import { athensCalendarDateKey } from '../utils/athensDate';
import { isTaskDueToday, isTaskOverdue } from '../utils/taskListUtils';

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

type CardTone = 'neutral' | 'active' | 'attention';

type CardModel = {
  id: ModuleId;
  icon: IconName;
  motif: IconName;
  title: string;
  helper: string;
  status: string;
  tone: CardTone;
  badge?: string;
  onPress: () => void;
};

const LauncherScreen: React.FC = () => {
  const { t } = useTranslation('nav');
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const harvest = useHarvestCampaignOptional();
  const familyModules = useFamilyMembershipModules();
  const { tasks, loading } = useTasks();
  const [fieldCount, setFieldCount] = useState<number | null>(null);
  const [oilLitres, setOilLitres] = useState<number | null>(null);
  const [oilTins, setOilTins] = useState(0);
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [partnerCount, setPartnerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (user?.id) {
      getFieldService()
        .getFields(user.id, user.role || 'FieldOwner')
        .then((list) => {
          if (!cancelled) setFieldCount(list.length);
        })
        .catch(() => {
          if (!cancelled) setFieldCount(null);
        });
    }
    oilStockService
      .getSummary()
      .then((summary) => {
        if (cancelled) return;
        setOilLitres(summary.physical.litres);
        setOilTins(summary.physical.tin16 + summary.physical.tin17);
      })
      .catch(() => {
        if (!cancelled) setOilLitres(null);
      });
    photoService
      .query({ page: 1, pageSize: 1 })
      .then((list) => {
        if (!cancelled) setPhotoCount(list.totalCount);
      })
      .catch(() => {
        if (!cancelled) setPhotoCount(null);
      });
    getPartnerService()
      .getContacts()
      .then((contacts) => {
        if (!cancelled) setPartnerCount(contacts.length);
      })
      .catch(() => {
        if (!cancelled) setPartnerCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  const allowed = (module: FamilyModule) => familyModules === null || familyModules.has(module);
  const role = user?.role || '';
  const canMoney = ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'].includes(role);

  const openTasks = tasks.filter(isActiveFieldTask);
  const overdue = openTasks.filter((task) => isTaskOverdue(task)).length;
  const dueToday = openTasks.filter((task) => isTaskDueToday(task)).length;
  const todayKey = athensCalendarDateKey(new Date());
  const sacksToday = (harvest?.campaign.sacks ?? [])
    .filter((row) => row.date.slice(0, 10) === todayKey)
    .reduce((sum, row) => sum + (Number(row.sacks) || 0), 0);
  const tasksNeedAttention = !loading && (overdue > 0 || dueToday > 0);

  const cards = useMemo(() => {
    const items: CardModel[] = [];
    const push = (card: CardModel | null) => {
      if (card) items.push(card);
    };

    push(
      allowed('chronologio')
        ? {
            id: 'chronologio',
            icon: 'time-outline',
            motif: 'time-outline',
            title: t('chronologio'),
            helper: t('launcher.helpers.chronologio'),
            status: '',
            tone: 'neutral',
            onPress: () => navigation.navigate('Main', { screen: 'ChronologioTab' }),
          }
        : null
    );
    push(
      allowed('fields')
        ? {
            id: 'fields',
            icon: 'leaf-outline',
            motif: 'leaf-outline',
            title: t('fields'),
            helper: t('launcher.helpers.fields'),
            status:
              fieldCount == null
                ? ' '
                : fieldCount === 0
                  ? t('launcher.status.fieldsEmpty')
                  : t('launcher.fields', { count: fieldCount }),
            tone: 'neutral',
            onPress: () =>
              navigation.navigate('Main', { screen: 'Fields', params: { screen: 'FieldsHome' } }),
          }
        : null
    );
    push(
      allowed('tasks')
        ? {
            id: 'tasks',
            icon: 'checkmark-circle-outline',
            motif: 'checkmark-circle-outline',
            title: t('tasks'),
            helper: t('launcher.helpers.tasks'),
            status: loading
              ? ' '
              : openTasks.length === 0
                ? t('launcher.status.tasksEmpty')
                : dueToday > 0
                  ? t('launcher.status.tasksTodayLine', { pending: openTasks.length, today: dueToday })
                  : overdue > 0
                    ? t('launcher.status.tasksOverdue', { count: overdue })
                    : t('launcher.status.tasksPending', { count: openTasks.length }),
            tone: tasksNeedAttention ? 'attention' : 'neutral',
            onPress: () => navigation.navigate('Main', { screen: 'Tasks' }),
          }
        : null
    );
    push(
      allowed('harvest')
        ? {
            id: 'harvest',
            icon: 'basket-outline',
            motif: 'basket-outline',
            title: t('launcher.modules.harvest'),
            helper: t('launcher.helpers.harvest'),
            status: harvest?.isLive
              ? sacksToday > 0
                ? t('launcher.status.sacks', { count: sacksToday })
                : ' '
              : t('launcher.status.harvestIdle'),
            badge: harvest?.isLive ? t('launcher.status.inProgress') : undefined,
            tone: harvest?.isLive ? 'active' : 'neutral',
            onPress: () => openHarvestCampaign(navigation),
          }
        : null
    );
    push(
      canMoney && (allowed('money') || allowed('harvest'))
        ? {
            id: 'myOil',
            icon: 'water-outline',
            motif: 'water-outline',
            title: t('myOil'),
            helper: t('launcher.helpers.myOil'),
            status:
              oilLitres == null
                ? ' '
                : oilLitres <= 0 && oilTins <= 0
                  ? t('launcher.status.oilEmpty')
                  : oilTins > 0
                    ? t('launcher.status.oilLine', { litres: Math.round(oilLitres), tins: oilTins })
                    : t('launcher.status.oilLitres', { count: Math.round(oilLitres) }),
            tone: 'neutral',
            onPress: () => navigation.navigate('MyOil'),
          }
        : null
    );
    push(
      canMoney && allowed('money')
        ? {
            id: 'money',
            icon: 'cash-outline',
            motif: 'receipt-outline',
            title: t('launcher.modules.money'),
            helper: t('launcher.helpers.money'),
            status: t('launcher.status.money'),
            tone: 'neutral',
            onPress: () => navigation.navigate('Money'),
          }
        : null
    );
    push(
      allowed('photos')
        ? {
            id: 'photos',
            icon: 'images-outline',
            motif: 'images-outline',
            title: t('photos'),
            helper: t('launcher.helpers.photos'),
            status:
              photoCount == null
                ? ' '
                : photoCount === 0
                  ? t('launcher.status.photosEmpty')
                  : t('launcher.status.photos', { count: photoCount }),
            tone: 'neutral',
            onPress: () => navigation.navigate('Photos'),
          }
        : null
    );
    push(
      familyModules === null
        ? {
            id: 'partners',
            icon: 'people-outline',
            motif: 'people-outline',
            title: t('partners'),
            helper: t('launcher.helpers.partners'),
            status:
              partnerCount == null
                ? ' '
                : partnerCount === 0
                  ? t('launcher.status.partnersEmpty')
                  : t('launcher.status.partners', { count: partnerCount }),
            tone: 'neutral',
            onPress: () => navigation.navigate('Partners'),
          }
        : null
    );
    return items;
  }, [
    allowed,
    canMoney,
    dueToday,
    familyModules,
    fieldCount,
    harvest?.isLive,
    loading,
    navigation,
    oilLitres,
    oilTins,
    openTasks.length,
    overdue,
    partnerCount,
    photoCount,
    sacksToday,
    tasksNeedAttention,
    t,
  ]);

  const subtitleParts: string[] = [];
  if (fieldCount != null && fieldCount > 0) subtitleParts.push(t('launcher.fields', { count: fieldCount }));
  else if (fieldCount === 0) subtitleParts.push(t('launcher.status.fieldsEmpty'));

  return (
    <ScreenLayout scroll tabBarInset padded>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.appIcon}
        accessibilityRole="image"
        accessibilityLabel={t('common:appName', { defaultValue: 'Oleachron' })}
      />
      <View style={styles.identity}>
        <View style={styles.identityCopy}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitleParts.join(' · ') || t('launcher.calm')}
          </Text>
        </View>
        <HeaderIconButton
          icon="notifications-outline"
          accessibilityLabel={t('inbox')}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      <View style={styles.grid} accessibilityRole="list">
        {cards.map((card) => {
          const active = card.tone === 'active';
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={card.title}
              onPress={card.onPress}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: active ? colors.surfaceSelected : colors.surfaceElevated,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 1 : StyleSheet.hairlineWidth,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={card.motif}
                size={78}
                color={colors.primary}
                style={styles.motif}
              />
              <View style={[styles.iconWell, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={card.icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {card.title}
              </Text>
              <Text style={[styles.helper, { color: colors.textSecondary }]} numberOfLines={1}>
                {card.helper}
              </Text>
              {card.badge ? (
                <View style={[styles.badge, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
                  <View style={[styles.badgeDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{card.badge}</Text>
                </View>
              ) : null}
              {card.status.trim() ? (
                <View style={styles.statusRow}>
                  {card.tone === 'attention' ? (
                    <View style={[styles.attentionDot, { backgroundColor: colors.warning }]} />
                  ) : null}
                  <Text
                    style={[styles.status, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {card.status}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, styles.accountLabel, { color: colors.textSecondary }]}>
        {t('launcher.utilities')}
      </Text>
      <View style={styles.utilities}>
        <UtilityRow
          icon="settings-outline"
          label={t('launcher.settings')}
          onPress={() => navigation.navigate('Settings')}
        />
        <UtilityRow
          icon="heart-outline"
          label={t('launcher.feedback')}
          onPress={() => navigation.navigate('Feedback')}
        />
        <UtilityRow
          icon="help-circle-outline"
          label={t('launcher.help')}
          onPress={() => navigation.navigate('Help')}
        />
      </View>
    </ScreenLayout>
  );
};

const UtilityRow: React.FC<{ icon: IconName; label: string; onPress: () => void }> = ({
  icon,
  label,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.utility, { borderBottomColor: colors.border }]}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.utilityLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  appIcon: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    borderRadius: 16,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 1,
    fontSize: typography.fontSize.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  motif: {
    position: 'absolute',
    right: -10,
    bottom: -14,
    opacity: 0.07,
  },
  iconWell: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    fontWeight: '600',
  },
  helper: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  statusRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  status: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  accountLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  utilities: {},
  utility: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  utilityLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
});

export default LauncherScreen;
