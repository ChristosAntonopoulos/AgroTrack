import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFields } from '../hooks/useFields';
import { useRefresh } from '../hooks/useRefresh';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FieldCard from '../components/domain/FieldCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import { spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FieldsListScreen = () => {
  const navigation = useNavigation<Nav>();
  const { isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const { fields, loading, fieldTaskCounts, refresh } = useFields();
  const { refreshing, onRefresh } = useRefresh(refresh);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: { padding: spacing.base, paddingBottom: 0 },
        listContent: { padding: spacing.base, paddingBottom: spacing['2xl'] },
        emptyContainer: { flex: 1 },
        emptyIcon: { fontSize: 64 },
      }),
    [colors]
  );

  if (loading && fields.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={fields}
        ListHeaderComponent={
          isFieldOwner() ? (
            <View style={styles.header}>
              <Button
                title={t('fields:addField')}
                onPress={() => navigation.navigate('FieldForm', {})}
                fullWidth
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FieldCard
            field={item}
            taskCount={fieldTaskCounts[item.id]}
            onPress={() => navigation.navigate('FieldDetail', { fieldId: item.id })}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={fields.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🫒</Text>}
            title={t('common:empty.noFields')}
            description={isFieldOwner() ? t('fields:emptyOwner') : t('fields:emptyWorker')}
          />
        }
      />
    </View>
  );
};

export default FieldsListScreen;
