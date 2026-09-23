import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CaptureContext, CaptureSavedDetail, CaptureSavedOptions } from '../../capture/types';
import { pickCapturePhotoUris } from '../../capture/photos';
import { useTheme } from '../../context/ThemeContext';
import { useOfflineMode } from '../../context/OfflineContext';
import { getPhotoService } from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import Button from '../ui/Button';
import { radii } from '../../theme';

type Props = {
  context: CaptureContext;
  fields: Field[];
  fieldId: string;
  fieldLocked: boolean;
  onFieldChange: (id: string) => void;
  onSaved: (detail: CaptureSavedDetail, message: string, options?: CaptureSavedOptions) => void;
};

const PhotoCaptureForm: React.FC<Props> = ({
  context,
  fields,
  fieldId,
  fieldLocked,
  onFieldChange,
  onSaved,
}) => {
  const { t } = useTranslation(['capture', 'photos', 'common']);
  const { colors, tapMin } = useTheme();
  const { isOnline } = useOfflineMode();
  const [uris, setUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addPhotos = async (camera: boolean) => {
    const next = await pickCapturePhotoUris({
      camera,
      remainingSlots: Math.max(1, 12 - uris.length),
      isOnline,
      offlineMessage: t('common:offline.photosRequireConnection', {
        defaultValue: 'Photos need a connection.',
      }),
    });
    if (next.length) setUris((prev) => [...prev, ...next]);
  };

  const save = async () => {
    if (!fieldId) {
      Alert.alert('', t('capture:errors.fieldRequired'));
      return;
    }
    if (!uris.length) {
      Alert.alert('', t('capture:errors.photoRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const results = await getPhotoService().uploadLocalUris(uris);
      const uploaded = results.filter((r) => r.photo?.id && !r.failed);
      if (!uploaded.length) {
        Alert.alert('', t('capture:errors.saveFailed'));
        return;
      }
      await Promise.all(
        uploaded.map((r) =>
          r.photo.fieldId === fieldId
            ? Promise.resolve(r.photo)
            : getPhotoService().confirmField(r.photo.id, fieldId).catch(() => r.photo)
        )
      );
      onSaved(
        {
          type: 'photo',
          fieldId,
          sourceId: uploaded[0].photo.id,
          harvestCampaignLink: context.harvestCampaignLink,
        },
        t('capture:photo.saved', { count: uploaded.length })
      );
    } catch {
      Alert.alert('', t('capture:errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('capture:fieldLabel')}</Text>
      {fieldLocked ? (
        <Text style={[styles.lockedField, { color: colors.textPrimary, borderColor: colors.border }]}>
          {fields.find((f) => f.id === fieldId)?.name || fieldId}
        </Text>
      ) : (
        <View style={styles.chipRow}>
          {fields.map((f) => (
            <Pressable
              key={f.id}
              style={[
                styles.chip,
                {
                  borderColor: fieldId === f.id ? colors.oliveBorder : colors.border,
                  backgroundColor: fieldId === f.id ? colors.primaryLight : colors.surface,
                  minHeight: tapMin,
                },
              ]}
              onPress={() => onFieldChange(f.id)}
            >
              <Text style={{ color: fieldId === f.id ? colors.primary : colors.textPrimary }}>{f.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {context.harvestCampaignLink ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('capture:photo.harvestHint')}</Text>
      ) : null}
      <View style={styles.photoRow}>
        {uris.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.thumb} />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          title={t('photos:takePhoto', { defaultValue: t('capture:takePhoto') })}
          onPress={() => void addPhotos(true)}
          variant="outline"
          size="large"
        />
        <Button
          title={t('capture:chooseLibrary')}
          onPress={() => void addPhotos(false)}
          variant="outline"
          size="large"
        />
        <Button
          title={submitting ? t('capture:saving') : t('capture:save')}
          onPress={() => void save()}
          loading={submitting}
          fullWidth
          size="large"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: { paddingBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  lockedField: { borderWidth: 1, borderRadius: radii.lg, padding: 12, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  hint: { fontSize: 13, marginBottom: 10 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  thumb: { width: 72, height: 72, borderRadius: radii.lg },
  actions: { gap: 8 },
});

export default PhotoCaptureForm;
