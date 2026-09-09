import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import Button from '../ui/Button';
import PhoneActions from './PhoneActions';
import { GrovePerson } from '../../utils/grovePeople';
import { spacing, typography } from '../../theme';

type Props = {
  people: GrovePerson[];
  compact?: boolean;
  onPress?: () => void;
  onAddContact?: () => void;
};

const WhoWorksHere: React.FC<Props> = ({ people, compact = false, onPress, onAddContact }) => {
  const { t } = useTranslation(['fields', 'partners']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const Wrap = onPress && compact ? Pressable : View;
  const wrapProps = onPress && compact ? { onPress, accessibilityRole: 'button' as const } : {};

  return (
    <Wrap
      {...wrapProps}
      style={[styles.wrap, { borderColor: colors.borderLight, backgroundColor: colors.surface, minHeight: tapMin }]}
    >
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}>
        {t('partners:myPeople', { defaultValue: t('fields:people.whoWorks') })}
      </Text>
      {people.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }}>
          {t('partners:emptyPeopleHint', { defaultValue: t('fields:people.empty') })}
        </Text>
      ) : compact ? (
        <View style={styles.row}>
          {people.map((person) => (
            <View
              key={person.id}
              style={[
                styles.chip,
                {
                  minHeight: Math.max(tapMin - 8, 40),
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="person-outline" size={16} color={colors.primaryDark} />
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 * fontScaleMultiplier }}>
                {person.displayName}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {people.map((person) => (
            <View
              key={person.id}
              style={[styles.person, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 * fontScaleMultiplier }}>
                {person.displayName}
              </Text>
              {person.phone ? (
                <Text style={{ color: colors.textSecondary }}>{person.phone}</Text>
              ) : null}
              {person.connections.length > 0 ? (
                <View style={styles.row}>
                  {person.connections.map((connection) => (
                    <Text
                      key={connection}
                      style={[styles.smallChip, { color: colors.textSecondary, backgroundColor: colors.surface }]}
                    >
                      {t(`partners:connection.${connection}`)}
                    </Text>
                  ))}
                </View>
              ) : null}
              <PhoneActions phone={person.phone} />
            </View>
          ))}
        </View>
      )}
      {onAddContact ? (
        <Button title={t('partners:saveContact')} onPress={onAddContact} />
      ) : null}
      {!compact && onPress ? (
        <Button title={t('partners:openInPartners')} variant="outline" onPress={onPress} />
      ) : null}
    </Wrap>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.styles.body,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: {
    gap: spacing.sm,
  },
  person: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  smallChip: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: '600',
  },
});

export default WhoWorksHere;
