import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Linking, Alert, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { fieldPeopleService, FieldInvite } from '../services/fieldPeopleService';
import {
  DEFAULT_FAMILY_MODULES,
  FAMILY_MODULES,
  FamilyAccessLevel,
  FamilyCircle,
  FamilyInviteShare,
  FamilyMember,
  FamilyModule,
  familyService,
} from '../services/familyService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
  categoryName,
  childCategories,
  parentCategories,
} from '../services/partnerService';
import { mergeGrovePeople, GrovePerson } from '../utils/grovePeople';
import { pickDeviceContact } from '../utils/pickDeviceContact';
import PhoneActions from '../components/domain/PhoneActions';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Partners'>;
type Route = RouteProp<RootStackParamList, 'Partners'>;

const FIELD_KEY = '@Oleachron/lastPartnerFieldId';

const PartnersHomeScreen = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { user, isFieldOwner } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(route.params?.fieldId || '');
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [unassigned, setUnassigned] = useState<GrovePerson[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [pickedParent, setPickedParent] = useState<ServiceCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [addStep, setAddStep] = useState<'choose' | 'save' | 'invite'>('choose');
  const [editing, setEditing] = useState<SavedContact | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactFields, setContactFields] = useState<string[]>([]);
  const [contactSource, setContactSource] = useState<'Manual' | 'PhoneBook'>('Manual');
  const [linkField, setLinkField] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [invite, setInvite] = useState<FieldInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleTick, setPeopleTick] = useState(0);
  const [family, setFamily] = useState<FamilyCircle | null>(null);
  const [familyTick, setFamilyTick] = useState(0);
  const [addingFamily, setAddingFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyModules, setFamilyModules] = useState<FamilyModule[]>([...DEFAULT_FAMILY_MODULES]);
  const [familyLevel, setFamilyLevel] = useState<FamilyAccessLevel>('view');
  const [familyInvite, setFamilyInvite] = useState<FamilyInviteShare | null>(null);
  const [savingFamily, setSavingFamily] = useState(false);
  const openedAddContact = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const remembered = await AsyncStorage.getItem(FIELD_KEY);
        const [fieldRows, cats] = await Promise.all([
          getFieldService().getFields(user?.id || '', user?.role || ''),
          getPartnerService().getCategories(),
        ]);
        setFields(fieldRows);
        setCategories(cats);
        const preferred = route.params?.fieldId || remembered || '';
        const next = fieldRows.some((f) => f.id === preferred) ? preferred : fieldRows[0]?.id || '';
        if (next) {
          setFieldId(next);
          await AsyncStorage.setItem(FIELD_KEY, next);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const field = fields.find((f) => f.id === fieldId);
      const [members, outgoing, saved] = await Promise.all([
        fieldId
          ? fieldPeopleService.getPeople(fieldId, field)
          : Promise.resolve([] as Awaited<ReturnType<typeof fieldPeopleService.getPeople>>),
        getPartnerService().getRequests('outgoing').catch(() => [] as ServiceContactRequest[]),
        getPartnerService()
          .getContacts(fieldId ? { fieldId, includeUnassigned: true } : undefined)
          .catch(() => [] as SavedContact[]),
      ]);
      const linked = saved.filter((c) => (fieldId ? c.fieldIds.includes(fieldId) : true));
      const loose = saved.filter((c) => c.fieldIds.length === 0);
      setPeople(mergeGrovePeople(members, outgoing, linked, fieldId, i18n.language, categories));
      setUnassigned(fieldId ? mergeGrovePeople([], [], loose, fieldId, i18n.language, categories) : []);
    })();
  }, [fieldId, peopleTick, fields, i18n.language, categories]);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      return;
    }
    void (async () => {
      try {
        setFamily(await familyService.getMine());
      } catch {
        setFamily(null);
      }
    })();
  }, [user, familyTick]);

  const parents = useMemo(() => parentCategories(categories), [categories]);
  const visible = showAll ? parents : parents.filter((c) => c.isProminent);

  const goSearch = (category: ServiceCategory) => {
    if (!fieldId) return;
    void AsyncStorage.setItem(FIELD_KEY, fieldId);
    navigation.navigate('PartnerSearch', {
      fieldId,
      categoryId: category.id,
      category: category.slug,
      taskId: route.params?.taskId,
    });
  };

  useEffect(() => {
    if (loading || !fieldId || categories.length === 0) return;
    const taskType = route.params?.category;
    if (!taskType || !route.params?.taskId) return;
    const match =
      categories.find((c) => c.slug === taskType) ||
      categories.find((c) => c.suggestedTaskTypes.includes(taskType));
    if (match) goSearch(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fieldId, categories]);

  const onParent = (category: ServiceCategory) => {
    const children = childCategories(categories, category.id);
    if (children.length === 0) goSearch(category);
    else setPickedParent(category);
  };

  const openSave = (existing?: SavedContact) => {
    setEditing(existing || null);
    setContactName(existing?.displayName || '');
    setContactPhone(existing?.phone || '');
    setContactNotes(existing?.notes || '');
    setContactFields(existing?.fieldIds?.length ? existing.fieldIds : fieldId ? [fieldId] : []);
    setContactSource(existing?.source || 'Manual');
    setLinkField(Boolean(fieldId) && (!existing || (existing.fieldIds || []).includes(fieldId)));
    setAddStep('save');
    setAdding(true);
  };

  useEffect(() => {
    if (loading || !route.params?.addContact || openedAddContact.current) return;
    openedAddContact.current = true;
    openSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, route.params?.addContact, fieldId]);

  const fromPhone = async () => {
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      if (picked.displayName) setContactName(picked.displayName);
      if (picked.phone) setContactPhone(picked.phone);
      setContactSource('PhoneBook');
    } catch {
      /* keep manual fields */
    }
  };

  const saveContact = async () => {
    const name = contactName.trim();
    if (!name) return;
    setSavingContact(true);
    try {
      const fieldIds = [
        ...contactFields.filter((id) => id !== fieldId),
        ...(linkField && fieldId ? [fieldId] : []),
      ];
      const payload = {
        displayName: name,
        phone: contactPhone.trim() || undefined,
        notes: contactNotes.trim() || undefined,
        fieldIds,
        source: contactSource,
      };
      if (editing) {
        await getPartnerService().updateContact(editing.id, payload);
      } else {
        await getPartnerService().createContact(payload);
      }
      setAdding(false);
      setEditing(null);
      setAddStep('choose');
      setPeopleTick((n) => n + 1);
    } finally {
      setSavingContact(false);
    }
  };

  const deleteContact = async () => {
    if (!editing) return;
    await getPartnerService().deleteContact(editing.id);
    setAdding(false);
    setEditing(null);
    setAddStep('choose');
    setPeopleTick((n) => n + 1);
  };

  const createInvite = async () => {
    if (!fieldId) return;
    const created = await fieldPeopleService.createInvite(fieldId, {
      capacities: ['work'],
      displayName: inviteName.trim() || undefined,
      phone: invitePhone.trim() || undefined,
    });
    setInvite(created);
    setPeopleTick((n) => n + 1);
  };

  const createFamilyInvite = async () => {
    if (!familyName.trim() || (!familyPhone.trim() && !familyEmail.trim()) || familyModules.length === 0) {
      return;
    }
    setSavingFamily(true);
    try {
      const created = await familyService.createInvite({
        displayName: familyName.trim(),
        phone: familyPhone.trim() || undefined,
        email: familyEmail.trim() || undefined,
        modules: familyModules,
        accessLevel: familyLevel,
      });
      setFamilyInvite(created);
      setFamilyTick((n) => n + 1);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('common:error', { defaultValue: 'Something went wrong' });
      Alert.alert(t('partners:family.addMember'), message);
    } finally {
      setSavingFamily(false);
    }
  };

  const revokeFamilyMember = async (member: FamilyMember) => {
    Alert.alert(
      t('partners:family.revoke'),
      t('partners:family.revokeConfirm', { name: member.displayName }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('partners:family.revoke'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await familyService.revokeMember(member.id);
              setFamilyTick((n) => n + 1);
            })();
          },
        },
      ]
    );
  };

  const canManageFamily = Boolean(isFieldOwner() || fields.some((f) => f.ownerId === user?.id));
  const seatsUsed = family?.seatsUsed ?? 0;
  const seatsMax = family?.seatsMax ?? 2;

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('partners:homeTitle', { defaultValue: t('partners:title') })} />
      <Text style={[styles.lead, { color: colors.textSecondary, fontSize: 16 * fontScaleMultiplier }]}>
        {t('partners:homeLead', { defaultValue: t('partners:needWhat') })}
      </Text>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier }]}>
          {t('partners:family.title')}
        </Text>
        {canManageFamily && seatsUsed < seatsMax ? (
          <Button
            title={t('partners:family.addMember')}
            onPress={() => {
              setFamilyInvite(null);
              setFamilyName('');
              setFamilyPhone('');
              setFamilyEmail('');
              setFamilyModules([...DEFAULT_FAMILY_MODULES]);
              setFamilyLevel('view');
              setAddingFamily(true);
            }}
          />
        ) : null}
      </View>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        {t('partners:family.lead', { used: seatsUsed, max: seatsMax })}
      </Text>
      {(family?.members || []).map((member) => (
        <View
          key={member.id}
          style={[styles.personCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 * fontScaleMultiplier }}>
            {member.displayName}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {t('partners:connection.family')} · {t(`partners:family.levels.${member.accessLevel}`)}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {member.modules.map((m) => t(`partners:family.modules.${m}`)).join(' · ')}
          </Text>
          <PhoneActions phone={member.phone} />
          {canManageFamily ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {member.status === 'pending' && member.pendingInvite?.whatsAppUrl ? (
                <Button
                  title={t('partners:family.reshare')}
                  variant="outline"
                  onPress={() => void Linking.openURL(member.pendingInvite!.whatsAppUrl)}
                />
              ) : null}
              <Button
                title={t('partners:family.revoke')}
                variant="outline"
                onPress={() => revokeFamilyMember(member)}
              />
            </View>
          ) : null}
        </View>
      ))}
      {canManageFamily && (family?.members || []).length === 0 ? (
        <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:family.empty')}</Text>
      ) : null}

      <Text style={[styles.label, { color: colors.textSecondary }]}>{t('partners:forField')}</Text>
      {fields.map((field) => (
        <Pressable
          key={field.id}
          onPress={() => {
            setFieldId(field.id);
            void AsyncStorage.setItem(FIELD_KEY, field.id);
          }}
          style={[
            styles.fieldRow,
            {
              minHeight: tapMin,
              borderColor: fieldId === field.id ? colors.primaryDark : colors.border,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 * fontScaleMultiplier }}>
            {field.name}
          </Text>
        </Pressable>
      ))}

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier }]}>
          {t('partners:myPeople')}
        </Text>
        <Button title={t('partners:addPerson')} onPress={() => { setAddStep('choose'); setInvite(null); setAdding(true); }} />
      </View>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:myPeopleHint')}</Text>

      {people.length === 0 && unassigned.length === 0 ? (
        <EmptyState
          title={t('partners:emptyPeople')}
          description={t('partners:emptyPeopleHint')}
        />
      ) : (
        people.map((person) => (
          <View
            key={person.id}
            style={[styles.personCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Text style={[styles.personName, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
              {person.displayName}
            </Text>
            {person.phone ? (
              <Text style={{ color: colors.textSecondary }}>{person.phone}</Text>
            ) : null}
            <View style={styles.chips}>
              {person.serviceLabels.map((label) => (
                <Text key={label} style={[styles.chip, { color: colors.textPrimary, backgroundColor: colors.background }]}>
                  {label}
                </Text>
              ))}
              {person.connections.map((connection) => (
                <Text
                  key={connection}
                  style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.background }]}
                >
                  {t(`partners:connection.${connection}`)}
                </Text>
              ))}
            </View>
            <PhoneActions phone={person.phone} />
            {person.savedContact ? (
              <Button
                title={t('partners:editContact')}
                variant="outline"
                onPress={() => openSave(person.savedContact)}
              />
            ) : null}
            {person.listed && person.userId ? (
              <Button
                title={t('partners:contact')}
                onPress={() =>
                  navigation.navigate('PartnerProfile', { userId: person.userId!, fieldId })
                }
              />
            ) : null}
            {isFieldOwner() && person.membership && !person.connections.includes('owner') ? (
              <Button
                title={t('partners:removeMember', { defaultValue: 'Remove from field' })}
                variant="outline"
                onPress={() => {
                  Alert.alert(
                    t('partners:removeMember', { defaultValue: 'Remove from field' }),
                    person.displayName,
                    [
                      { text: t('common:cancel'), style: 'cancel' },
                      {
                        text: t('common:delete'),
                        style: 'destructive',
                        onPress: async () => {
                          await fieldPeopleService.removeMembership(fieldId, person.userId!);
                          setPeopleTick((n) => n + 1);
                        },
                      },
                    ]
                  );
                }}
              />
            ) : null}
          </View>
        ))
      )}

      {unassigned.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier, marginTop: spacing.lg }]}>
            {t('partners:unassignedContacts')}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:unassignedContactsHint')}</Text>
          {unassigned.map((person) => (
            <View
              key={person.id}
              style={[styles.personCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <Text style={[styles.personName, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
                {person.displayName}
              </Text>
              {person.phone ? (
                <Text style={{ color: colors.textSecondary }}>{person.phone}</Text>
              ) : null}
              <View style={styles.chips}>
                {person.connections.map((connection) => (
                  <Text
                    key={connection}
                    style={[styles.chip, { color: colors.textSecondary, backgroundColor: colors.background }]}
                  >
                    {t(`partners:connection.${connection}`)}
                  </Text>
                ))}
              </View>
              <PhoneActions phone={person.phone} />
              {person.savedContact ? (
                <Button
                  title={t('partners:editContact')}
                  variant="outline"
                  onPress={() => openSave(person.savedContact)}
                />
              ) : null}
            </View>
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier, marginTop: spacing.lg }]}>
        {t('partners:needHelpSection')}
      </Text>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:needWhat')}</Text>

      <View style={styles.grid}>
        {visible.map((cat) => (
          <Pressable
            key={cat.id}
            disabled={!fieldId}
            onPress={() => onParent(cat)}
            style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, minHeight: 110 }]}
          >
            <Ionicons name="leaf-outline" size={22} color={colors.primaryDark} />
            <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>
              {categoryName(cat, i18n.language)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button title={t('partners:allServices')} variant="text" onPress={() => setShowAll((v) => !v)} />

      <Button title={t('partners:offer')} variant="text" onPress={() => navigation.navigate('MyServices')} />
      <Button title={t('partners:requests')} variant="text" onPress={() => navigation.navigate('ServiceRequests')} />

      {pickedParent ? (
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>
            {categoryName(pickedParent, i18n.language)}
          </Text>
          <Button title={t('partners:allInCategory')} onPress={() => goSearch(pickedParent)} />
          {childCategories(categories, pickedParent.id).map((child) => (
            <Pressable
              key={child.id}
              onPress={() => goSearch(child)}
              style={[styles.fieldRow, { borderColor: colors.border, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textPrimary }}>{categoryName(child, i18n.language)}</Text>
            </Pressable>
          ))}
          <Button title={t('common:cancel')} variant="outline" onPress={() => setPickedParent(null)} />
        </View>
      ) : null}

      {addingFamily ? (
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{t('partners:family.addMember')}</Text>
          {familyInvite ? (
            <>
              <Text style={{ color: colors.textSecondary }}>{t('partners:family.inviteReady')}</Text>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(familyInvite.shareUrl)}`,
                }}
                style={{ width: 220, height: 220, alignSelf: 'center', borderRadius: 12 }}
                accessibilityLabel={t('partners:family.qrAlt')}
              />
              <Button
                title={t('partners:shareWhatsApp')}
                onPress={() => void Linking.openURL(familyInvite.whatsAppUrl)}
              />
              {familyInvite.mailtoUrl ? (
                <Button
                  title={t('partners:family.shareEmail')}
                  variant="outline"
                  onPress={() => void Linking.openURL(familyInvite.mailtoUrl)}
                />
              ) : null}
              <Button title={t('common:close')} variant="outline" onPress={() => setAddingFamily(false)} />
            </>
          ) : (
            <>
              <Text style={{ color: colors.textSecondary }}>{t('partners:family.addHint')}</Text>
              <TextInput
                value={familyName}
                onChangeText={setFamilyName}
                placeholder={t('partners:inviteName')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <TextInput
                value={familyPhone}
                onChangeText={setFamilyPhone}
                placeholder={t('partners:invitePhone')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <TextInput
                value={familyEmail}
                onChangeText={setFamilyEmail}
                placeholder={t('partners:inviteEmail')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('partners:family.partsTitle')}</Text>
              <View style={styles.chips}>
                {FAMILY_MODULES.map((module) => {
                  const on = familyModules.includes(module);
                  return (
                    <Pressable
                      key={module}
                      onPress={() =>
                        setFamilyModules((prev) =>
                          prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                        )
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: on ? colors.primaryDark : colors.background,
                        },
                      ]}
                    >
                      <Text style={{ color: on ? '#fff' : colors.textPrimary }}>
                        {t(`partners:family.modules.${module}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('partners:family.levelTitle')}</Text>
              <View style={styles.chips}>
                {(['view', 'help', 'work'] as FamilyAccessLevel[]).map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setFamilyLevel(level)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: familyLevel === level ? colors.primaryDark : colors.background,
                      },
                    ]}
                  >
                    <Text style={{ color: familyLevel === level ? '#fff' : colors.textPrimary }}>
                      {t(`partners:family.levels.${level}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                title={t('partners:createInvite')}
                loading={savingFamily}
                onPress={() => void createFamilyInvite()}
              />
              <Button title={t('common:cancel')} variant="outline" onPress={() => setAddingFamily(false)} />
            </>
          )}
        </View>
      ) : null}

      {adding ? (
        <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {addStep === 'choose' ? (
            <>
              <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{t('partners:addPerson')}</Text>
              <Text style={{ color: colors.textSecondary }}>{t('partners:addPersonChoicesHint')}</Text>
              <Button title={t('partners:saveContact')} onPress={() => openSave()} />
              {fieldId ? (
                <Button title={t('partners:inviteToOleachron')} variant="outline" onPress={() => setAddStep('invite')} />
              ) : null}
              <Button title={t('common:cancel')} variant="outline" onPress={() => setAdding(false)} />
            </>
          ) : addStep === 'save' ? (
            <>
              <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>
                {editing ? t('partners:editContact') : t('partners:saveContact')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>{t('partners:saveContactHint')}</Text>
              <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone()} />
              <Text style={{ color: colors.textSecondary }}>{t('partners:fromPhoneManual')}</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder={t('partners:inviteName')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder={t('partners:invitePhone')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <PhoneActions phone={contactPhone} />
              <TextInput
                value={contactNotes}
                onChangeText={setContactNotes}
                placeholder={t('partners:contactNotes')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              {fieldId ? (
                <Pressable
                  onPress={() => setLinkField((v) => !v)}
                  style={[styles.fieldRow, { borderColor: colors.border, minHeight: tapMin }]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {linkField ? '☑ ' : '☐ '}
                    {t('partners:linkToField')}
                  </Text>
                </Pressable>
              ) : null}
              <Text style={{ color: colors.textSecondary }}>{t('partners:saveLaterHint')}</Text>
              <Button
                title={t('partners:saveContact')}
                loading={savingContact}
                onPress={() => void saveContact()}
                disabled={!contactName.trim()}
              />
              {!editing ? (
                <Button
                  title={t('partners:saveLater')}
                  variant="outline"
                  onPress={() => void saveContact()}
                  disabled={!contactName.trim() || savingContact}
                />
              ) : (
                <Button title={t('partners:deleteContact')} variant="outline" onPress={() => void deleteContact()} />
              )}
              <Button
                title={t('common:cancel')}
                variant="outline"
                onPress={() => {
                  setAdding(false);
                  setEditing(null);
                  setAddStep('choose');
                }}
              />
            </>
          ) : invite ? (
            <>
              <Text style={{ color: colors.textPrimary }}>{t('partners:inviteReady')}</Text>
              <Button title={t('partners:shareWhatsApp')} onPress={() => void Linking.openURL(invite.whatsAppUrl)} />
              <Button title={t('common:cancel')} variant="outline" onPress={() => { setAdding(false); setInvite(null); }} />
            </>
          ) : (
            <>
              <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{t('partners:inviteToOleachron')}</Text>
              <Text style={{ color: colors.textSecondary }}>{t('partners:addPersonHint')}</Text>
              <TextInput
                value={inviteName}
                onChangeText={setInviteName}
                placeholder={t('partners:inviteName')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <TextInput
                value={invitePhone}
                onChangeText={setInvitePhone}
                placeholder={t('partners:invitePhone')}
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, minHeight: tapMin }]}
              />
              <Button title={t('partners:createInvite')} onPress={() => void createInvite()} />
              <Button title={t('common:back')} variant="outline" onPress={() => setAddStep('choose')} />
            </>
          )}
        </View>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  lead: { ...typography.styles.body, marginBottom: spacing.sm },
  label: { ...typography.styles.body, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  sectionHead: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontWeight: '800' },
  fieldRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  personCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  personName: { fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  card: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardLabel: { fontWeight: '700', fontSize: 16 },
  sheet: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
  },
});

export default PartnersHomeScreen;
