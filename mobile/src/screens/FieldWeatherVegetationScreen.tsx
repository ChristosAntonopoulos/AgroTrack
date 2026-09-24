import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { getFieldService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import ScreenLayout from '../components/layout/ScreenLayout';
import FieldWeatherVegetationCharts from '../components/fields/FieldWeatherVegetationCharts';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldWeatherVegetation'>;

/** Full-screen weather & vegetation — same charts as the Map tab embed. */
const FieldWeatherVegetationScreen: React.FC = () => {
  const { t } = useTranslation(['chronologio', 'common']);
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const { fieldId } = route.params;
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getFieldService()
      .getById(fieldId)
      .then((next) => {
        if (!cancelled) setField(next);
      })
      .catch(() => {
        if (!cancelled) setField(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  if (loading) {
    return (
      <ScreenLayout>
        <LoadingSpinner />
      </ScreenLayout>
    );
  }

  if (!field) {
    return (
      <ScreenLayout>
        <EmptyState
          title={t('common:error')}
          description={t('chronologio:weatherVegetation.loadError', {
            defaultValue: 'Could not load this field.',
          })}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('chronologio:weatherVegetation.title', { defaultValue: 'Weather & vegetation' })}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {field.name}
      </Text>
      <FieldWeatherVegetationCharts fieldId={fieldId} />
      <Text style={[styles.source, { color: colors.textTertiary }]}>
        {t('chronologio:weatherVegetation.sourceNote')}
      </Text>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.styles.h3,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.styles.body,
    marginTop: -spacing.sm,
  },
  source: {
    ...typography.styles.caption,
    marginTop: spacing.xs,
  },
});

export default FieldWeatherVegetationScreen;
