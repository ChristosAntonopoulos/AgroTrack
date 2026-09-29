import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radii } from '../../theme';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import FieldColorMark from './FieldColorMark';

export type FieldNameRef = {
  id: string;
  name: string;
  color?: string | null;
};

type Props = {
  field: FieldNameRef;
  size?: 'sm' | 'md';
};

/** Grove colour dot and name, used wherever a field is named. */
const FieldName: React.FC<Props> = ({ field, size = 'sm' }) => {
  const { colors } = useTheme();
  const accent = resolveFieldColor(field.color, field.id);
  const tint = accent.length === 7 ? `${accent}24` : colors.primaryLight;

  return (
    <View
      style={[
        styles.chip,
        size === 'md' && styles.chipMd,
        { backgroundColor: tint, borderColor: accent },
      ]}
    >
      <FieldColorMark color={field.color} fieldId={field.id} size={size === 'sm' ? 8 : 10} />
      <Text
        style={{
          color: colors.textPrimary,
          fontWeight: '700',
          fontSize: size === 'sm' ? 13 : 14,
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {friendlyFieldLabel(field.name)}
      </Text>
    </View>
  );
};

export const FieldNameRow: React.FC<{ fields: FieldNameRef[]; size?: 'sm' | 'md' }> = ({
  fields,
  size = 'sm',
}) => {
  if (fields.length === 0) return null;
  return (
    <View style={styles.row}>
      {fields.map((field) => (
        <FieldName key={field.id} field={field} size={size} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipMd: {
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 5,
  },
});

export default FieldName;
