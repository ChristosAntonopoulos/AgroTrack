import React from 'react';
import { Alert, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldCenter } from '../../utils/fieldGeo';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  field: Field;
  canOwn: boolean;
  onDelete?: () => void;
  onOpenChronologio: () => void;
};

const FieldMoreMenu: React.FC<Props> = ({ field, canOwn, onDelete, onOpenChronologio }) => {
  const { t } = useTranslation(['fields', 'common', 'chronologio']);
  const { colors, tapMin } = useTheme();
  const navigation = useNavigation<Nav>();
  const center = resolveFieldCenter(field);

  const open = () => {
    const buttons: Array<{
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }> = [];

    if (canOwn) {
      buttons.push({
        text: t('fields:editField'),
        onPress: () => navigation.navigate('FieldForm', { fieldId: field.id }),
      });
    }
    buttons.push({ text: t('chronologio:title'), onPress: onOpenChronologio });
    buttons.push({
      text: t('chronologio:weatherVegetation.button'),
      onPress: () => navigation.navigate('FieldWeatherVegetation', { fieldId: field.id }),
    });
    buttons.push({
      text: t('fields:more.partners'),
      onPress: () => navigation.navigate('Partners', { fieldId: field.id }),
    });
    if (center) {
      buttons.push({
        text: t('fields:openMaps'),
        onPress: () => {
          void Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${center.latitude},${center.longitude}`
            )}`
          );
        },
      });
    }
    if (canOwn && onDelete) {
      buttons.push({ text: t('common:delete'), style: 'destructive', onPress: onDelete });
    }
    buttons.push({ text: t('common:cancel', { defaultValue: 'Cancel' }), style: 'cancel' });

    Alert.alert(field.name, undefined, buttons);
  };

  return (
    <Pressable
      onPress={open}
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
  );
};

export default FieldMoreMenu;
