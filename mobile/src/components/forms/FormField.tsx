import React from 'react';
import { View, StyleSheet } from 'react-native';
import Input, { InputProps } from '../ui/Input';
import { spacing } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

export interface FormFieldProps extends InputProps {}

const FormField: React.FC<FormFieldProps> = (props) => {
  const { containerStyle, ...rest } = props;
  const sanitizedProps: InputProps = {
    ...rest,
    editable: props.editable !== undefined ? toBoolean(props.editable) : props.editable,
    autoCorrect: props.autoCorrect !== undefined ? toBoolean(props.autoCorrect) : props.autoCorrect,
    secureTextEntry:
      props.secureTextEntry !== undefined ? toBoolean(props.secureTextEntry) : props.secureTextEntry,
    multiline: props.multiline !== undefined ? toBoolean(props.multiline) : props.multiline,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Input {...sanitizedProps} containerStyle={{ marginBottom: 0 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
});

export default FormField;
