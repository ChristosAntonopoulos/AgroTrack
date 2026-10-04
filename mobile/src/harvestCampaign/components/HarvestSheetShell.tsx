import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Simple sheet body layout. Prefer passing actions to the parent Sheet.footer. */
export const HarvestSheetShell: React.FC<Props> = ({ children, footer }) => (
  <View style={styles.shell}>
    <View style={styles.body}>{children}</View>
    {footer ? <View style={styles.footer}>{footer}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  shell: { gap: spacing.base },
  body: { gap: spacing.md },
  footer: { gap: spacing.sm, paddingTop: spacing.sm },
});
