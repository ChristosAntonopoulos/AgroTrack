import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { fieldPeopleService, type FieldMembership } from '../../services/fieldPeopleService';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing } from '../../theme';

type Props = {
  fieldId: string;
  onManage: () => void;
  /** Tiny inline line for list cards. */
  variant?: 'overview' | 'card';
  /** Prefer memberships already on the field when present. */
  seed?: FieldMembership[] | null;
};

const FieldPeopleStrip: React.FC<Props> = ({ fieldId, onManage, variant = 'overview', seed }) => {
  const { t } = useTranslation(['fields', 'partners']);
  const { colors, tapMin } = useTheme();
  const [people, setPeople] = useState<FieldMembership[] | null>(seed ?? null);

  useEffect(() => {
    if (seed && seed.length > 0) {
      setPeople(seed);
      return;
    }
    let cancelled = false;
    void fieldPeopleService
      .getPeople(fieldId)
      .then((list) => {
        if (!cancelled) {
          setPeople(list.filter((p) => p.status !== 'Revoked' && p.status !== 'Expired'));
        }
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId, seed]);

  if (!people || people.length === 0) return null;

  const names = people
    .map((p) => p.displayName || p.email || p.phone || '—')
    .filter(Boolean);

  if (variant === 'card') {
    const shown = names.slice(0, 2).join(', ');
    const extra = names.length > 2 ? ` +${names.length - 2}` : '';
    return (
      <View style={styles.cardLine}>
        <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
        <Text style={[styles.cardText, { color: colors.textTertiary }]} numberOfLines={1}>
          {shown}
          {extra}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <Pressable
        onPress={onManage}
        style={({ pressed }) => [styles.head, { opacity: pressed ? 0.9 : 1, minHeight: Math.max(40, tapMin - 8) }]}
        accessibilityRole="button"
      >
        <View style={[styles.headIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="people-outline" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fields:overview.people.title', { defaultValue: 'Άτομα' })}
        </Text>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
          {t('fields:overview.people.manage', { defaultValue: 'Διαχείριση' })}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>
      <View style={styles.list}>
        {people.slice(0, 4).map((person) => {
          const label = person.displayName || person.email || person.phone || '—';
          const role = t(`fields:card.role.${person.role}`, { defaultValue: person.role });
          return (
            <View key={`${person.userId}-${person.inviteId || ''}`} style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                  {(label.trim().charAt(0) || '?').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>
                  {role}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700' },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardText: { flex: 1, fontSize: 12, fontWeight: '600' },
});

export default FieldPeopleStrip;
