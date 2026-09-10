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
type FieldMode = 'overview' | 'chronologio';

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

  const mode: FieldMode = modeParam === 'chronologio' ? 'chronologio' : 'overview';

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
  const setMode = (next: FieldMode) => {
    navigation.setParams({ mode: next === 'overview' ? undefined : next });
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

  return (
    <ScreenLayout>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.identityRow}>
          <FieldIdentity field={field} size="page" />
          <FieldMoreMenu
            field={field}
            canOwn={Boolean(canOwn)}
            onDelete={canOwn ? handleDelete : undefined}
            onOpenChronologio={() => setMode('chronologio')}
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
        <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceMuted }]}>
          {(['overview', 'chronologio'] as const).map((next) => (
            <Pressable
              key={next}
              onPress={() => setMode(next)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === next }}
              style={[
                styles.modeBtn,
                {
                  minHeight: tapMin,
                  backgroundColor: mode === next ? colors.surface : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '700',
                  color: mode === next ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {next === 'overview' ? t('fields:detail.overview') : t('fields:detail.timeline')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {mode === 'chronologio' ? (
        <View style={styles.flex}>
          <ChronologioScreen fieldId={field.id} embedded />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.overview} showsVerticalScrollIndicator={false}>
          <FieldDetailMap field={field} height={isEveryday ? 240 : 340} />
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
          <FieldTodaySummary
            fieldId={field.id}
            tasks={tasks}
            onOpenWeather={() => navigation.navigate('FieldWeatherVegetation', { fieldId: field.id })}
          />
          <FieldAttentionCard
            entries={recentEntries}
            onSeeObservation={() => setMode('chronologio')}
          />
          <FieldFinanceSummary
            summary={costSummary}
            onSeeFinance={() => navigation.navigate('Money', { fieldId: field.id })}
          />
          <FieldRecentChronologio entries={recentEntries} onSeeAll={() => setMode('chronologio')} />
          <FieldFacts field={field} />
        </ScrollView>
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: spacing.md,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overview: {
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
