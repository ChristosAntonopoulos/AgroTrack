import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { personInitials } from './personInitials';
import { phoneHref } from '../../utils/phoneLinks';

type Props = {
  name: string;
  subtitle: string;
  hint?: string;
  phone?: string;
  email?: string;
  onPress: () => void;
};

/**
 * Dense network row — same height for everyone.
 * No badges, no action buttons. Phone is a quiet shortcut only.
 */
const PersonCard: React.FC<Props> = ({ name, subtitle, hint, phone, email, onPress }) => {
  const { colors } = useTheme();
  const { fontScaleMultiplier } = usePreferences();
  const tel = phoneHref(phone, 'tel');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.avatarText, { color: colors.primary, fontSize: 13 * fontScaleMultiplier }]}>
          {personInitials(name)}
        </Text>
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.name, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
        {hint ? (
          <Text
            style={[styles.hint, { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {hint}
          </Text>
        ) : email ? (
          <Text
            style={[styles.hint, { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {email}
          </Text>
        ) : null}
      </View>

      {tel ? (
        <Pressable
          onPress={() => void Linking.openURL(tel)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Call"
          style={styles.phoneHit}
        >
          <Ionicons name="call-outline" size={18} color={colors.primary} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.chevron} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    minHeight: 60,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700' },
  body: { flex: 1, gap: 1, justifyContent: 'center' },
  name: { fontWeight: '600' },
  subtitle: { fontWeight: '400' },
  hint: {},
  phoneHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: { marginRight: 4 },
});

export default PersonCard;
