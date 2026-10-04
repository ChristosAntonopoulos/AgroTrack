import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { templateMeta, type FieldWorkCategory } from '../../data/fieldWorkCatalogueLabels';
import { hexToRgba } from '../../utils/hexToRgba';

const ICONS: Record<FieldWorkCategory, React.ComponentProps<typeof Ionicons>['name']> = {
  monitoring: 'bug-outline',
  pruning: 'cut-outline',
  fertilisation: 'leaf-outline',
  irrigation: 'water-outline',
  harvest: 'basket-outline',
  inspection: 'eye-outline',
  analysis: 'flask-outline',
  ground: 'earth-outline',
  other: 'clipboard-outline',
};

export const taskCategoryIcon = (
  templateCode?: string | null
): React.ComponentProps<typeof Ionicons>['name'] => {
  const category = templateMeta(templateCode || undefined)?.category ?? 'other';
  return ICONS[category] || 'clipboard-outline';
};

type Props = {
  templateCode?: string | null;
  accent: string;
  size?: number;
};

const TaskCategoryGlyph: React.FC<Props> = ({ templateCode, accent, size = 44 }) => (
  <View
    style={[
      styles.wrap,
      {
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: hexToRgba(accent, 0.16),
      },
    ]}
  >
    <Ionicons name={taskCategoryIcon(templateCode)} size={Math.round(size * 0.48)} color={accent} />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskCategoryGlyph;
