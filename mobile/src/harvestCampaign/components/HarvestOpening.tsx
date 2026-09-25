import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  seasonLabel?: string;
  onClose: () => void;
};

const HarvestOpening: React.FC<Props> = ({ visible, seasonLabel, onClose }) => {
  const { t } = useTranslation('fields');
  const veil = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!visible) return;
    veil.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(veil, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [rise, veil, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.veil, { opacity: veil }]} />
        <Animated.View
          style={[styles.card, { opacity: veil, transform: [{ translateY: rise }] }]}
          accessibilityViewIsModal
        >
          <View style={styles.mark}>
            <Ionicons name="leaf" size={28} color="#3f4a32" />
          </View>
          {seasonLabel ? <Text style={styles.kicker}>{seasonLabel}</Text> : null}
          <Text style={styles.title}>{t('harvestCampaign.opening.title')}</Text>
          <Text style={styles.body}>{t('harvestCampaign.opening.body')}</Text>
          <Text style={styles.blessing}>{t('harvestCampaign.opening.blessing')}</Text>
          <Pressable
            style={({ pressed }) => [styles.go, pressed && styles.goPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.goLabel}>{t('harvestCampaign.opening.cta')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 20, 14, 0.62)',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
    backgroundColor: '#fbf7f0',
    alignItems: 'center',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#efe6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kicker: {
    color: '#8a7358',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '600',
    color: '#2c3426',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: '#4e483f',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  blessing: {
    color: '#5c564c',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 18,
  },
  go: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#3f4a32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goPressed: {
    backgroundColor: '#344028',
  },
  goLabel: {
    color: '#fbf7f0',
    fontSize: 17,
    fontWeight: '700',
  },
});

export default HarvestOpening;
