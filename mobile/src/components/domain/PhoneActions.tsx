import React from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { phoneHref } from '../../utils/phoneLinks';

type Props = {
  phone?: string | null;
};

const PhoneActions: React.FC<Props> = ({ phone }) => {
  const { t } = useTranslation(['partners']);
  const tel = phoneHref(phone, 'tel');
  const sms = phoneHref(phone, 'sms');
  if (!tel && !sms) return null;

  return (
    <View style={styles.row}>
      {tel ? (
        <Button
          title={t('partners:call')}
          size="large"
          onPress={() => void Linking.openURL(tel)}
          style={styles.button}
        />
      ) : null}
      {sms ? (
        <Button
          title={t('partners:text')}
          size="large"
          variant="outline"
          onPress={() => void Linking.openURL(sms)}
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  button: {
    flexGrow: 1,
    minWidth: 140,
  },
});

export default PhoneActions;
