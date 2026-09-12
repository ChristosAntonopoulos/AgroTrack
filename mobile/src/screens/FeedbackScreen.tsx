import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { pickCapturePhotoUris } from '../capture/photos';
import { getFeedbackService } from '../services/serviceFactory';
import { RootStackParamList } from '../navigation/types';
import { spacing, radii } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FeedbackScreen = () => {
  const { t } = useTranslation(['feedback', 'common', 'nav']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const navigation = useNavigation<Nav>();
  const [comment, setComment] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [thanks, setThanks] = useState(false);

  const pickImage = async (camera: boolean) => {
    const uris = await pickCapturePhotoUris({
      camera,
      remainingSlots: 1,
      isOnline: true,
      permissionDeniedMessage: t('common:permissionDenied', { defaultValue: 'Permission required' }),
    });
    const uri = uris[0];
    if (!uri) return;
    if (camera) setScreenshotUri(uri);
    else setPhotoUri(uri);
  };

  const submit = async () => {
    if (!comment.trim() && !screenshotUri && !photoUri) {
      Alert.alert('', t('feedback:needSomething'));
      return;
    }
    setSubmitting(true);
    try {
      await getFeedbackService().submit({
        comment,
        pageUrl: 'mobile',
        screenshotUri,
        photoUri,
      });
      setThanks(true);
    } catch {
      Alert.alert('', t('feedback:sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (thanks) {
    return (
      <ScreenLayout scroll padded contentContainerStyle={styles.content}>
        <View style={[styles.thanksIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="heart" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.thanksTitle, { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier }]}>
          {t('feedback:thanksTitle')}
        </Text>
        <Text style={[styles.intro, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
          {t('feedback:thanksBody')}
        </Text>
        <Button title={t('feedback:thanksClose')} onPress={() => navigation.goBack()} fullWidth />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scroll padded contentContainerStyle={styles.content}>
      <Text style={[styles.kicker, { color: colors.primary, fontSize: 12 * fontScaleMultiplier }]}>
        {t('feedback:kicker')}
      </Text>
      <Text style={[styles.intro, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
        {t('feedback:intro')}
      </Text>

      <Input
        label={t('feedback:commentLabel')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('feedback:commentPlaceholder')}
        multiline
        numberOfLines={5}
        style={styles.comment}
        maxLength={4000}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.attach, { borderColor: colors.border, minHeight: tapMin }]}
          onPress={() => void pickImage(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={[styles.attachLabel, { color: colors.textPrimary }]}>{t('feedback:screenshot')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.attach, { borderColor: colors.border, minHeight: tapMin }]}
          onPress={() => void pickImage(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="image-outline" size={20} color={colors.primary} />
          <Text style={[styles.attachLabel, { color: colors.textPrimary }]}>{t('feedback:photo')}</Text>
        </TouchableOpacity>
      </View>

      {(screenshotUri || photoUri) && (
        <View style={styles.previews}>
          {screenshotUri ? (
            <View style={styles.thumb}>
              <Image source={{ uri: screenshotUri }} style={styles.thumbImage} />
              <TouchableOpacity
                style={styles.remove}
                onPress={() => setScreenshotUri(null)}
                accessibilityLabel={t('feedback:removeImage')}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
          {photoUri ? (
            <View style={styles.thumb}>
              <Image source={{ uri: photoUri }} style={styles.thumbImage} />
              <TouchableOpacity
                style={styles.remove}
                onPress={() => setPhotoUri(null)}
                accessibilityLabel={t('feedback:removeImage')}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      <Button
        title={t('feedback:submit')}
        onPress={() => void submit()}
        loading={submitting}
        disabled={submitting}
        fullWidth
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  intro: {
    lineHeight: 24,
  },
  comment: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attach: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  attachLabel: {
    fontWeight: '600',
  },
  previews: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 96,
    height: 96,
  },
  thumbImage: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thanksIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  thanksTitle: {
    fontWeight: '700',
  },
});

export default FeedbackScreen;
