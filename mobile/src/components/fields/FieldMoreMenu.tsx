import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { resolveFieldCenter } from '../../utils/fieldGeo';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  field: Field;
  canEdit: boolean;
  canDelete: boolean;
  canManageAccess: boolean;
  canViewChronologio: boolean;
  canViewPhotos: boolean;
  canViewMap: boolean;
  canViewEnvironmentalData: boolean;
  onDelete?: () => void;
  onOpenChronologio: () => void;
};

type Action = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  destructive?: boolean;
};

const FieldMoreMenu: React.FC<Props> = ({
  field,
  canEdit,
  canDelete,
  canManageAccess,
  canViewChronologio,
  canViewPhotos,
  canViewMap,
  canViewEnvironmentalData,
  onDelete,
  onOpenChronologio,
}) => {
  const { t } = useTranslation(['fields', 'common', 'chronologio', 'partners', 'nav']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState(false);
  const center = resolveFieldCenter(field);
  const title = friendlyFieldLabel(field.name);

  const close = () => setOpen(false);

  const run = (fn: () => void) => {
    close();
    // Let the sheet dismiss before navigating / alerting.
    requestAnimationFrame(() => fn());
  };

  const actions: Action[] = [];
  if (canEdit) {
    actions.push({
      key: 'edit',
      label: t('fields:editField'),
      icon: 'create-outline',
      onPress: () => run(() => navigation.navigate('FieldForm', { fieldId: field.id })),
    });
    actions.push({
      key: 'boundary',
      label: t('fields:createGrove.enrich.boundaryAction'),
      icon: 'map-outline',
      onPress: () => run(() => navigation.navigate('FieldMapBoundary', { fieldId: field.id })),
    });
  }
  if (canViewChronologio) {
    actions.push({
      key: 'chronologio',
      label: t('chronologio:title'),
      icon: 'book-outline',
      onPress: () => run(onOpenChronologio),
    });
  }
  if (canViewPhotos) {
    actions.push({
      key: 'photos',
      label: t('nav:photos', { defaultValue: 'Photos' }),
      icon: 'images-outline',
      onPress: () => run(() => navigation.navigate('Photos', { fieldId: field.id })),
    });
  }
  if (center && canViewPhotos) {
    actions.push({
      key: 'importNearby',
      label: t('fields:more.importNearbyPhotos'),
      icon: 'scan-outline',
      onPress: () =>
        run(() => navigation.navigate('Photos', { fieldId: field.id, importNearby: true })),
    });
  }
  if (canViewEnvironmentalData) {
    actions.push({
      key: 'weather',
      label: t('chronologio:weatherVegetation.button'),
      icon: 'partly-sunny-outline',
      onPress: () => run(() => navigation.navigate('FieldWeatherVegetation', { fieldId: field.id })),
    });
  }
  if (canManageAccess) {
    actions.push({
      key: 'partners',
      label: t('fields:more.partners', { defaultValue: t('partners:title') }),
      icon: 'people-outline',
      onPress: () => run(() => navigation.navigate('Partners', { fieldId: field.id })),
    });
  }
  if (center && canViewMap) {
    actions.push({
      key: 'maps',
      label: t('fields:openMaps'),
      icon: 'map-outline',
      onPress: () =>
        run(() => {
          void Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${center.latitude},${center.longitude}`
            )}`
          );
        }),
    });
  }
  if (canDelete && onDelete) {
    actions.push({
      key: 'delete',
      label: t('common:delete'),
      icon: 'trash-outline',
      onPress: () => run(onDelete),
      destructive: true,
    });
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('common:actions', { defaultValue: 'More' })}
        style={{
          minHeight: tapMin,
          minWidth: tapMin,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.overlay} onPress={close} accessibilityRole="button" />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text
              style={[styles.title, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {t('fields:more.sheetHint', { defaultValue: 'Field actions' })}
            </Text>

            <View style={styles.list}>
              {actions.map((action) => (
                <Pressable
                  key={action.key}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      minHeight: Math.max(48, tapMin),
                      backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: action.destructive
                          ? colors.errorLight
                          : colors.primaryLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={18}
                      color={action.destructive ? colors.error : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.rowLabel,
                      {
                        color: action.destructive ? colors.error : colors.textPrimary,
                        fontSize: 16 * fontScaleMultiplier,
                      },
                    ]}
                  >
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={close}
              style={[styles.cancel, { backgroundColor: colors.surfaceMuted, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>
                {t('common:cancel', { defaultValue: 'Cancel' })}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 24, 18, 0.55)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: { fontWeight: '800', textAlign: 'center' },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  list: { gap: 2, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontWeight: '600' },
  cancel: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FieldMoreMenu;
