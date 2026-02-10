import React from 'react';
import { View, StyleSheet } from 'react-native';
import Input, { InputProps } from '../ui/Input';
import { spacing } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

export interface FormFieldProps extends InputProps {
  // FormField extends Input props, no additional props needed
  // The label, error, helperText are already in Input
}

const FormField: React.FC<FormFieldProps> = (props) => {
  // Convert boolean props for native TextInput component only
  const sanitizedProps = {
    ...props,
    editable: props.editable !== undefined ? toBoolean(props.editable) : props.editable,
    autoCorrect: props.autoCorrect !== undefined ? toBoolean(props.autoCorrect) : props.autoCorrect,
    secureTextEntry: props.secureTextEntry !== undefined ? toBoolean(props.secureTextEntry) : props.secureTextEntry,
    // showPasswordToggle is not a native prop, just used for conditional rendering in Input
    showPasswordToggle: props.showPasswordToggle,
  };
  
  return (
    <View style={styles.container}>
      <Input {...sanitizedProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
});

export default FormField;
