import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing } from '../../theme';
import FieldDetailMotifCard from './FieldDetailMotifCard';

type Link = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail?: string;
  onPress: () => void;
  alert?: boolean;
};

type Props = {
  attentionTitle?: string | null;
  onAttention?: () => void;
  canViewChronologio: boolean;
  historyDetail?: string;
  onHistory: () => void;
  canManageAccess: boolean;
  peopleDetail?: string;
  onPeople: () => void;
  showMyOil?: boolean;
  onMyOil?: () => void;
  showEdit?: boolean;
  onEdit?: () => void;
  /** Launcher-style watermark cards — Field Details tab only. */
  motifStyle?: boolean;
};

/** Floor-door shortcuts — History, People, Αποθήκη (Αποθήκη visual language). */
const FieldQuickLinks: React.FC<Props> = ({
  attentionTitle,
  onAttention,
  canViewChronologio,
  historyDetail,
  onHistory,
  canManageAccess,
  peopleDetail,
  onPeople,
  showMyOil,
  onMyOil,
  showEdit,
  onEdit,
  motifStyle = false,
}) => {
  const { t } = useTranslation(['fields', 'nav', 'chronologio', 'partners', 'myOil']);
  const { colors, tapMin } = useTheme();

  const links: Link[] = [];
  if (attentionTitle && onAttention) {
    links.push({
      id: 'attention',
      icon: 'alert-circle-outline',
      title: t('fields:overview.needsAttention', { defaultValue: 'Χρειάζεται προσοχή' }),
      detail: attentionTitle,
      onPress: onAttention,
      alert: true,
    });
  }
  if (canViewChronologio) {
    links.push({
      id: 'history',
      icon: 'book-outline',
      title: t('fields:page.shortcuts.history', {
        defaultValue: t('nav:chronologio', { defaultValue: t('chronologio:title') }),
      }),
      detail:
        historyDetail ||
        t('fields:page.shortcuts.historyDetail', {
          defaultValue: 'Καταγραφές αυτού του ελαιώνα',
        }),
      onPress: onHistory,
    });
  }
  if (canManageAccess) {
    links.push({
      id: 'people',
      icon: 'people-outline',
      title: t('fields:page.shortcuts.people', {
        defaultValue: t('nav:partners', { defaultValue: t('partners:title') }),
      }),
      detail:
        peopleDetail ||
        t('fields:page.shortcuts.peopleDetail', {
          defaultValue: 'Άτομα με πρόσβαση σε αυτόν τον ελαιώνα',
        }),
      onPress: onPeople,
    });
  }
  if (showMyOil && onMyOil) {
    links.push({
      id: 'myOil',
      icon: 'water-outline',
      title: t('fields:page.shortcuts.myOil', {
        defaultValue: t('nav:myOil', { defaultValue: 'Αποθήκη' }),
      }),
      detail: t('fields:page.shortcuts.myOilDetail', {
        defaultValue: 'Λάδι από αυτόν τον ελαιώνα',
      }),
      onPress: onMyOil,
    });
  }
  if (showEdit && onEdit) {
    links.push({
      id: 'edit',
      icon: 'create-outline',
      title: t('fields:editField'),
      detail: t('fields:page.shortcuts.editDetail', {
        defaultValue: 'Όνομα, ποικιλία και ρυθμίσεις',
      }),
      onPress: onEdit,
    });
  }

  if (!links.length) return null;

  if (motifStyle) {
    return (
      <View style={styles.wrap}>
        {links.map((link) => (
          <FieldDetailMotifCard
            key={link.id}
            motif={link.icon}
            icon={link.icon}
            gold={link.alert || link.id === 'edit'}
            onPress={link.onPress}
            accessibilityLabel={[link.title, link.detail].filter(Boolean).join('. ')}
          >
            <View style={[styles.motifRow, { minHeight: Math.max(40, tapMin - 12) }]}>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {link.title}
                </Text>
                {link.detail ? (
                  <Text style={[styles.detail, { color: colors.textTertiary }]} numberOfLines={2}>
                    {link.detail}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </FieldDetailMotifCard>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {links.map((link) => (
        <Pressable
          key={link.id}
          onPress={link.onPress}
          style={({ pressed }) => [
            styles.door,
            {
              minHeight: Math.max(56, tapMin),
              backgroundColor: link.alert ? colors.surfaceMuted : colors.surface,
              borderColor: link.alert ? colors.accentGold : colors.borderLight,
              opacity: pressed ? 0.92 : 1,
              ...createElevation(colors, 'flat'),
            },
          ]}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor: link.alert ? colors.warningLight || colors.primaryLight : colors.surfaceMuted,
              },
            ]}
          >
            <Ionicons
              name={link.icon}
              size={20}
              color={link.alert ? colors.accentGold : colors.primary}
            />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {link.title}
            </Text>
            {link.detail ? (
              <Text style={[styles.detail, { color: colors.textTertiary }]} numberOfLines={1}>
                {link.detail}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  door: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  detail: {
    fontSize: 13,
    marginTop: 1,
  },
});

export default FieldQuickLinks;
