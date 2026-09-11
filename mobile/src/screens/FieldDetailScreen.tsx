import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Field } from '../services/fieldService';
import { FieldTask, isActiveFieldTask } from '../services/fieldWorkService';
import type { YearFinancialSummary } from '../services/financialSummaryService';
import type { ChronologioEntry } from '../services/chronologioService';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getChronologioService,
} from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { usePreferences } from '../context/PreferencesContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import FieldIdentity from '../components/fields/FieldIdentity';
import FieldMoreMenu from '../components/fields/FieldMoreMenu';
import FieldTodaySummary from '../components/fields/FieldTodaySummary';
import FieldFinanceSummary from '../components/fields/FieldFinanceSummary';
import FieldRecentChronologio from '../components/fields/FieldRecentChronologio';
import FieldAttentionCard from '../components/fields/FieldAttentionCard';
import FieldFacts from '../components/fields/FieldFacts';
import FieldDetailMap from '../components/domain/FieldDetailMap';
import FieldIntelligenceCard from '../components/domain/FieldIntelligenceCard';
import ChronologioScreen from './ChronologioScreen';
import { spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldDetail'>;
type FieldTab = 'overview' | 'map' | 'details' | 'chronologio';

const FIELD_TABS: FieldTab[] = ['overview', 'map', 'details', 'chronologio'];

const parseTab = (mode?: string): FieldTab => {
  if (mode === 'map' || mode === 'details' || mode === 'chronologio') return mode;
  return 'overview';
};

const FieldDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId, focus, mode: modeParam } = route.params;
  const { isFieldOwner, user } = useAuth();
  const capture = useCaptureOptional();
  const { colors, tapMin } = useTheme();
  const { t, i18n } = useTranslation(['fields', 'common', 'capture', 'chronologio', 'settings']);
  const { showWidget, isEveryday, recordIntelligenceOpen } = usePreferences();

  const [field, setField] = useState<Field | null>(null);
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [costSummary, setCostSummary] = useState<YearFinancialSummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<ChronologioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [everydayFieldPeek, setEverydayFieldPeek] = useState(false);

  const tab = parseTab(modeParam);

  const load = useCallback(async () => {
    try {
      const [fieldData, taskData, summary, chrono] = await Promise.all([
        getFieldService().getField(fieldId),
        getFieldWorkService()
          .listFieldTasks({ fieldId })
          .then((rows) => rows.filter(isActiveFieldTask)),
        getFinancialSummaryService()
          .getYear(new Date().getFullYear(), fieldId, i18n.language)
          .catch(() => null),
        getChronologioService()
          .getFieldChronologio(fieldId, { limit: 8 })
          .catch(() => [] as ChronologioEntry[]),
      ]);
      setField(fieldData);
      setTasks(taskData);
      setCostSummary(summary);
      setRecentEntries(chrono);
      setError(null);
    } catch {
      setError(t('fields:form.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, [fieldId, t, i18n.language]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      void load();
    });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (focus === 'money') {
      navigation.setParams({ focus: undefined });
      navigation.navigate('Money', { fieldId });
    }
  }, [fieldId, focus, navigation]);

  useEffect(() => {
    if (field?.name) {
      navigation.setOptions({ title: field.name });
    }
  }, [field?.name, navigation]);

  const canOwn = isFieldOwner() || field?.ownerId === user?.id;
  const setTab = (next: FieldTab) => {
    navigation.setParams({ mode: next === 'overview' ? undefined : next });
  };

  const tabLabel = (id: FieldTab): string => {
    switch (id) {
      case 'overview':
        return t('fields:detail.overview');
      case 'map':
        return t('fields:page.mapData');
      case 'details':
        return t('fields:page.details');
      case 'chronologio':
        return t('fields:detail.timeline');
    }
  };

  const handleDelete = () => {
    Alert.alert(t('fields:deleteField'), t('fields:deleteConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: () => {
          void getFieldService()
            .deleteField(fieldId)
            .then(() => navigation.navigate('Main', { screen: 'Fields' }))
            .catch(() => Alert.alert(t('fields:form.failedDelete')));
        },
      },
    ]);
  };

  if (loading && !field) {
    return (
      <ScreenLayout>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  if (error || !field) {
    return (
      <ScreenLayout padded>
        <EmptyState
          title={error || t('fields:form.failedLoad')}
          action={{ label: t('fields:title'), onPress: () => navigation.navigate('Main', { screen: 'Fields' }) }}
        />
      </ScreenLayout>
    );
  }

  const renderMapPanel = () => (
    <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
      <FieldDetailMap field={field} height={isEveryday ? 280 : 360} />
      {field.boundary && showWidget('fieldIntelligence') ? (
        <FieldIntelligenceCard fieldId={field.id} />
      ) : null}
      {field.boundary && isEveryday && !showWidget('fieldIntelligence') ? (
        everydayFieldPeek ? (
          <FieldIntelligenceCard fieldId={field.id} />
        ) : (
          <Pressable
            onPress={() => {
              setEverydayFieldPeek(true);
              void recordIntelligenceOpen();
            }}
            style={[
              styles.peekBtn,
              { borderColor: colors.borderLight, backgroundColor: colors.surface, minHeight: tapMin },
            ]}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t('settings:experience.peekMoreAboutField')}
            </Text>
          </Pressable>
        )
      ) : null}
    </ScrollView>
  );

  return (
    <ScreenLayout>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.identityRow}>
          <FieldIdentity field={field} size="page" />
          <FieldMoreMenu
            field={field}
            canOwn={Boolean(canOwn)}
            onDelete={canOwn ? handleDelete : undefined}
            onOpenChronologio={() => setTab('chronologio')}
          />
        </View>
        {capture ? (
          <Button
            title={t('capture:cta')}
            size="small"
            onPress={() => capture.openCapture({ fieldId: field.id })}
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
          />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.localNav}
          accessibilityRole="tablist"
          accessibilityLabel={t('fields:page.tabsAria')}
        >
          {FIELD_TABS.map((id) => {
            const selected = tab === id;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.localTab,
                  {
                    minHeight: tapMin,
                    borderBottomColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 15,
                    color: selected ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  {tabLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {tab === 'chronologio' ? (
        <View style={styles.flex}>
          <ChronologioScreen fieldId={field.id} embedded />
        </View>
      ) : null}

      {tab === 'overview' ? (
        <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
          <FieldTodaySummary
            fieldId={field.id}
            tasks={tasks}
            onOpenWeather={() => navigation.navigate('FieldWeatherVegetation', { fieldId: field.id })}
          />
          <FieldAttentionCard
            entries={recentEntries}
            onSeeObservation={() => setTab('chronologio')}
          />
          <FieldFinanceSummary
            summary={costSummary}
            onSeeFinance={() => navigation.navigate('Money', { fieldId: field.id })}
          />
          <FieldRecentChronologio entries={recentEntries} onSeeAll={() => setTab('chronologio')} />
        </ScrollView>
      ) : null}

      {tab === 'map' ? renderMapPanel() : null}

      {tab === 'details' ? (
        <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
          <FieldFacts field={field} />
        </ScrollView>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  localNav: {
    gap: 4,
    paddingTop: spacing.md,
    paddingBottom: 0,
  },
  localTab: {
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 3,
    justifyContent: 'center',
  },
  panel: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  peekBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});

export default FieldDetailScreen;
