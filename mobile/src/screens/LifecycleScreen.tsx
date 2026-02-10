import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useLifecycles } from '../hooks/useLifecycles';
import { useRefresh } from '../hooks/useRefresh';
import LifecycleCard from '../components/domain/LifecycleCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors } from '../theme';
import { toBoolean } from '../utils/booleanConverter';

interface LifecycleScreenProps {
  navigation: any;
}

const LifecycleScreen: React.FC<LifecycleScreenProps> = ({ navigation }) => {
  const { lifecycles, loading, refresh } = useLifecycles();
  const { refreshing, onRefresh } = useRefresh(refresh);
  
  // Convert refreshing to strict boolean for RefreshControl (native component)
  if (__DEV__ && typeof refreshing !== 'boolean' && refreshing !== undefined && refreshing !== null) {
    console.warn(`[LifecycleScreen] Received non-boolean refreshing prop: ${typeof refreshing} (${refreshing})`);
  }
  const isRefreshing: boolean = toBoolean(refreshing);

  const handleLifecyclePress = (lifecycle: any) => {
    if (lifecycle.field) {
      navigation.navigate('FieldDetail', { fieldId: lifecycle.fieldId });
    }
  };

  if (loading && lifecycles.length === 0) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lifecycles}
        renderItem={({ item }) => (
          <LifecycleCard
            lifecycle={item}
            field={item.field}
            onPress={() => handleLifecyclePress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          lifecycles.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🔄</Text>}
            title="No lifecycle information"
            description="There are no lifecycle records available for your role"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
  },
});

export default LifecycleScreen;
