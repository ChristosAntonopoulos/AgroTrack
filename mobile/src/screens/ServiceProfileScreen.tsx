import React, { useEffect, useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { getPartnerService } from '../services/serviceFactory';
import {
  ServiceCategory,
  ServiceProviderProfile,
  categoryName,
  childCategories,
  parentCategories,
  offersMill,
} from '../services/partnerService';
import { locationService } from '../services/locationService';
import { spacing } from '../theme';

const ServiceProfileScreen = () => {
  const { t, i18n } = useTranslation('partners');
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ServiceProviderProfile | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [baseAreaLabel, setBaseAreaLabel] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(50);
  const [providerKind, setProviderKind] = useState('Individual');
  const [availability, setAvailability] = useState('Available');
  const [experienceYears, setExperienceYears] = useState('');
  const [crewSize, setCrewSize] = useState('');
  const [equipment, setEquipment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [serviceCategoryIds, setServiceCategoryIds] = useState<string[]>([]);
  const [millOperatingPeriod, setMillOperatingPeriod] = useState('');
  const [millProcessingMethod, setMillProcessingMethod] = useState('');
  const [millOrganic, setMillOrganic] = useState(false);
  const [millAppointmentRequired, setMillAppointmentRequired] = useState(false);
  const [certifications, setCertifications] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getPartnerService().getMyProfile(), getPartnerService().getCategories()]).then(
      ([mine, cats]) => {
        setProfile(mine);
        setCategories(cats);
        if (mine) {
          setDisplayName(mine.displayName || '');
          setShortDescription(mine.shortDescription || '');
          setBaseAreaLabel(mine.baseAreaLabel || '');
          setServiceRadiusKm(mine.serviceRadiusKm || 50);
          setProviderKind(mine.providerKind || 'Individual');
          setAvailability(mine.availability || 'Available');
          setExperienceYears(mine.experienceYears != null ? String(mine.experienceYears) : '');
          setCrewSize(mine.crewSize != null ? String(mine.crewSize) : '');
          setEquipment(mine.equipment || '');
          setPhoneNumber(mine.phoneNumber || '');
          setShowPhone(mine.showPhone);
          setServiceCategoryIds(mine.serviceCategoryIds || []);
          setMillOperatingPeriod(mine.millOperatingPeriod || '');
          setMillProcessingMethod(mine.millProcessingMethod || '');
          setMillOrganic(Boolean(mine.millOrganic));
          setMillAppointmentRequired(Boolean(mine.millAppointmentRequired));
          setCertifications((mine.certifications || []).join(', '));
          setLatitude(mine.latitude);
          setLongitude(mine.longitude);
        }
      }
    ).finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setServiceCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const publish = async () => {
    const updated = await getPartnerService().saveProfile({
      displayName,
      shortDescription,
      baseAreaLabel,
      serviceRadiusKm,
      providerKind,
      availability,
      experienceYears: experienceYears ? Number(experienceYears) : null,
      crewSize: crewSize ? Number(crewSize) : null,
      equipment,
      phoneNumber,
      showPhone,
      serviceCategoryIds,
      millOperatingPeriod: millOperatingPeriod || null,
      millProcessingMethod: millProcessingMethod || null,
      millOrganic,
      millAppointmentRequired,
      certifications: certifications
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      latitude,
      longitude,
    });
    setProfile(updated);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!profile) {
    return (
      <ScreenLayout padded>
        <ScreenHeader title={t('myServices')} />
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{t('offer')}</Text>
        <Button
          title={t('enable')}
          onPress={async () => {
            const created = await getPartnerService().activate();
            setProfile(created);
            setDisplayName(created.displayName);
          }}
        />
      </ScreenLayout>
    );
  }

  const inputStyle = [styles.input, { color: colors.textPrimary, borderColor: colors.border }];

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('myServices')} />
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
        {t('wizardStep', { step })}
      </Text>

      {step === 1 &&
        parentCategories(categories).map((parent) => (
          <View key={parent.id} style={{ marginBottom: spacing.md }}>
            <Pressable onPress={() => toggle(parent.id)} style={styles.row}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {serviceCategoryIds.includes(parent.id) ? '☑ ' : '☐ '}
                {categoryName(parent, i18n.language)}
              </Text>
            </Pressable>
            {childCategories(categories, parent.id).map((child) => (
              <Pressable key={child.id} onPress={() => toggle(child.id)} style={styles.child}>
                <Text style={{ color: colors.textSecondary }}>
                  {serviceCategoryIds.includes(child.id) ? '☑ ' : '☐ '}
                  {categoryName(child, i18n.language)}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}

      {step === 2 && (
        <>
          <TextInput
            value={baseAreaLabel}
            onChangeText={setBaseAreaLabel}
            placeholder={t('baseArea')}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
          <View style={styles.row}>
            {[25, 50, 60, 100].map((km) => (
              <Button
                key={km}
                title={`${km}`}
                variant={serviceRadiusKm === km ? 'primary' : 'outline'}
                onPress={() => setServiceRadiusKm(km)}
              />
            ))}
          </View>
          <Button
            title={t('useMyLocation', { defaultValue: 'Use my current location as base' })}
            variant="outline"
            onPress={() => {
              void locationService.getCurrentLocation().then((pos) => {
                setLatitude(pos.latitude);
                setLongitude(pos.longitude);
              });
            }}
          />
          {latitude != null && longitude != null ? (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.sm }}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          ) : null}
        </>
      )}

      {step === 3 && (
        <>
          <TextInput value={displayName} onChangeText={setDisplayName} style={inputStyle} />
          <TextInput
            value={shortDescription}
            onChangeText={setShortDescription}
            multiline
            style={[inputStyle, styles.area]}
          />
          <View style={styles.row}>
            {['Individual', 'Team', 'Business'].map((kind) => (
              <Button
                key={kind}
                title={t(`kind.${kind}`)}
                variant={providerKind === kind ? 'primary' : 'outline'}
                onPress={() => setProviderKind(kind)}
              />
            ))}
          </View>
          <View style={styles.row}>
            {['Available', 'Limited', 'Unavailable'].map((value) => (
              <Button
                key={value}
                title={t(`availability.${value}`)}
                variant={availability === value ? 'primary' : 'outline'}
                onPress={() => setAvailability(value)}
              />
            ))}
          </View>
          {providerKind === 'Team' ? (
            <TextInput
              value={crewSize}
              onChangeText={setCrewSize}
              keyboardType="number-pad"
              placeholder={t('crewSize')}
              placeholderTextColor={colors.textSecondary}
              style={inputStyle}
            />
          ) : null}
          <TextInput
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="number-pad"
            placeholder={t('experience')}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={equipment}
            onChangeText={setEquipment}
            placeholder={t('equipment')}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={t('phone')}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
          <Button
            title={showPhone ? t('showPhoneOn') : t('showPhoneOff')}
            variant="outline"
            onPress={() => setShowPhone((v) => !v)}
          />
          <TextInput
            value={certifications}
            onChangeText={setCertifications}
            placeholder={t('certifications', { defaultValue: 'Certifications' })}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
          {offersMill(categories, serviceCategoryIds) ? (
            <>
              <TextInput
                value={millOperatingPeriod}
                onChangeText={setMillOperatingPeriod}
                placeholder={t('mill.period', { defaultValue: 'Operating period' })}
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <TextInput
                value={millProcessingMethod}
                onChangeText={setMillProcessingMethod}
                placeholder={t('mill.method', { defaultValue: 'Processing method' })}
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <Button
                title={millOrganic ? t('mill.organic', { defaultValue: 'Organic line' }) : t('mill.organic', { defaultValue: 'Organic line' })}
                variant={millOrganic ? 'primary' : 'outline'}
                onPress={() => setMillOrganic((v) => !v)}
              />
              <Button
                title={t('mill.appointment', { defaultValue: 'Appointment required' })}
                variant={millAppointmentRequired ? 'primary' : 'outline'}
                onPress={() => setMillAppointmentRequired((v) => !v)}
              />
            </>
          ) : null}
        </>
      )}

      {step === 4 && (
        <>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18 }}>{displayName}</Text>
          <Text style={{ color: colors.textSecondary, marginVertical: spacing.sm }}>{shortDescription}</Text>
          <Text style={{ color: colors.textSecondary }}>
            {baseAreaLabel} · {serviceRadiusKm} km
          </Text>
          <Button title={t('publish')} onPress={() => void publish()} />
        </>
      )}

      <View style={{ height: spacing.md }} />
      {step > 1 ? (
        <Button title={t('back')} variant="outline" onPress={() => setStep((s) => s - 1)} />
      ) : null}
      {step < 4 ? (
        <Button title={t('next')} onPress={() => setStep((s) => s + 1)} />
      ) : null}
      <Button
        title={profile.isPaused ? t('resume') : t('pause')}
        variant="outline"
        onPress={async () => {
          const next = profile.isPaused ? await getPartnerService().activate() : await getPartnerService().pause();
          setProfile(next);
        }}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, minHeight: 48 },
  area: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'center' },
  child: { paddingVertical: spacing.xs, paddingLeft: spacing.lg },
});

export default ServiceProfileScreen;
