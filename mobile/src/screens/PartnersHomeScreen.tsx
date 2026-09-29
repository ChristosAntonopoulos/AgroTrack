import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
import { useAuth } from '../context/AuthContext';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { FieldInvite, FieldMembership, fieldPeopleService } from '../services/fieldPeopleService';
import { SavedContact, ServiceCategory } from '../services/partnerService';
import { fromSavedContacts, GrovePerson, linkedFieldIds, occupiesAccessSeat } from '../utils/grovePeople';
import { canPickDeviceContact } from '../utils/pickDeviceContact';
import { isPartnerScopeField } from '../utils/fieldDisplay';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { personSubtitle } from '../utils/personPresentation';
import PartnersFieldPicker from '../components/partners/PartnersFieldPicker';
import TeamAccessSection from '../components/partners/TeamAccessSection';
import SavedContactSheet from '../components/partners/SavedContactSheet';
import SeatInviteSheet from '../components/partners/SeatInviteSheet';
import ImportPhoneContactsSheet from '../components/partners/ImportPhoneContactsSheet';
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
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(route.params?.fieldId || '');
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [peopleByField, setPeopleByField] = useState<Record<string, FieldMembership[]>>({});
  const [loading, setLoading] = useState(true);
  const [peopleTick, setPeopleTick] = useState(0);
  const [seatsTick, setSeatsTick] = useState(0);
  const [pendingInvitesById, setPendingInvitesById] = useState<Record<string, FieldInvite>>({});
  const [selected, setSelected] = useState<GrovePerson | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SavedContact | null>(null);
  const [importing, setImporting] = useState(false);
  const [addingFamily, setAddingFamily] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{ name?: string; email?: string }>({});
  const [inviteTargetFieldId, setInviteTargetFieldId] = useState('');
  const openedAddContact = useRef(false);

  const groveFields = useMemo(
    () => fields.filter((field) => isPartnerScopeField(field, user?.id)),
    [fields, user?.id]
  );
  const listedFields = useMemo(() => {
    if (fieldId && !groveFields.some((field) => field.id === fieldId)) {
      const extra = fields.find((field) => field.id === fieldId);
      if (extra) return [extra, ...groveFields];
    }
    return groveFields;
  }, [fields, fieldId, groveFields]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav:partners', { defaultValue: t('partners:title') }),
      headerRight: () => (
        <Pressable
          onPress={() => setAdding(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('partners:addContact')}
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
          getPartnerService().getCategories().catch(() => [] as ServiceCategory[]),
        ]);
        setFields(fieldRows);
        setCategories(Array.isArray(cats) ? cats : []);
        const preferred = route.params?.fieldId || remembered || '';
        if (preferred && fieldRows.some((field) => field.id === preferred)) {
          setFieldId(preferred);
        } else {
          setFieldId('');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const saved = await getPartnerService()
        .getContacts()
        .catch(() => [] as SavedContact[]);
      setPeople(fromSavedContacts(saved, i18n.language, categories));
    })();
  }, [peopleTick, i18n.language, categories]);

  useEffect(() => {
    if (!user || listedFields.length === 0) {
      setPeopleByField({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const entries = await Promise.all(
          listedFields.map(async (field) => {
            try {
              const rows = await fieldPeopleService.getPeople(field.id);
              return [field.id, rows.map((row) => ({ ...row, fieldId: field.id }))] as const;
            } catch {
              return [field.id, [] as FieldMembership[]] as const;
            }
          })
        );
        if (!cancelled) setPeopleByField(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setPeopleByField({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, listedFields, seatsTick]);

  useEffect(() => {
    if (loading || !route.params?.addContact || openedAddContact.current) return;
    openedAddContact.current = true;
    setAdding(true);
  }, [loading, route.params?.addContact]);

  const onFieldChange = (nextId: string) => {
    setFieldId(nextId);
    if (nextId) void AsyncStorage.setItem(FIELD_KEY, nextId);
  };

  const canManageField = (id: string) => {
    if (!id || !user?.id) return false;
    if (user.role === 'Administrator') return true;
    const field = fields.find((row) => row.id === id);
    if (field?.ownerId === user.id) return true;
    return (peopleByField[id] || []).some(
      (person) => person.userId === user.id && person.role === 'Admin'
    );
  };

  const fieldPeople = useMemo(
    () => (fieldId ? peopleByField[fieldId] || [] : Object.values(peopleByField).flat()),
    [fieldId, peopleByField]
  );

  const accessUserIds = useMemo(() => {
    const ids = new Set<string>();
    fieldPeople.forEach((person) => {
      if (person.userId && person.role !== 'Admin') ids.add(person.userId);
    });
    return ids;
  }, [fieldPeople]);

  const accessEmails = useMemo(() => {
    const emails = new Set<string>();
    fieldPeople.forEach((person) => {
      if (person.email) emails.add(person.email.trim().toLowerCase());
    });
    return emails;
  }, [fieldPeople]);

  const visiblePeople = useMemo(
    () =>
      people.filter((person) => {
        if (!person.savedContact) return false;
        if (user?.id && person.userId === user.id) return false;
        if (occupiesAccessSeat(person, accessUserIds, accessEmails)) return false;
        if (!fieldId) return true;
        return linkedFieldIds(person).includes(fieldId);
      }),
    [people, user?.id, accessUserIds, accessEmails, fieldId]
  );

  const fieldPeopleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    listedFields.forEach((field) => {
      const members = (peopleByField[field.id] || []).filter(
        (person) =>
          person.role !== 'Admin' &&
          !/^revoked$/i.test(person.status) &&
          !/^removed$/i.test(person.status)
      );
      const memberUsers = new Set(members.map((person) => person.userId).filter(Boolean));
      const memberEmails = new Set(
        members.map((person) => person.email?.trim().toLowerCase()).filter(Boolean) as string[]
      );
      const extraContacts = people.filter((person) => {
        if (!linkedFieldIds(person).includes(field.id)) return false;
        if (person.userId && memberUsers.has(person.userId)) return false;
        const email = (person.email || person.savedContact?.email || '').trim().toLowerCase();
        if (email && memberEmails.has(email)) return false;
        return true;
      });
      counts[field.id] = members.length + extraContacts.length;
    });
    return counts;
  }, [listedFields, peopleByField, people]);

  const onSeatsChanged = (invite?: FieldInvite) => {
    if (invite?.id) {
      setPendingInvitesById((prev) => ({ ...prev, [invite.id]: invite }));
    }
    setSeatsTick((n) => n + 1);
  };

  const openInviteFamily = (prefill: { name?: string; email?: string } = {}, targetFieldId?: string) => {
    const next = targetFieldId || fieldId;
    if (!next) return;
    setInviteTargetFieldId(next);
    setInvitePrefill(prefill);
    setAddingFamily(true);
  };

  const openInvitePartner = (prefill: { name?: string; email?: string } = {}, targetFieldId?: string) => {
    const next = targetFieldId || fieldId;
    if (!next) return;
    setInviteTargetFieldId(next);
    setInvitePrefill(prefill);
    setAddingPartner(true);
  };

  const inviteFieldId = inviteTargetFieldId || fieldId;
  const inviteField = fields.find((field) => field.id === inviteFieldId);
  const accessFields = fieldId ? listedFields.filter((field) => field.id === fieldId) : listedFields;
  const canPickPhone = canPickDeviceContact();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded canvasOpacity={0.45}>
      {listedFields.length > 0 ? (
        <PartnersFieldPicker
          fields={listedFields}
          value={fieldId}
          onChange={onFieldChange}
          counts={fieldPeopleCounts}
        />
      ) : null}

      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('partners:contactsSection')}
            {visiblePeople.length > 0 ? (
              <Text style={{ color: colors.textSecondary }}> {visiblePeople.length}</Text>
            ) : null}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:contactsSectionHint')}</Text>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('partners:contactsVsUsers')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {canPickPhone ? (
          <Button
            title={t('partners:importPhone.openPhone')}
            variant="outline"
            onPress={() => setImporting(true)}
          />
        ) : null}
        <Button title={t('partners:addContact')} onPress={() => setAdding(true)} />
      </View>

      {visiblePeople.length === 0 ? (
        <EmptyState
          title={t('partners:emptyPeople')}
          description={fieldId ? t('partners:emptyPeopleHintField') : t('partners:emptyPeopleHint')}
          action={{ label: t('partners:addContact'), onPress: () => setAdding(true) }}
        />
      ) : (
        visiblePeople.map((person) => (
            <PersonCard
              key={person.id}
              name={person.displayName}
              subtitle={personSubtitle(person, fields, t)}
              phone={person.phone}
              email={person.email}
              hint={person.serviceLabels.join(' · ') || undefined}
              onPress={() => setSelected(person)}
            />
          ))
      )}

      {user
        ? accessFields.map((field) => (
            <TeamAccessSection
              key={field.id}
              fieldId={field.id}
              fieldName={friendlyFieldLabel(field.name)}
              fieldColor={field.color}
              showFieldHeading={!fieldId}
              people={peopleByField[field.id] || []}
              canManage={canManageField(field.id)}
              pendingInvitesById={pendingInvitesById}
              onAddFamily={() => openInviteFamily({}, field.id)}
              onAddPartner={() => openInvitePartner({}, field.id)}
              onChanged={() => onSeatsChanged()}
            />
          ))
        : null}

      <PersonDetailSheet
        person={selected}
        fields={fields}
        canRemoveFromField={Boolean(
          selected?.membership && !selected.connections.includes('owner') && canManageField(fieldId)
        )}
        onClose={() => setSelected(null)}
        onEdit={
          selected?.savedContact
            ? () => {
                const contact = selected.savedContact!;
                setSelected(null);
                setEditing(contact);
              }
            : undefined
        }
        onInvite={
          selected
            ? (() => {
                const person = selected;
                const inviteFieldForPerson = fieldId
                  ? canManageField(fieldId)
                    ? fieldId
                    : ''
                  : linkedFieldIds(person).find((id) => canManageField(id)) || '';
                if (!inviteFieldForPerson) return undefined;
                return () =>
                  openInviteFamily(
                    {
                      name: person.displayName,
                      email: person.email || person.savedContact?.email || '',
                    },
                    inviteFieldForPerson
                  );
              })()
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
                  setSeatsTick((n) => n + 1);
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

      <SavedContactSheet
        visible={adding}
        fieldId={fieldId || undefined}
        fields={fields}
        onClose={() => setAdding(false)}
        onSaved={() => setPeopleTick((n) => n + 1)}
      />
      <SavedContactSheet
        visible={Boolean(editing)}
        fieldId={fieldId || undefined}
        fields={fields}
        existing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setPeopleTick((n) => n + 1)}
      />

      {inviteFieldId ? (
        <SeatInviteSheet
          visible={addingFamily}
          role="Family"
          fieldId={inviteFieldId}
          fieldName={inviteField?.name}
          initialName={invitePrefill.name}
          initialEmail={invitePrefill.email}
          onClose={() => {
            setAddingFamily(false);
            setInvitePrefill({});
            setInviteTargetFieldId('');
          }}
          onCreated={onSeatsChanged}
        />
      ) : null}
      {inviteFieldId ? (
        <SeatInviteSheet
          visible={addingPartner}
          role="Partner"
          fieldId={inviteFieldId}
          fieldName={inviteField?.name}
          initialName={invitePrefill.name}
          initialEmail={invitePrefill.email}
          onClose={() => {
            setAddingPartner(false);
            setInvitePrefill({});
            setInviteTargetFieldId('');
          }}
          onCreated={onSeatsChanged}
        />
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  sectionHead: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: 22, fontWeight: '800' },
  lead: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
});

export default PartnersHomeScreen;
