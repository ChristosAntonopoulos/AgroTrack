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
import { captureContextForRoute, type FocusedRoute } from './dockRoute';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import GuideTarget from '../components/onboarding/GuideTarget';

type Props = {
  route: FocusedRoute;
};

/**
 * Workspace mark and the record button, side by side above the safe area.
 * The launcher already is the menu, so only the + shows there.
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
          <GuideTarget id="homeButton">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('launcher.home')}
              onPress={() => navigation.navigate('Main', { screen: 'Launcher' })}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? motion.fabPressScale : 1 }] }]}
            >
              <View
                style={[
                  styles.orb,
                  styles.menuOrb,
                  {
                    width: size,
                    height: size,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: isDark ? 'rgba(235, 239, 230, 0.55)' : colors.primary,
                  },
                ]}
              >
                <BrandLogo variant="mark" tone={isDark ? 'on-dark' : 'on-light'} size={Math.round(size * 0.62)} />
              </View>
            </Pressable>
          </GuideTarget>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('capture', { defaultValue: 'Record' })}
          onPress={() => {
            if (dockAdd?.onAdd) dockAdd.onAdd();
            else capture?.openCapture(captureContextForRoute(route));
          }}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? motion.fabPressScale : 1 }] }]}
        >
          <View
            style={[
              styles.orb,
              styles.addOrb,
              {
                width: size,
                height: size,
                backgroundColor: colors.primary,
                borderColor: 'transparent',
              },
            ]}
          >
            <Ionicons name="add" size={34} color={colors.onOlive} />
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
    gap: 18,
    backgroundColor: 'transparent',
  },
  orb: {
    borderRadius: 999,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuOrb: {
    borderWidth: 1.5,
  },
  addOrb: {
    shadowColor: '#273625',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
});

export default AppDock;
