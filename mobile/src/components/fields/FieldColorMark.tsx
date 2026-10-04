import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldColor } from '../../utils/fieldColors';

type Props = {
  color?: string | null;
  fieldId?: string | null;
  /** Ring when the choice is not one grove (all fields, unassigned). */
  hollow?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/** Circular grove colour used beside every field name in a chooser. */
const FieldColorMark: React.FC<Props> = ({
  color,
  fieldId,
  hollow = false,
  size = 12,
  style,
}) => {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hollow ? 'transparent' : resolveFieldColor(color, fieldId),
          borderColor: hollow ? colors.textTertiary : 'rgba(0,0,0,0.18)',
          borderWidth: hollow ? 1.5 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  mark: { flexShrink: 0 },
});

export default FieldColorMark;
