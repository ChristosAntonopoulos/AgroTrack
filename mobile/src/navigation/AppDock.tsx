import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '../components/ui/BrandLogo';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { motion } from '../theme';
import { useDock } from './DockContext';
import { FOOTER_LIFT, getDockMetrics } from './dockMetrics';
import type { RootStackParamList } from './types';
import type { FocusedRoute } from './dockRoute';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';

type Props = {
  route: FocusedRoute;
};

const INK = '#1F2820';
const IVORY = '#F4F0E6';

/**
 * Workspace mark and the capture control, side by side above the safe area.
 * The launcher already is the menu, so only + shows there.
 * A screen can replace the + action through DockContext.
 */
const AppDock: React.FC<Props> = ({ route }) => {
  const { colors, isDark, tapMin } = useTheme();
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
  const { t } = useTranslation('nav');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { add: dockAdd } = useDock();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (activation?.locked || keyboardOpen) return null;

  const metrics = getDockMetrics(tapMin, insets.bottom);
  const size = metrics.fabSize;
  const showMenu = route.name !== 'Launcher';

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: metrics.bottomInset + FOOTER_LIFT }]}>
      <View style={styles.pair}>
        {showMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('launcher.home')}
            onPress={() => navigation.navigate('Main', { screen: 'Launcher' })}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <View
              style={[
                styles.menuPlate,
                {
                  width: size,
                  height: size,
                  backgroundColor: isDark ? colors.surfaceElevated : IVORY,
                  borderColor: isDark ? 'rgba(244, 240, 230, 0.35)' : 'rgba(31, 40, 32, 0.18)',
                },
              ]}
            >
              <BrandLogo variant="mark" tone={isDark ? 'on-dark' : 'on-light'} size={Math.round(size * 0.7)} />
            </View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('log', { defaultValue: 'Add' })}
          onPress={() => {
            if (dockAdd?.onAdd) dockAdd.onAdd();
            else capture?.openCapture();
          }}
          style={({ pressed }) => [
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? motion.fabPressScale : 1 }] },
          ]}
        >
          <View
            style={[
              styles.addPlate,
              {
                width: size,
                height: size,
                backgroundColor: colors.primary,
                borderColor: isDark ? 'rgba(244, 240, 230, 0.22)' : 'rgba(31, 40, 32, 0.28)',
                shadowColor: INK,
              },
            ]}
          >
            <Ionicons name="add" size={30} color={IVORY} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  menuPlate: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlate: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
});

export default AppDock;
