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
  const [section, setSection] = useState<'people' | 'invites' | 'contacts'>('people');
  const [addingFamily, setAddingFamily] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{ name?: string; email?: string }>({});
  const [inviteTargetFieldId, setInviteTargetFieldId] = useState('');
  const openedAddContact = useRef(false);

  const groveFields = useMemo(
    () => fields.filter((field) => field.ownerId === user?.id && isPartnerScopeField(field, user?.id)),
    [fields, user?.id]
  );
  const listedFields = groveFields;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav:partners', { defaultValue: t('partners:title') }),
      headerRight: () => (
        <Pressable
          onPress={() => {
            const target = fieldId || listedFields[0]?.id;
            if (!target) {
              setAdding(true);
              return;
            }
            setInviteTargetFieldId(target);
            setAddingFamily(true);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('partners:peoplePage.invite', { defaultValue: t('partners:addPerson') })}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, t, colors.primary, fieldId, listedFields]);

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
  const accessFields = fieldId ? listedFields.filter((field) => field.id === fieldId) : [];
  const peopleAcrossGroves = useMemo(() => {
    const grouped = new Map<string, { key: string; name: string; detail: string }>();
    const relationshipLabel = (role: string, level: string, modules: string[]) => {
      const relation = role === 'Partner' ? 'Collaborator' : 'Family';
      const preset = level === 'view' ? 'view' : level === 'help' ? 'help' : modules.includes('tasks') ? 'work' : 'record';
      return `${t(`partners:peoplePage.relationship.${relation}`, { defaultValue: relation })} · ${t(
        `partners:peoplePage.preset.${preset}`,
        { defaultValue: preset }
      )}`;
    };
    listedFields.forEach((field) => {
      (peopleByField[field.id] || []).forEach((person) => {
        if (person.role === 'Admin' || !/^active$/i.test(person.status)) return;
        const key = person.userId || person.email || person.displayName || `${field.id}-anon`;
        const current = grouped.get(key) || {
          key,
          name: person.displayName || person.email || '',
          detail: '',
        };
        const line = `${friendlyFieldLabel(field.name)} · ${relationshipLabel(person.role, person.accessLevel, person.modules)}`;
        current.detail = current.detail ? `${current.detail}\n${line}` : line;
        grouped.set(key, current);
      });
    });
    return [...grouped.values()];
  }, [listedFields, peopleByField, t]);
  const pendingRows = useMemo(() => {
    const rows: { key: string; name: string; detail: string }[] = [];
    listedFields.forEach((field) => {
      (peopleByField[field.id] || []).forEach((person) => {
        if (!/^(pending|expired|invited)$/i.test(person.status)) return;
        rows.push({
          key: `${field.id}-${person.inviteId || person.email || person.userId}`,
          name: person.displayName || person.email || person.phone || '',
          detail: friendlyFieldLabel(field.name),
        });
      });
    });
    return rows;
  }, [listedFields, peopleByField]);
  const canPickPhone = canPickDeviceContact();

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded canvasOpacity={0.45}>
      <Text style={[styles.lead, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
        {t('partners:peoplePage.subtitle', {
          defaultValue: t('partners:homeLead'),
        })}
      </Text>
      {listedFields.length > 0 ? (
        <PartnersFieldPicker
          fields={listedFields}
          value={fieldId}
          onChange={onFieldChange}
          counts={fieldPeopleCounts}
        />
      ) : null}

      <View style={styles.tabs}>
        {([
          ['people', t('partners:peoplePage.tabs.people', { count: peopleAcrossGroves.length, defaultValue: 'People' })],
          ['invites', t('partners:peoplePage.tabs.invites', { count: pendingRows.length, defaultValue: 'Invitations' })],
          ['contacts', t('partners:peoplePage.tabs.contacts', { count: visiblePeople.length, defaultValue: 'Contacts' })],
        ] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setSection(id)} style={styles.tab}>
            <Text style={{ color: section === id ? colors.textPrimary : colors.textSecondary, fontWeight: '700' }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === 'people' && !fieldId
        ? peopleAcrossGroves.length === 0
          ? (
            <EmptyState
              title={t('partners:peoplePage.emptyPeople', { defaultValue: t('partners:emptyPeople') })}
              description={t('partners:peoplePage.subtitle', { defaultValue: '' })}
            />
          )
          : peopleAcrossGroves.map((person) => (
            <PersonCard key={person.key} name={person.name} subtitle={person.detail} onPress={() => undefined} />
          ))
        : null}

      {section === 'people' && fieldId
        ? accessFields.map((field) => (
            <TeamAccessSection
              key={field.id}
              fieldId={field.id}
              fieldName={friendlyFieldLabel(field.name)}
              fieldColor={field.color}
              showFieldHeading
              people={peopleByField[field.id] || []}
              canManage={canManageField(field.id)}
              pendingInvitesById={pendingInvitesById}
              onAddFamily={() => openInviteFamily({}, field.id)}
              onAddPartner={() => openInvitePartner({}, field.id)}
              onChanged={() => onSeatsChanged()}
            />
          ))
        : null}

      {section === 'invites' ? (
        pendingRows.length === 0 ? (
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {t('partners:peoplePage.emptyInvites', { defaultValue: t('partners:pendingInvites') })}
          </Text>
        ) : (
          pendingRows.map((row) => (
            <PersonCard key={row.key} name={row.name} subtitle={row.detail} onPress={() => undefined} />
          ))
        )
      ) : null}

      {section === 'contacts' ? (
        <>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {t('partners:peoplePage.contactsLead', { defaultValue: t('partners:contactsSectionHint') })}
          </Text>
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
              title={t('partners:peoplePage.emptyContacts', { defaultValue: t('partners:emptyPeople') })}
              description={t('partners:peoplePage.contactsLead', { defaultValue: t('partners:emptyPeopleHint') })}
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
        </>
      ) : null}

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
  tabs: { flexDirection: 'row', gap: 16, marginBottom: spacing.md },
  tab: { paddingVertical: 8 },
});

export default PartnersHomeScreen;
