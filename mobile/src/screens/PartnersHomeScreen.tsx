import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenLayout from '../components/layout/ScreenLayout';
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
  FamilyAccessLevel,
  FamilyCircle,
  FamilyInviteShare,
  FamilyModule,
  familyService,
} from '../services/familyService';
import {
  DEFAULT_PARTNER_MODULES,
  OwnerPartnerInviteShare,
  OwnerPartnerSeat,
  ownerPartnerService,
} from '../services/ownerPartnerService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
} from '../services/partnerService';
import { mergeGrovePeople, GrovePerson } from '../utils/grovePeople';
import { canPickDeviceContact, pickDeviceContact } from '../utils/pickDeviceContact';
import {
  groupPeople,
  personContextLine,
  personSubtitle,
} from '../utils/personPresentation';
import InviteSharePanel from '../components/partners/InviteSharePanel';
import PartnersSheet from '../components/partners/PartnersSheet';
import ImportPhoneContactsSheet from '../components/partners/ImportPhoneContactsSheet';
import AccessFields from '../components/partners/AccessFields';
import TeamMemberCard from '../components/partners/TeamMemberCard';
import PersonCard from '../components/partners/PersonCard';
import PersonDetailSheet from '../components/partners/PersonDetailSheet';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Partners'>;
type Route = RouteProp<RootStackParamList, 'Partners'>;

const FIELD_KEY = '@Oleachron/lastPartnerFieldId';

