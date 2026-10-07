import React from 'react';
import { Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography } from '../theme';

type Route = RouteProp<{ Legal: { kind?: 'privacy' | 'terms' } }, 'Legal'>;
type LegalSection = { heading?: string; paragraphs?: string[] };

const PUBLIC_PRIVACY_URL = 'https://theolivelot.com/privacy/';
const PUBLIC_DELETE_ACCOUNT_URL = 'https://theolivelot.com/delete-account/';
const SUPPORT_EMAIL = 'support@theolivelot.com';

const LegalScreen = () => {
  const { t } = useTranslation('legal');
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<Route>();
  const kind = params?.kind || 'privacy';
  const disclaimer = t('disclaimer');
  const updated = t(`${kind}.updated`, { defaultValue: '' });
  const intro = t(`${kind}.intro`, { defaultValue: '' });
  const sectionsRaw = t(`${kind}.sections`, { returnObjects: true, defaultValue: [] });
  const sections = Array.isArray(sectionsRaw) ? (sectionsRaw as LegalSection[]) : [];
  const pointsRaw = t(`${kind}.points`, { returnObjects: true, defaultValue: [] });
  const points = Array.isArray(pointsRaw) ? (pointsRaw as string[]) : [];

  return (
    <ScreenLayout padded>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {disclaimer ? (
          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{disclaimer}</Text>
        ) : null}
        {updated ? <Text style={[styles.updated, { color: colors.textSecondary }]}>{updated}</Text> : null}
        {intro ? <Text style={[styles.point, { color: colors.textPrimary }]}>{intro}</Text> : null}
        {sections.map((section) => (
          <React.Fragment key={section.heading || section.paragraphs?.[0]}>
            {section.heading ? (
              <Text style={[styles.heading, { color: colors.textPrimary }]}>{section.heading}</Text>
            ) : null}
            {(section.paragraphs || []).map((paragraph) => (
              <Text key={paragraph} style={[styles.point, { color: colors.textPrimary }]}>
                {paragraph}
              </Text>
            ))}
          </React.Fragment>
        ))}
        {points.map((item) => (
          <Text key={item} style={[styles.point, { color: colors.textPrimary }]}>
            {item}
          </Text>
        ))}
        <Text style={[styles.point, { color: colors.textSecondary }]}>
          {t('contact')}{' '}
          <Text style={{ color: colors.link }} onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            {SUPPORT_EMAIL}
          </Text>
        </Text>
        {kind === 'privacy' ? (
          <>
            <Button
              title={t('viewOnline')}
              variant="outline"
              onPress={() => void Linking.openURL(PUBLIC_PRIVACY_URL)}
            />
            <Button
              title={t('deleteAccountOnline')}
              variant="outline"
              onPress={() => void Linking.openURL(PUBLIC_DELETE_ACCOUNT_URL)}
            />
          </>
        ) : null}
        <Button title={t('back')} variant="outline" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.xl },
  disclaimer: { ...typography.styles.caption },
  updated: { ...typography.styles.caption },
  heading: { ...typography.styles.body, fontWeight: '700', marginTop: spacing.sm },
  point: { ...typography.styles.body, lineHeight: 22 },
});

export default LegalScreen;
