import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { CAPTURE_TABS, type CaptureTab } from '../../capture/types';
import { radii } from '../../theme';

const TAB_ICONS: Record<CaptureTab, keyof typeof Ionicons.glyphMap> = {
  day: 'sunny-outline',
  grove: 'leaf-outline',
  warehouse: 'cube-outline',
  money: 'wallet-outline',
};

type TabBarProps = {
  tab: CaptureTab;
  onChange: (tab: CaptureTab) => void;
};

export const CaptureTabBar: React.FC<TabBarProps> = ({ tab, onChange }) => {
  const { t } = useTranslation('capture');
  const { colors, tapMin } = useTheme();

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderLight,
        },
      ]}
      accessibilityRole="tablist"
    >
      {CAPTURE_TABS.map((id) => {
        const on = tab === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.tab,
              {
                minHeight: Math.max(52, tapMin),
                backgroundColor: on ? colors.surfaceElevated : 'transparent',
                opacity: pressed ? 0.9 : 1,
                shadowOpacity: on ? 0.08 : 0,
                elevation: on ? 2 : 0,
              },
            ]}
          >
            <Ionicons
              name={TAB_ICONS[id]}
              size={18}
              color={on ? colors.primary : colors.textTertiary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                { color: on ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {t(`tabs.${id}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

type ActionCardProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
  featured?: boolean;
  onPress: () => void;
};

export const CaptureActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  accent,
  soft,
  featured,
  onPress,
}) => {
  const { colors, tapMin } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: featured ? accent : colors.borderLight,
          backgroundColor: soft,
          minHeight: Math.max(88, tapMin + 24),
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={accent} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 2,
    shadowColor: '#24251F',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: radii.xl,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  iconWell: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  hint: { fontSize: 13, lineHeight: 18 },
});
