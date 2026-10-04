import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { formatOilPack } from '../../myOil/formatOilPack';
import type { OilShareRequest } from '../../services/oilStockService';
import type { PackLabels } from './types';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  requests: OilShareRequest[];
  busy: boolean;
  packLabels: PackLabels;
  onAccept: (r: OilShareRequest) => void;
  onReject: (r: OilShareRequest) => void;
};

export function OilShareRequestsSection({
  requests,
  busy,
  packLabels,
  onAccept,
  onReject,
}: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  if (requests.length === 0) return null;

  return (
    <View style={[styles.panel, styles.panelAction]}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitle}>
          <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
          <Text style={styles.sectionTitleText}>{t('shareInbox.title')}</Text>
        </View>
        <Text style={styles.sectionIntro}>{t('shareInbox.hint')}</Text>
      </View>
      <View style={styles.waiting}>
        {requests.map((r) => (
          <View key={r.id} style={styles.waitingItem}>
            <Text style={styles.waitingName} numberOfLines={1}>
              {r.toDisplayName || t('shareInbox.someone')}
            </Text>
            <Text style={styles.waitingStory}>{t('shareInbox.asking')}</Text>
            <Text style={styles.waitingPack}>{formatOilPack(r.requested, packLabels)}</Text>
            <View style={styles.waitingActions}>
              <Pressable
                disabled={busy}
                onPress={() => onReject(r)}
                style={[styles.btnSecondary, styles.btnSm, busy && { opacity: 0.5 }]}
              >
                <Text style={styles.btnSecondaryText}>{t('shareInbox.reject')}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => onAccept(r)}
                style={[styles.btnPrimary, styles.btnSm, busy && styles.btnPrimaryDisabled]}
              >
                <Text style={styles.btnPrimaryText}>{t('shareInbox.accept')}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
