import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export type AddFieldMethod = 'draw' | 'later' | 'cadastre' | 'kaek';

interface Props {
  method: AddFieldMethod | null;
  onSelect: (method: AddFieldMethod) => void;
  everyday?: boolean;
}

const AddFieldMethodStep: React.FC<Props> = ({ method, onSelect, everyday = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  const cards: {
    id: AddFieldMethod;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    desc: string;
    enabled: boolean;
  }[] = everyday
    ? [
        {
          id: 'draw',
          icon: 'map-outline',
          title: t('addField.methods.draw.title'),
          desc: t('addField.methods.draw.desc'),
          enabled: true,
        },
        {
          id: 'later',
          icon: 'time-outline',
          title: t('addField.methods.later.title'),
          desc: t('addField.methods.later.desc'),
          enabled: true,
        },
      ]
    : [
        {
          id: 'draw',
          icon: 'map-outline',
          title: t('addField.methods.draw.title'),
          desc: t('addField.methods.draw.desc'),
          enabled: true,
        },
        {
          id: 'cadastre',
          icon: 'document-text-outline',
          title: t('addField.methods.cadastre.title'),
          desc: t('addField.methods.cadastre.desc'),
          enabled: true,
        },
        {
          id: 'kaek',
          icon: 'barcode-outline',
          title: t('addField.methods.kaek.title'),
          desc: t('addField.methods.kaek.desc'),
          enabled: true,
        },
      ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addField.methods.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('addField.methods.subtitle')}
      </Text>
      <View style={styles.grid}>
        {cards.map((card) => {
          const active = method === card.id;
          return (
            <Pressable
              key={card.id}
              disabled={!card.enabled}
              onPress={() => card.enabled && onSelect(card.id)}
              style={[
                styles.card,
                {
                  backgroundColor: active ? colors.primary + '14' : colors.surfaceElevated,
                  borderColor: active ? colors.primary : colors.borderLight,
                  opacity: card.enabled ? 1 : 0.55,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name={card.icon} size={26} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{card.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.desc}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { ...typography.styles.h4, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginBottom: spacing.xs },
  grid: { gap: spacing.sm },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: spacing.base,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typography.styles.body, fontWeight: '700' },
  cardDesc: { ...typography.styles.caption, lineHeight: 18 },
});

export default AddFieldMethodStep;
