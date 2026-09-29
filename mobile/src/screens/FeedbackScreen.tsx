import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Alert } from 'react-native';
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

type AttachTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  attachedLabel: string;
  uri: string | null;
  onPress: () => void;
  onRemove: () => void;
  removeLabel: string;
};

const AttachTile = ({
  icon,
  label,
  hint,
  attachedLabel,
  uri,
  onPress,
  onRemove,
  removeLabel,
}: AttachTileProps) => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const selected = Boolean(uri);

  return (
    <View
      style={[
        styles.attach,
        {
          borderColor: selected ? colors.oliveBorder : colors.border,
          backgroundColor: selected ? colors.surfaceSelected : colors.surface,
          minHeight: Math.max(tapMin, 72),
        },
      ]}
    >
      <Pressable
        style={styles.attachMain}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} />
        ) : (
          <View style={[styles.iconWell, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
        )}
        <View style={styles.attachCopy}>
          <Text
            style={[styles.attachLabel, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[styles.attachHint, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
            numberOfLines={2}
          >
            {selected ? attachedLabel : hint}
          </Text>
        </View>
      </Pressable>
      {uri ? (
        <Pressable
          style={[styles.remove, { backgroundColor: colors.charcoal }]}
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
        >
          <Ionicons name="close" size={14} color={colors.limestone} />
        </Pressable>
      ) : null}
    </View>
  );
};

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

  const lead = (heartName: keyof typeof Ionicons.glyphMap) => (
    <View style={[styles.leadMark, { backgroundColor: colors.primaryLight }]}>
      <Ionicons name={heartName} size={22} color={colors.primary} />
    </View>
  );

  if (thanks) {
    return (
      <ScreenLayout scroll padded contentContainerStyle={styles.content}>
        {lead('heart')}
        <Text style={[styles.thanksTitle, { color: colors.textPrimary, fontSize: 26 * fontScaleMultiplier }]}>
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
      <View style={styles.lead}>
        {lead('chatbubble-ellipses-outline')}
        <View style={styles.leadCopy}>
          <Text style={[styles.kicker, { color: colors.accentGold, fontSize: 12 * fontScaleMultiplier }]}>
            {t('feedback:kicker')}
          </Text>
          <Text style={[styles.intro, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
            {t('feedback:intro')}
          </Text>
        </View>
      </View>

      <Input
        label={t('feedback:commentLabel')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('feedback:commentPlaceholder')}
        multiline
        numberOfLines={5}
        style={styles.comment}
        containerStyle={styles.commentWrap}
        maxLength={4000}
      />

      <Text style={[styles.sectionLabel, { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier }]}>
        {t('feedback:attachLabel')}
      </Text>
      <View style={styles.stack}>
        <AttachTile
          icon="camera-outline"
          label={t('feedback:screenshot')}
          hint={t('feedback:screenshotHint')}
          attachedLabel={t('feedback:attached')}
          uri={screenshotUri}
          onPress={() => void pickImage(true)}
          onRemove={() => setScreenshotUri(null)}
          removeLabel={t('feedback:removeImage')}
        />
        <AttachTile
          icon="images-outline"
          label={t('feedback:photo')}
          hint={t('feedback:photoHint')}
          attachedLabel={t('feedback:attached')}
          uri={photoUri}
          onPress={() => void pickImage(false)}
          onRemove={() => setPhotoUri(null)}
          removeLabel={t('feedback:removeImage')}
        />
      </View>

      <Button
        title={t('feedback:submit')}
        onPress={() => void submit()}
        loading={submitting}
        disabled={submitting}
        fullWidth
        style={{ minHeight: Math.max(tapMin, 48) }}
      />
      <Text style={[styles.submitHint, { color: colors.textTertiary, fontSize: 13 * fontScaleMultiplier }]}>
        {t('feedback:submitHint')}
      </Text>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  leadCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 2,
  },
  leadMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  intro: {
    lineHeight: 24,
  },
  commentWrap: {
    marginBottom: 0,
  },
  comment: {
    minHeight: 128,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: -4,
  },
  stack: {
    gap: spacing.sm,
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.card,
    paddingRight: spacing.sm,
  },
  attachMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  attachCopy: {
    flex: 1,
    gap: 2,
  },
  attachLabel: {
    fontWeight: '650' as unknown as '600',
  },
  attachHint: {
    lineHeight: 18,
  },
  remove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitHint: {
    textAlign: 'center',
    marginTop: -4,
    lineHeight: 18,
  },
  thanksTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
});

export default FeedbackScreen;
