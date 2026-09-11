import React, { useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import PhoneActions from '../components/domain/PhoneActions';
import { getPartnerService } from '../services/serviceFactory';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { PartnerPublicProfile, categoryName } from '../services/partnerService';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Route = RouteProp<RootStackParamList, 'PartnerProfile'>;

const PartnerProfileScreen = () => {
  const { t, i18n } = useTranslation('partners');
  const { colors } = useTheme();
  const { params } = useRoute<Route>();
  const [profile, setProfile] = useState<PartnerPublicProfile | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPartnerService()
      .getProfile(params.userId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [params.userId]);

  const send = async () => {
    const categoryId = params.categoryId || profile?.categories[0]?.id;
    if (!categoryId || !message.trim()) return;
    await getPartnerService().contact(params.userId, {
      serviceCategoryId: categoryId,
      fieldId: params.fieldId,
      taskId: params.taskId,
      message: message.trim(),
    });
    setSent(true);
  };

  const addToField = async () => {
    if (!params.fieldId) return;
    await fieldPeopleService.upsertMembership(params.fieldId, params.userId, ['work']);
    setAdded(true);
  };

  if (loading || !profile) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={profile.displayName} />
      <View style={styles.chips}>
        {profile.categories.map((c) => (
          <Text key={c.id} style={[styles.chip, { color: colors.textPrimary, backgroundColor: colors.surfaceElevated }]}>
            {categoryName(c, i18n.language)}
          </Text>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
        {profile.shortDescription}
      </Text>
      {profile.phoneNumber ? (
        <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary }}>{profile.phoneNumber}</Text>
          <PhoneActions phone={profile.phoneNumber} />
        </View>
      ) : null}
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{t('contactNoAccess')}</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{t('privacy')}</Text>
      {sent ? (
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('sent')}</Text>
      ) : (
        <>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('message')}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          />
          <Button title={t('send')} onPress={() => void send()} />
        </>
      )}
      {params.fieldId ? (
        added ? (
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.md }}>{t('addedToField')}</Text>
        ) : (
          <Button title={t('addToField')} variant="text" onPress={() => void addToField()} />
        )
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '600',
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
});

export default PartnerProfileScreen;
