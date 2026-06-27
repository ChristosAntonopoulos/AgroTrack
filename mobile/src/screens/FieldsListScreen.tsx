import React from 'react';
import { FlatList, StyleSheet, RefreshControl, View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import FieldCard from '../components/domain/FieldCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common', 'nav']);
  const { fields, loading, fieldTaskCounts, refresh } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const totalArea = useMemo(
    () => fields.reduce((sum, f) => sum + (f.area || 0), 0),
    [fields]
  );
  const totalTasks = useMemo(
    () => Object.values(fieldTaskCounts).reduce((sum, n) => sum + n, 0),
    [fieldTaskCounts]
  );

  const goTab = (screen: 'Tasks' | 'Calendar', fieldId: string) => {
    navigation.navigate('Main', {
      screen,
      params: { fieldId, date: new Date().toISOString() },
    });
  };

  if (loading && fields.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout style={styles.screen}>
      <FlatList
        data={fields}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <ScreenHeader
              title={isFieldOwner() ? t('fields:titleOwner') : t('fields:title')}
              subtitle={t('fields:subtitle', { count: fields.length, area: totalArea.toFixed(1) })}
            />

            {fields.length > 0 ? (
              <View
                style={[
                  styles.summaryRow,
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                ]}
              >
                <SummaryItem
                  icon="leaf-outline"
                  value={fields.length}
                  label={t('fields:summaryFields')}
                  colors={colors}
                />
                <Divider colors={colors} />
                <SummaryItem
                  icon="resize-outline"
                  value={totalArea.toFixed(1)}
                  label={t('fields:summaryArea')}
                  colors={colors}
                />
                <Divider colors={colors} />
                <SummaryItem
                  icon="clipboard-outline"
                  value={totalTasks}
                  label={t('fields:summaryTasks')}
                  colors={colors}
                />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <FieldCard
            field={item}
            taskCount={fieldTaskCounts[item.id]}
            onPress={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
            onViewTasks={() => goTab('Tasks', item.id)}
            onViewCalendar={() => goTab('Calendar', item.id)}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={fields.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryDark} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="leaf-outline" size={36} color={colors.primaryDark} />}
            title={t('common:empty.noFields')}
            description={isFieldOwner() ? t('fields:emptyOwner') : t('fields:emptyWorker')}
            action={
              isFieldOwner()
                ? { label: t('fields:addField'), onPress: () => navigation.navigate('FieldForm', {}) }
                : undefined
            }
          />
        }
      />

      {isFieldOwner() ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primaryDark }]}
          onPress={() => navigation.navigate('FieldForm', {})}
          accessibilityLabel={t('fields:addField')}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      ) : null}
    </ScreenLayout>
  );
};

const SummaryItem = ({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string | number;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.summaryItem}>
    <Ionicons name={icon} size={16} color={colors.primaryDark} />
    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const Divider = ({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) => (
  <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBlock: { paddingBottom: spacing.xs },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { ...typography.styles.h3, fontWeight: '700', fontSize: 18 },
  summaryLabel: { ...typography.styles.caption, fontSize: 10, textAlign: 'center' },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.xs },
  listContent: { paddingHorizontal: spacing.base, paddingBottom: 100 },
  emptyContainer: { flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});

export default FieldsListScreen;
