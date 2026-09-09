import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { getPartnerService } from '../services/serviceFactory';
import { PartnerSearchResponse, categoryName } from '../services/partnerService';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Route = RouteProp<RootStackParamList, 'PartnerSearch'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'PartnerSearch'>;

const PartnerSearchScreen = () => {
  const { t, i18n } = useTranslation('partners');
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<PartnerSearchResponse | null>(null);
  const [radiusKm, setRadiusKm] = useState(route.params.radiusKm || 50);
  const [loading, setLoading] = useState(true);

  const load = async (radius: number) => {
    setLoading(true);
    try {
      const result = await getPartnerService().search({
        fieldId: route.params.fieldId,
        categoryId: route.params.categoryId,
        category: route.params.category,
        radiusKm: radius,
      });
      setData(result);
      setRadiusKm(radius);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(radiusKm);
  }, []);

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('title')} />
      {loading && <LoadingSpinner />}
      {!loading && data?.results.length === 0 && (
        <EmptyState
          title={t('empty')}
          action={
            data.canExpandRadius
              ? { label: t('expand', { km: data.nextRadiusKm }), onPress: () => void load(data.nextRadiusKm) }
              : undefined
          }
        />
      )}
      {data?.results.map((row) => (
        <Card key={row.userId} style={styles.card}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{row.displayName}</Text>
          <View style={styles.chips}>
            {row.categories.map((c) => (
              <Text key={c.id} style={[styles.chip, { color: colors.textPrimary, backgroundColor: colors.background }]}>
                {categoryName(c, i18n.language)}
              </Text>
            ))}
          </View>
          <Text style={{ color: colors.textSecondary }}>{t('aboutKm', { km: row.distanceKm })}</Text>
          <Button
            title={t('contact')}
            onPress={() =>
              navigation.navigate('PartnerProfile', {
                userId: row.userId,
                fieldId: route.params.fieldId,
                categoryId: route.params.categoryId,
                taskId: route.params.taskId,
              })
            }
          />
        </Card>
      ))}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.xs },
  name: { fontWeight: '800', fontSize: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '600',
  },
});

export default PartnerSearchScreen;
