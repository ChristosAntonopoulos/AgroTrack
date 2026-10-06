import React from 'react';
import { Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';
type Route = RouteProp<{ Legal: { kind?: 'privacy' | 'terms' } }, 'Legal'>;

const LegalScreen = () => {
  const { t } = useTranslation('legal');
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const kind = params?.kind || 'privacy';
  const points = t(`${kind}.points`, { returnObjects: true });
  const items = Array.isArray(points) ? (points as string[]) : [];

  return (
    <ScreenLayout padded>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t('disclaimer')}</Text>
        {items.map((item) => (
          <Text key={item} style={[styles.point, { color: colors.textPrimary }]}>
            {item}
          </Text>
        ))}
        <Text style={[styles.point, { color: colors.textSecondary }]}>
          {t('contact')}{' '}
          <Text style={{ color: colors.link }} onPress={() => void Linking.openURL('mailto:hello@theolivelot.com')}>
            hello@theolivelot.com
          </Text>
        </Text>
        <Button title={t('back')} variant="outline" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.xl },
  disclaimer: { ...typography.styles.caption },
  point: { ...typography.styles.body, lineHeight: 22 },
});

export default LegalScreen;
