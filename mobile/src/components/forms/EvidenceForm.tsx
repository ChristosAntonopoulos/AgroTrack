import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import FormField from './FormField';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { getFileService } from '../../services/serviceFactory';
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
  const { t } = useTranslation(['tasks', 'common', 'errors']);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t('errors:generic'));
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!notes.trim() && !photoUri) {
      Alert.alert(t('tasks:addEvidence'));
      return;
    }

    try {
      setUploading(true);
      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await getFileService().uploadImage(photoUri);
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

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : null}

          <View style={styles.photoActions}>
            <Button
              title={t('tasks:takePhoto')}
              onPress={() => pickImage(true)}
              variant="outline"
              size="small"
              disabled={isBusy}
              style={styles.photoBtn}
            />
            <Button
              title={t('tasks:choosePhoto')}
              onPress={() => pickImage(false)}
              variant="outline"
              size="small"
              disabled={isBusy}
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
