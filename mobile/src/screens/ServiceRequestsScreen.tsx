import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { getPartnerService } from '../services/serviceFactory';
import { ServiceContactRequest, categoryName } from '../services/partnerService';
import { spacing } from '../theme';

const ServiceRequestsScreen = () => {
  const { t, i18n } = useTranslation('partners');
  const { colors } = useTheme();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [rows, setRows] = useState<ServiceContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (direction: 'incoming' | 'outgoing') => {
    setLoading(true);
    try {
      setRows(await getPartnerService().getRequests(direction));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(tab);
  }, [tab]);

  const update = async (id: string, status: string, linkTask = false) => {
    await getPartnerService().updateRequest(id, status, linkTask);
    await load(tab);
  };

  const statusLabel = (status: string) => t(`status.${status}`, { defaultValue: status });

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('requests')} />
      <View style={styles.tabs}>
        <Button title={t('inbox')} variant={tab === 'incoming' ? 'primary' : 'outline'} onPress={() => setTab('incoming')} />
        <Button title={t('outbox')} variant={tab === 'outgoing' ? 'primary' : 'outline'} onPress={() => setTab('outgoing')} />
      </View>
      {loading && <LoadingSpinner />}
      {!loading && rows.length === 0 && <EmptyState title={t('empty', { defaultValue: 'No requests yet.' })} />}
      {rows.map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {tab === 'incoming' ? row.requesterName : row.providerName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{statusLabel(row.status)}</Text>
          {row.category ? (
            <Text style={{ color: colors.textSecondary }}>{categoryName(row.category, i18n.language)}</Text>
          ) : null}
          <Text style={{ color: colors.textPrimary }}>{row.message}</Text>
          {row.approximateArea ? (
            <Text style={{ color: colors.textSecondary }}>{row.approximateArea}</Text>
          ) : null}
          {tab === 'incoming' && (row.status === 'New' || row.status === 'Viewed') ? (
            <View style={styles.tabs}>
              {row.status === 'New' ? (
                <Button title={t('markViewed', { defaultValue: 'Mark viewed' })} variant="outline" onPress={() => void update(row.id, 'Viewed')} />
              ) : null}
              <Button title={t('accept')} onPress={() => void update(row.id, 'Accepted', Boolean(row.taskId))} />
              <Button title={t('decline')} variant="outline" onPress={() => void update(row.id, 'Declined')} />
            </View>
          ) : null}
          {row.status === 'Accepted' || row.status === 'Declined' ? (
            <Button title={t('close', { defaultValue: 'Close' })} variant="ghost" onPress={() => void update(row.id, 'Closed')} />
          ) : null}
        </Card>
      ))}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  card: { marginBottom: spacing.md, gap: spacing.xs },
  name: { fontWeight: '800' },
});

export default ServiceRequestsScreen;
