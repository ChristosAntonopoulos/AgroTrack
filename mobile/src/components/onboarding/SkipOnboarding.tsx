import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import AlertDialog from '../ui/AlertDialog';

/** Small corner control. Skipping asks first, then leaves the guided setup. */
const SkipOnboarding: React.FC<{ routeName: string }> = ({ routeName }) => {
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('onboarding');
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // Fields puts “add grove” in the top-right. Keep skip on the left there.
  const pinLeft = routeName === 'FieldsHome';

  const guiding = Boolean(
    activation &&
      !activation.laterSnoozed &&
      !activation.journeyFinished &&
      (activation.visible || activation.guideBeat)
  );

  if (!activation || !guiding) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('skipConfirm.label')}
        style={({ pressed }) => [
          styles.btn,
          pinLeft ? styles.pinLeft : styles.pinRight,
          { top: insets.top + 8, opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <Ionicons name="play-skip-forward" size={16} color="#3d4a38" />
      </Pressable>
      <AlertDialog
        open={open}
        onClose={() => setOpen(false)}
        accent
        title={t('skipConfirm.title')}
        message={t('skipConfirm.body')}
        buttons={[
          {
            text: t('skipConfirm.confirm'),
            style: 'cancel',
            onPress: () => activation.dismiss(),
          },
          { text: t('skipConfirm.stay'), style: 'default' },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    zIndex: 200,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.16)',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  pinRight: { right: 12 },
  pinLeft: { left: 12 },
});

export default SkipOnboarding;
