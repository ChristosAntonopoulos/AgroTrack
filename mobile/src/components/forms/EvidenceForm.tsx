import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import FormField from './FormField';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useOfflineMode } from '../../context/OfflineContext';
import { pickCapturePhotoUris, uploadCapturePhotoUris } from '../../capture/photos';
import { typography, spacing } from '../../theme';

export interface EvidenceFormData {
  photoUrl?: string;
  notes?: string;
}

interface EvidenceFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: EvidenceFormData) => Promise<void>;
  loading?: boolean;
}

const EvidenceForm: React.FC<EvidenceFormProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { colors } = useTheme();
  const { isOnline } = useOfflineMode();
  const { t } = useTranslation(['tasks', 'common', 'errors']);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const uris = await pickCapturePhotoUris({
      camera: useCamera,
      remainingSlots: 1,
      isOnline,
      offlineMessage: t('common:offline.photosRequireConnection'),
      permissionDeniedMessage: t('errors:generic'),
    });
    if (uris[0]) setPhotoUri(uris[0]);
  };

  const handleSubmit = async () => {
    if (!notes.trim() && !photoUri) {
      Alert.alert(t('tasks:addEvidence'));
      return;
    }

    if (photoUri && !isOnline) {
      Alert.alert(t('common:offline.photosRequireConnection'));
      return;
    }

    try {
      setUploading(true);
      let photoUrl: string | undefined;
      if (photoUri) {
        const urls = await uploadCapturePhotoUris([photoUri]);
        photoUrl = urls[0];
      }
      await onSubmit({ notes: notes.trim() || undefined, photoUrl });
      setNotes('');
      setPhotoUri(null);
      onClose();
    } catch (error: any) {
      Alert.alert(t('errors:uploadFailed'), error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setNotes('');
    setPhotoUri(null);
    onClose();
  };

  const isBusy = loading || uploading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('tasks:addEvidence')}</Text>

          {!isOnline ? (
            <Text style={[styles.offlineHint, { color: colors.textSecondary }]}>
              {t('common:offline.photosRequireConnection')}
            </Text>
          ) : null}

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : null}

          <View style={styles.photoActions}>
            <Button
              title={t('tasks:takePhoto')}
              onPress={() => pickImage(true)}
              variant="outline"
              size="small"
              disabled={isBusy || !isOnline}
              style={styles.photoBtn}
            />
            <Button
              title={t('tasks:choosePhoto')}
              onPress={() => pickImage(false)}
              variant="outline"
              size="small"
              disabled={isBusy || !isOnline}
              style={styles.photoBtn}
            />
          </View>

          <FormField
            label={t('tasks:notes')}
            placeholder={t('tasks:notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!isBusy}
          />

          <View style={styles.actions}>
            <Button
              title={t('common:cancel')}
              onPress={handleCancel}
              variant="outline"
              disabled={isBusy}
              style={styles.cancelButton}
            />
            <Button
              title={t('tasks:addEvidence')}
              onPress={handleSubmit}
              loading={isBusy}
              disabled={isBusy}
              style={styles.submitButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: '85%',
  },
  title: {
    ...typography.styles.h3,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.lg,
  },
  offlineHint: {
    ...typography.styles.bodySmall,
    marginBottom: spacing.md,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoBtn: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 1 },
});

export default EvidenceForm;
