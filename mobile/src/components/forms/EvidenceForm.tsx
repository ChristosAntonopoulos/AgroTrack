import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert } from 'react-native';
import FormField from './FormField';
import Button from '../ui/Button';
import { colors, typography, spacing } from '../../theme';
import { toBoolean, toBooleanNot } from '../../utils/booleanConverter';

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
  // Props are already correct types, use directly
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const handleSubmit = async () => {
    if (!notes.trim() && !photoUrl.trim()) {
      Alert.alert('Validation Error', 'Please provide at least notes or a photo URL');
      return;
    }

    try {
      await onSubmit({
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });
      
      // Reset form
      setNotes('');
      setPhotoUrl('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add evidence');
    }
  };

  const handleCancel = () => {
    setNotes('');
    setPhotoUrl('');
    onClose();
  };

  // Ensure visible is a strict boolean for native Modal component
  const safeVisible = toBoolean(visible, 'EvidenceForm.visible');

  return (
    <Modal
      visible={safeVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add Evidence</Text>
          
          <FormField
            label="Photo URL (optional)"
            placeholder="https://example.com/photo.jpg"
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={toBooleanNot(loading, 'EvidenceForm.editable')}
          />

          <FormField
            label="Notes"
            placeholder="Enter notes about the task completion..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={toBooleanNot(loading, 'EvidenceForm.editable')}
          />

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={handleCancel}
              variant="outline"
              disabled={loading}
              style={styles.cancelButton}
            />
            <Button
              title={loading ? 'Adding...' : 'Add Evidence'}
              onPress={handleSubmit}
              disabled={loading}
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: '80%',
  },
  title: {
    ...typography.styles.h3,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default EvidenceForm;
