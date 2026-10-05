import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import type { GroveOilGroup } from '../../myOil/groupLotsByGrove';
import { OilByGroveSection } from './OilByGroveSection';
import { createMyOilStyles } from './myOilStyles';

type Props = {
  open: boolean;
  groups: GroveOilGroup[];
  fieldNames: Record<string, string>;
  focusFieldId?: string | null;
  /** One shelf, when a summary row was tapped. Omit to show the full list. */
  focusKey?: string | null;
  onClose: () => void;
  onFill: () => void;
  onFillGrove: (group: GroveOilGroup) => void;
  onEdit: (group: GroveOilGroup) => void;
};

/** Shelves as their own page: one grove at a time, fill from the plus. */
export function OilShelvesSheet({
  open,
  groups,
  fieldNames,
  focusFieldId,
  focusKey,
  onClose,
  onFill,
  onFillGrove,
  onEdit,
}: Props) {
  const { t } = useTranslation('myOil');
  const { colors, tapMin } = useTheme();
  const styles = createMyOilStyles(colors, tapMin);
  const insets = useSafeAreaInsets();
  const shown = focusKey ? groups.filter((group) => group.key === focusKey) : groups;
  const list = shown.length > 0 ? shown : groups;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.shelfScreen, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.shelfTopBar}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('give.back')}
            style={styles.shelfBack}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.shelfScreenTitle} numberOfLines={1}>
            {t('byGrove.title')}
          </Text>
          <Pressable
            onPress={onFill}
            accessibilityRole="button"
            accessibilityLabel={t('actions.fillVerb')}
            style={styles.shelfPlus}
          >
            <Ionicons name="add" size={22} color={colors.onOlive} />
          </Pressable>
        </View>
        <Text style={styles.shelfScreenHint}>{t('byGrove.organize')}</Text>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Math.max(insets.bottom, 24),
            gap: 10,
          }}
        >
          <OilByGroveSection
            groups={list}
            fieldNames={fieldNames}
            focusFieldId={focusFieldId}
            onFillGrove={onFillGrove}
            onEdit={onEdit}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