const PartnersHomeScreen = () => {
  const { t, i18n } = useTranslation(['partners', 'common', 'nav']);
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { user, isFieldOwner } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(route.params?.fieldId || '');
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [peopleTick, setPeopleTick] = useState(0);
  const [family, setFamily] = useState<FamilyCircle | null>(null);
  const [familyTick, setFamilyTick] = useState(0);
  const [partnerSeat, setPartnerSeat] = useState<OwnerPartnerSeat | null>(null);
  const [partnerTick, setPartnerTick] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GrovePerson | null>(null);

  const [adding, setAdding] = useState(false);
  const [addStep, setAddStep] = useState<'choose' | 'save' | 'invite'>('choose');
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<SavedContact | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteWorksHere, setInviteWorksHere] = useState(true);
  const [inviteCanSee, setInviteCanSee] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactFields, setContactFields] = useState<string[]>([]);
  const [contactSource, setContactSource] = useState<'Manual' | 'PhoneBook'>('Manual');
  const [savingContact, setSavingContact] = useState(false);
  const [invite, setInvite] = useState<FieldInvite | null>(null);

  const [addingFamily, setAddingFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyPhone, setFamilyPhone] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyModules, setFamilyModules] = useState<FamilyModule[]>([...DEFAULT_FAMILY_MODULES]);
  const [familyLevel, setFamilyLevel] = useState<FamilyAccessLevel>('view');
  const [familyInvite, setFamilyInvite] = useState<FamilyInviteShare | null>(null);
  const [savingFamily, setSavingFamily] = useState(false);

  const [addingPartner, setAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerModules, setPartnerModules] = useState<FamilyModule[]>([...DEFAULT_PARTNER_MODULES]);
  const [partnerLevel, setPartnerLevel] = useState<FamilyAccessLevel>('work');
  const [partnerInvite, setPartnerInvite] = useState<OwnerPartnerInviteShare | null>(null);
  const [savingPartner, setSavingPartner] = useState(false);

  const openedAddContact = useRef(false);

  const openAddChooser = () => {
    setAddStep('choose');
    setInvite(null);
    setEditing(null);
    setAdding(true);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav:partners', { defaultValue: t('partners:title') }),
      headerRight: () => (
        <Pressable
          onPress={openAddChooser}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('partners:addCollaborator')}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, t, colors.primary]);

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
      const memberLists = await Promise.all(
        fields.map(async (field) => {
          const rows = await fieldPeopleService.getPeople(field.id, field).catch(() => []);
          return rows.map((member) => ({ ...member, fieldId: field.id }));
        })
      );
      const [outgoing, saved] = await Promise.all([
        getPartnerService().getRequests('outgoing').catch(() => [] as ServiceContactRequest[]),
        getPartnerService()
          .getContacts()
          .catch(() => [] as SavedContact[]),
      ]);
      setPeople(mergeGrovePeople(memberLists.flat(), outgoing, saved, '', i18n.language, categories));
    })();
  }, [peopleTick, fields, i18n.language, categories]);

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

  useEffect(() => {
    if (!user) {
      setPartnerSeat(null);
      return;
    }
    void (async () => {
      try {
        setPartnerSeat(await ownerPartnerService.getMine());
      } catch {
        setPartnerSeat(null);
      }
    })();
  }, [user, partnerTick]);

  const openSave = (existing?: SavedContact) => {
    setEditing(existing || null);
    setContactName(existing?.displayName || '');
    setContactPhone(existing?.phone || '');
    setContactEmail(existing?.email || '');
    setContactNotes(existing?.notes || '');
    setContactFields(existing?.fieldIds?.length ? existing.fieldIds : fields.map((field) => field.id));
    setContactSource(existing?.source || 'Manual');
    setInvite(null);
    setAddStep('save');
    setAdding(true);
    setSelected(null);
  };

  const openFamilyInvite = () => {
    setFamilyInvite(null);
    setFamilyName('');
    setFamilyPhone('');
    setFamilyEmail('');
    setFamilyModules([...DEFAULT_FAMILY_MODULES]);
    setFamilyLevel('view');
    setAddingFamily(true);
    setAdding(false);
    setAddingPartner(false);
  };

  const openPartnerInvite = () => {
    setPartnerInvite(null);
    setPartnerName('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerModules([...DEFAULT_PARTNER_MODULES]);
    setPartnerLevel('work');
    setAddingPartner(true);
    setAdding(false);
    setAddingFamily(false);
  };

  useEffect(() => {
    if (loading || !route.params?.addContact || openedAddContact.current) return;
    openedAddContact.current = true;
    openAddChooser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, route.params?.addContact]);

  const fromPhone = async (target: 'contact' | 'family' | 'partner' | 'invite') => {
    try {
      const picked = await pickDeviceContact();
      if (!picked) {
        Alert.alert(t('partners:contactPickerUnavailable'));
        return;
      }
      if (target === 'contact') {
        if (picked.displayName) setContactName(picked.displayName);
        if (picked.phone) setContactPhone(picked.phone);
        if (picked.email) setContactEmail(picked.email);
        setContactSource('PhoneBook');
      } else if (target === 'family') {
        if (picked.displayName) setFamilyName(picked.displayName);
        if (picked.phone) setFamilyPhone(picked.phone);
        if (picked.email) setFamilyEmail(picked.email);
      } else if (target === 'partner') {
        if (picked.displayName) setPartnerName(picked.displayName);
        if (picked.phone) setPartnerPhone(picked.phone);
        if (picked.email) setPartnerEmail(picked.email);
      } else {
        if (picked.displayName) setInviteName(picked.displayName);
        if (picked.phone) setInvitePhone(picked.phone);
        if (picked.email) setInviteEmail(picked.email);
      }
    } catch {
      Alert.alert(t('partners:contactPickerUnavailable'));
    }
  };

  const saveContact = async () => {
    const name = contactName.trim();
    if (!name) return;
    setSavingContact(true);
    try {
      const fieldIds = contactFields.length ? contactFields : fields.map((field) => field.id);
      const payload = {
        displayName: name,
        phone: contactPhone.trim() || undefined,
        email: contactEmail.trim() || undefined,
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
    const capacities: Array<'work' | 'view'> = [];
    if (inviteWorksHere) capacities.push('work');
    if (inviteCanSee && !inviteWorksHere) capacities.push('view');
    if (capacities.length === 0) capacities.push('work');
    const created = await fieldPeopleService.createInvite(fieldId, {
      capacities,
      displayName: inviteName.trim() || undefined,
      phone: invitePhone.trim() || undefined,
      email: inviteEmail.trim() || undefined,
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
        t('partners:family.acceptFailed');
      Alert.alert(t('partners:family.addMember'), message);
    } finally {
      setSavingFamily(false);
    }
  };

  const createPartnerInvite = async () => {
    if (!partnerName.trim() || (!partnerPhone.trim() && !partnerEmail.trim()) || partnerModules.length === 0) {
      return;
    }
    setSavingPartner(true);
    try {
      const created = await ownerPartnerService.createInvite({
        displayName: partnerName.trim(),
        phone: partnerPhone.trim() || undefined,
        email: partnerEmail.trim() || undefined,
        modules: partnerModules,
        accessLevel: partnerLevel,
      });
      setPartnerInvite(created);
      setPartnerTick((n) => n + 1);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('partners:ownerPartner.acceptFailed');
      Alert.alert(t('partners:ownerPartner.addPartner'), message);
    } finally {
      setSavingPartner(false);
    }
  };

  const canManageTeam = Boolean(isFieldOwner() || fields.some((f) => f.ownerId === user?.id));
  const seatsUsed = family?.seatsUsed ?? 0;
  const seatsMax = family?.seatsMax ?? 2;
  const partner = partnerSeat?.partner ?? null;
  const partnerUsed = partnerSeat?.seatsUsed ?? (partner ? 1 : 0);
  const partnerMax = partnerSeat?.seatsMax ?? 1;
  const canAddFamily = Boolean(canManageTeam && seatsUsed < seatsMax);
  const canAddPartner = Boolean(canManageTeam && partnerUsed < partnerMax && !partner);
  const hasTeamAnyone = (family?.members || []).length > 0 || Boolean(partner);
  const canPickPhone = canPickDeviceContact();

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        personSubtitle(p, fields, t).toLowerCase().includes(q)
    );
  }, [people, query, t, fields]);

  const { onField, services, showGroups } = useMemo(() => groupPeople(filteredPeople), [filteredPeople]);
  const showSearch = people.length >= 12;

  const renderPerson = (person: GrovePerson) => {
    const subtitle = personSubtitle(person, fields, t);
    const hint = person.phone
      ? undefined
      : personContextLine(person, fields, t, i18n.language);
    return (
      <PersonCard
        key={person.id}
        name={person.displayName}
        subtitle={subtitle}
        hint={hint}
        phone={person.phone}
        onPress={() => setSelected(person)}
      />
    );
  };

  const choiceCard = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    desc: string,
    onPress: () => void
  ) => (
    <Pressable
      onPress={onPress}
      style={[styles.choiceCard, { borderColor: colors.gray200, backgroundColor: colors.surface }]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{desc}</Text>
      </View>
    </Pressable>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded canvasOpacity={0.45}>
      <Text style={[styles.countLine, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier, marginBottom: spacing.sm }]}>
        {t('partners:peopleCount', { count: people.length })}
      </Text>

      {user && (hasTeamAnyone || canAddFamily || canAddPartner) ? (
        <View style={styles.teamBlock}>
          <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>{t('partners:team.title')}</Text>

          <View style={styles.seatActions}>
            {canAddFamily ? (
              <Pressable onPress={openFamilyInvite} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  + {t('partners:family.title')} · {t('partners:team.seats', { used: seatsUsed, max: seatsMax })}
                </Text>
              </Pressable>
            ) : null}
            {canAddPartner ? (
              <Pressable onPress={openPartnerInvite} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  + {t('partners:ownerPartner.title')} ·{' '}
                  {t('partners:team.seats', { used: partnerUsed, max: partnerMax })}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {(family?.members || []).map((member) => (
            <TeamMemberCard
              key={member.id}
              kind="family"
              displayName={member.displayName}
              phone={member.phone}
              email={member.email}
              modules={member.modules}
              accessLevel={member.accessLevel}
              status={member.status}
              pendingInvite={member.pendingInvite}
              canManage={canManageTeam}
              onChanged={() => setFamilyTick((n) => n + 1)}
              onUpdate={async (payload) => {
                await familyService.updateMember(member.id, payload);
              }}
              onRevoke={async () => {
                await familyService.revokeMember(member.id);
              }}
            />
          ))}

          {partner ? (
            <TeamMemberCard
              kind="partner"
              displayName={partner.displayName}
              phone={partner.phone}
              email={partner.email}
              modules={partner.modules}
              accessLevel={partner.accessLevel}
              status={partner.status}
              pendingInvite={partner.pendingInvite}
              canManage={canManageTeam}
              onChanged={() => setPartnerTick((n) => n + 1)}
              onUpdate={async (payload) => {
                await ownerPartnerService.updateLink(partner.id, payload);
              }}
              onRevoke={async () => {
                await ownerPartnerService.revokeLink(partner.id);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {showSearch ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('partners:searchPlaceholder')}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.search,
            {
              color: colors.textPrimary,
              borderColor: colors.gray200,
              backgroundColor: colors.surfaceElevated,
              minHeight: 44,
            },
          ]}
        />
      ) : null}

      {people.length === 0 ? (
        <EmptyState
          title={t('partners:emptyPeople')}
          description={t('partners:emptyPeopleHint')}
          action={{ label: t('partners:addCollaborator'), onPress: openAddChooser }}
        />
      ) : showGroups ? (
        <>
          {onField.length > 0 ? (
            <>
              <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
                {t('partners:groups.onField')}
              </Text>
              {onField.map(renderPerson)}
            </>
          ) : null}
          {services.length > 0 ? (
            <>
              <Text style={[styles.groupLabel, { color: colors.textTertiary, marginTop: spacing.sm }]}>
                {t('partners:groups.services')}
              </Text>
              {services.map(renderPerson)}
            </>
          ) : null}
        </>
      ) : (
        filteredPeople.map(renderPerson)
      )}

      <PersonDetailSheet
        person={selected}
        fields={fields}
        canRemoveFromField={Boolean(
          isFieldOwner() && selected?.membership && !selected.connections.includes('owner')
        )}
        onClose={() => setSelected(null)}
        onEdit={
          selected?.savedContact
            ? () => {
                const contact = selected.savedContact!;
                setSelected(null);
                openSave(contact);
              }
            : undefined
        }
        onRemoveFromField={
          selected?.userId
            ? () => {
                const person = selected;
                void (async () => {
                  const ids = person.fieldIds?.length ? person.fieldIds : fieldId ? [fieldId] : [];
                  await Promise.all(
                    ids.map((id) => fieldPeopleService.removeMembership(id, person.userId!))
                  );
                  setPeopleTick((n) => n + 1);
                })();
              }
            : undefined
        }
        onOpenProfile={
          selected?.listed && selected.userId
            ? () => {
                const userId = selected.userId!;
                setSelected(null);
                navigation.navigate('PartnerProfile', { userId, fieldId });
              }
            : undefined
        }
      />

      <ImportPhoneContactsSheet
        visible={importing}
        fields={fields}
        categories={categories}
        onClose={() => setImporting(false)}
        onImported={() => setPeopleTick((n) => n + 1)}
      />

      <PartnersSheet
        visible={adding}
        title={
          addStep === 'choose'
            ? t('partners:addCollaborator')
            : addStep === 'save'
              ? editing
                ? t('partners:editContact')
                : t('partners:saveContact')
              : invite
                ? t('partners:inviteReady')
                : t('partners:inviteToOleachron')
        }
        subtitle={addStep === 'choose' ? t('partners:addPersonChoicesHint') : undefined}
        onClose={() => {
          setAdding(false);
          setInvite(null);
          setEditing(null);
          setAddStep('choose');
        }}
      >
        {addStep === 'choose' ? (
          <View style={styles.choiceGrid}>
            {canPickPhone
              ? choiceCard(
                  'phone-portrait-outline',
                  t('partners:addChoices.fromPhone'),
                  t('partners:addChoices.fromPhoneHint'),
                  () => {
                    setAdding(false);
                    setImporting(true);
                  }
                )
              : null}
            {choiceCard(
              'person-outline',
              t('partners:addChoices.newPerson'),
              t('partners:addChoices.newPersonHint'),
              () => openSave()
            )}
            {choiceCard(
              'link-outline',
              t('partners:addChoices.invite'),
              t('partners:addChoices.inviteHint'),
              () => {
                if (canAddFamily) {
                  openFamilyInvite();
                  return;
                }
                if (canAddPartner) {
                  openPartnerInvite();
                  return;
                }
                setInvite(null);
                setInviteName('');
                setInvitePhone('');
                setInviteEmail('');
                setAddStep('invite');
              }
            )}
            {choiceCard(
              'business-outline',
              t('partners:addChoices.crew'),
              t('partners:addChoices.crewHint'),
              () => openSave()
            )}
          </View>
        ) : addStep === 'save' ? (
          <>
            {canPickPhone && !editing ? (
              <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone('contact')} />
            ) : null}
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder={t('partners:inviteName')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder={t('partners:invitePhone')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder={t('partners:contactEmail')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={contactNotes}
              onChangeText={setContactNotes}
              placeholder={t('partners:contactNotes')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <Button
              title={t('common:save')}
              loading={savingContact}
              onPress={() => void saveContact()}
              disabled={!contactName.trim()}
            />
            {editing ? (
              <Button title={t('partners:deleteContact')} variant="outline" onPress={() => void deleteContact()} />
            ) : null}
          </>
        ) : invite ? (
          <InviteSharePanel
            invite={{
              shareUrl: invite.shareUrl,
              whatsAppUrl: invite.whatsAppUrl,
              displayName: inviteName,
              phone: invitePhone || undefined,
            }}
            copyNs="family"
            onDone={() => {
              setAdding(false);
              setInvite(null);
            }}
          />
        ) : (
          <>
            {canPickPhone ? (
              <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone('invite')} />
            ) : null}
            <TextInput
              value={inviteName}
              onChangeText={setInviteName}
              placeholder={t('partners:inviteName')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={invitePhone}
              onChangeText={setInvitePhone}
              placeholder={t('partners:invitePhone')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('partners:inviteEmail')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <Pressable
              onPress={() => setInviteWorksHere((v) => !v)}
              style={[styles.fieldRow, { borderColor: colors.gray200, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {inviteWorksHere ? '☑ ' : '☐ '}
                {t('partners:connection.works')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setInviteCanSee((v) => !v)}
              style={[styles.fieldRow, { borderColor: colors.gray200, minHeight: tapMin }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                {inviteCanSee ? '☑ ' : '☐ '}
                {t('partners:connection.sees')}
              </Text>
            </Pressable>
            <Button
              title={t('partners:createInvite')}
              onPress={() => void createInvite()}
              disabled={!inviteName.trim() && !invitePhone.trim() && !inviteEmail.trim()}
            />
            <Button title={t('common:back')} variant="outline" onPress={() => setAddStep('choose')} />
          </>
        )}
      </PartnersSheet>

      <PartnersSheet
        visible={addingFamily}
        title={t('partners:family.addMember')}
        subtitle={familyInvite ? t('partners:family.inviteReady') : t('partners:family.addHint')}
        onClose={() => setAddingFamily(false)}
        footer={
          familyInvite ? undefined : (
            <>
              <Button
                title={t('partners:family.sendInvite')}
                loading={savingFamily}
                onPress={() => void createFamilyInvite()}
              />
              <Button title={t('common:cancel')} variant="outline" onPress={() => setAddingFamily(false)} />
            </>
          )
        }
      >
        {familyInvite ? (
          <InviteSharePanel invite={familyInvite} copyNs="family" onDone={() => setAddingFamily(false)} />
        ) : (
          <>
            {canPickPhone ? (
              <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone('family')} />
            ) : null}
            <TextInput
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={t('partners:inviteName')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={familyPhone}
              onChangeText={setFamilyPhone}
              placeholder={t('partners:invitePhone')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={familyEmail}
              onChangeText={setFamilyEmail}
              placeholder={t('partners:inviteEmail')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <AccessFields
              modules={familyModules}
              accessLevel={familyLevel}
              onToggleModule={(module) =>
                setFamilyModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setFamilyLevel}
            />
          </>
        )}
      </PartnersSheet>

      <PartnersSheet
        visible={addingPartner}
        title={t('partners:ownerPartner.addPartner')}
        subtitle={partnerInvite ? t('partners:ownerPartner.inviteReady') : t('partners:ownerPartner.addHint')}
        onClose={() => setAddingPartner(false)}
        footer={
          partnerInvite ? undefined : (
            <>
              <Button
                title={t('partners:ownerPartner.sendInvite')}
                loading={savingPartner}
                onPress={() => void createPartnerInvite()}
              />
              <Button title={t('common:cancel')} variant="outline" onPress={() => setAddingPartner(false)} />
            </>
          )
        }
      >
        {partnerInvite ? (
          <InviteSharePanel invite={partnerInvite} copyNs="ownerPartner" onDone={() => setAddingPartner(false)} />
        ) : (
          <>
            {canPickPhone ? (
              <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone('partner')} />
            ) : null}
            <TextInput
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder={t('partners:inviteName')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={partnerPhone}
              onChangeText={setPartnerPhone}
              placeholder={t('partners:invitePhone')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <TextInput
              value={partnerEmail}
              onChangeText={setPartnerEmail}
              placeholder={t('partners:inviteEmail')}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray200, minHeight: tapMin }]}
            />
            <AccessFields
              modules={partnerModules}
              accessLevel={partnerLevel}
              onToggleModule={(module) =>
                setPartnerModules((prev) =>
                  prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
                )
              }
              onSetLevel={setPartnerLevel}
            />
          </>
        )}
      </PartnersSheet>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  countLine: { fontWeight: '600' },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 2,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  teamBlock: { marginBottom: spacing.md },
  seatActions: { marginBottom: spacing.xs },
  choiceGrid: { gap: spacing.sm },
  choiceCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: spacing.md,
    justifyContent: 'center',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
});

export default PartnersHomeScreen;
