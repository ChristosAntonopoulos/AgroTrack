import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import {
  FieldInvite,
  ManagedContact,
  ManagedPeople,
  PersonAccess,
  PersonFieldAccess,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import { SavedContact } from '../services/partnerService';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { capabilitySummaryKey } from '../utils/peopleAccess';
import { copyText } from '../utils/shareHelpers';
import SavedContactSheet from '../components/partners/SavedContactSheet';
import InvitePersonSheet from '../components/partners/InvitePersonSheet';
import EditAccessSheet from '../components/partners/EditAccessSheet';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Partners'>;
type Route = RouteProp<RootStackParamList, 'Partners'>;

const FIELD_KEY = '@Oleachron/lastPartnerFieldId';

const emptyManaged = (): ManagedPeople => ({
  people: [],
  pendingInvites: [],
  contacts: [],
  manageableFields: [],
});

const reachEmail = (value?: string) => (value || '').trim().toLowerCase();
const reachPhone = (value?: string) => (value || '').replace(/[^\d]/g, '');

const PartnersHomeScreen = () => {
  const { t } = useTranslation(['partners', 'common', 'nav']);
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [data, setData] = useState<ManagedPeople>(emptyManaged);
  const [loading, setLoading] = useState(true);
  const [fieldId, setFieldId] = useState(route.params?.fieldId || '');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);
  const [inviting, setInviting] = useState(false);
  const [inviteSeed, setInviteSeed] = useState<{ name?: string; email?: string }>({});
  const [editing, setEditing] = useState<{ person: PersonAccess; membership: PersonFieldAccess } | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [addContactKey, setAddContactKey] = useState(0);
  const [editingContact, setEditingContact] = useState<ManagedContact | null>(null);
  const openedAddContact = useRef(false);

  const refresh = () => setTick((value) => value + 1);
  const fields = data.manageableFields;
  const selected = fields.find((field) => field.id === fieldId) || null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('nav:partners', { defaultValue: t('partners:title') }),
      headerRight: () => (
        <Pressable
          onPress={() => {
            if (!fieldId && fields[0]) setFieldId(fields[0].id);
            setInviteSeed({});
            setInviting(true);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('partners:peoplePage.addPerson')}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, t, colors.primary, fieldId, fields.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        try {
          const managed = await fieldPeopleService.getManagedPeople();
          if (!cancelled) setData(managed);
          return;
        } catch {
          /* stitch when the aggregate endpoint is unavailable */
        }
        if (!user?.id) {
          if (!cancelled) setData(emptyManaged());
          return;
        }
        const fieldRows = await getFieldService().getFields(user.id, user.role || '').catch(() => []);
        const owned = fieldRows.filter((field) => field.ownerId === user.id);
        const membershipsByField: Record<string, Awaited<ReturnType<typeof fieldPeopleService.getPeople>>> = {};
        const invitesByField: Record<string, FieldInvite[]> = {};
        await Promise.all(
          owned.map(async (field) => {
            membershipsByField[field.id] = await fieldPeopleService.getPeople(field.id).catch(() => []);
            invitesByField[field.id] = await fieldPeopleService.listInvites(field.id).catch(() => []);
          })
        );
        const contacts = await getPartnerService().getContacts().catch(() => [] as SavedContact[]);
        if (cancelled) return;
        const people = new Map<string, PersonAccess>();
        const pendingInvites: FieldInvite[] = [];
        owned.forEach((field) => {
          (membershipsByField[field.id] || []).forEach((member) => {
            if (member.role === 'Admin' || !/^active$/i.test(member.status)) return;
            const key = member.userId || member.email || member.displayName || field.id;
            const membership: PersonFieldAccess = {
              fieldId: field.id,
              fieldName: field.name,
              relationship: member.role === 'Partner' ? 'Partner' : 'Family',
              accessPreset: member.accessLevel,
              modules: member.modules,
              status: member.status,
            };
            const existing = people.get(key);
            if (!existing) {
              people.set(key, {
                userId: member.userId,
                displayName: member.displayName || member.email || '',
                email: member.email,
                memberships: [membership],
              });
              return;
            }
            existing.memberships.push(membership);
          });
          (invitesByField[field.id] || []).forEach((invite) => {
            if (/^(pending|expired|invited)$/i.test(invite.status || '')) pendingInvites.push(invite);
          });
        });
        setData({
          people: [...people.values()],
          pendingInvites,
          contacts: contacts.map((contact) => ({
            id: contact.id,
            displayName: contact.displayName,
            phone: contact.phone,
            email: contact.email,
            notes: contact.notes,
            serviceCategoryIds: contact.serviceCategoryIds || [],
            fieldIds: contact.fieldIds || [],
            linkedUserId: contact.linkedUserId,
            source: contact.source === 'PhoneBook' ? 'PhoneBook' : 'Manual',
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
          })),
          manageableFields: owned.map((field) => ({
            id: field.id,
            name: field.name,
            ownerUserId: user.id,
            ownerDisplayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            ownerEmail: user.email,
          })),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  useEffect(() => {
    if (loading || fields.length === 0 || selected) return;
    void (async () => {
      const remembered = await AsyncStorage.getItem(FIELD_KEY);
      const preferred = route.params?.fieldId || remembered || '';
      const next = fields.some((field) => field.id === preferred) ? preferred : fields[0].id;
      setFieldId(next);
    })();
  }, [loading, fields, selected, route.params?.fieldId]);

  useEffect(() => {
    if (loading || !route.params?.addContact || openedAddContact.current) return;
    openedAddContact.current = true;
    setAddingContact(true);
  }, [loading, route.params?.addContact]);

  const onFieldChange = (nextId: string) => {
    setFieldId(nextId);
    if (nextId) void AsyncStorage.setItem(FIELD_KEY, nextId);
  };

  const needle = query.trim().toLowerCase();
  const people = useMemo(
    () =>
      data.people
        .map((person) => ({
          ...person,
          memberships: person.memberships.filter((membership) => membership.fieldId === fieldId),
        }))
        .filter((person) => person.memberships.length > 0)
        .filter((person) => {
          if (!needle) return true;
          const hay = `${person.displayName} ${person.email || ''}`.toLowerCase();
          return hay.includes(needle);
        }),
    [data.people, fieldId, needle]
  );

  const invites = useMemo(
    () =>
      data.pendingInvites.filter((invite) => {
        if (invite.fieldId !== fieldId) return false;
        if (!needle) return true;
        const hay = `${invite.displayName || ''} ${invite.email || ''} ${invite.phone || ''}`.toLowerCase();
        return hay.includes(needle);
      }),
    [data.pendingInvites, fieldId, needle]
  );

  const contacts = useMemo(
    () =>
      data.contacts.filter((contact) => {
        if (!needle) return true;
        const hay = `${contact.displayName} ${contact.email || ''} ${contact.phone || ''}`.toLowerCase();
        return hay.includes(needle);
      }),
    [data.contacts, needle]
  );

  const emailsByField = useMemo(() => {
    const map: Record<string, string[]> = {};
    data.people.forEach((person) => {
      const email = reachEmail(person.email);
      if (!email) return;
      person.memberships.forEach((membership) => {
        map[membership.fieldId] = [...(map[membership.fieldId] || []), email];
      });
    });
    return map;
  }, [data.people]);

  const onThisGrove = (contact: ManagedContact) => {
    const email = reachEmail(contact.email);
    const phone = reachPhone(contact.phone);
    const members = data.people.filter((person) => person.memberships.some((row) => row.fieldId === fieldId));
    if (contact.linkedUserId && members.some((person) => person.userId === contact.linkedUserId)) return true;
    if (email && members.some((person) => reachEmail(person.email) === email)) return true;
    return data.pendingInvites.some((invite) => {
      if (invite.fieldId !== fieldId) return false;
      if (email && reachEmail(invite.email) === email) return true;
      return Boolean(phone) && reachPhone(invite.phone) === phone;
    });
  };

  const openInvite = (seed?: { name?: string; email?: string }) => {
    if (!fieldId && fields[0]) setFieldId(fields[0].id);
    setInviteSeed(seed || {});
    setInviting(true);
  };

  const relationshipLabel = (role: string) =>
    t(`partners:peoplePage.relationship.${role === 'Partner' ? 'Collaborator' : role === 'Collaborator' ? 'Collaborator' : 'Family'}`);

  const capabilityLabel = (level: string, modules: string[]) =>
    t(`partners:peoplePage.capability.${capabilitySummaryKey(level, modules)}`);

  const copyLink = async (invite: FieldInvite) => {
    if (!invite.shareUrl) return;
    const ok = await copyText(invite.shareUrl);
    setNotice(ok ? t('partners:peoplePage.linkCopied') : invite.shareUrl);
  };

  const cancelInvite = (invite: FieldInvite) => {
    Alert.alert(t('partners:peoplePage.cancelInvite'), t('partners:peoplePage.cancelInviteConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('partners:peoplePage.cancelInvite'),
        style: 'destructive',
        onPress: () => {
          void fieldPeopleService.removeMembership(invite.fieldId, invite.id).then(refresh);
        },
      },
    ]);
  };

  const asSaved = (contact: ManagedContact): SavedContact => ({
    id: contact.id,
    displayName: contact.displayName,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    serviceCategoryIds: contact.serviceCategoryIds,
    fieldIds: contact.fieldIds,
    linkedUserId: contact.linkedUserId,
    source: contact.source,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  });

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout scroll padded canvasOpacity={0.45}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:peoplePage.focusLead')}</Text>

      {fields.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groveRow}>
          {fields.map((field) => {
            const on = field.id === fieldId;
            return (
              <Pressable
                key={field.id}
                onPress={() => onFieldChange(field.id)}
                style={[
                  styles.groveChip,
                  {
                    borderColor: on ? colors.oliveBorder : colors.border,
                    backgroundColor: on ? colors.primaryLight : colors.surface,
                  },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{friendlyFieldLabel(field.name)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : selected ? (
        <Text style={[styles.groveName, { color: colors.textPrimary }]}>{friendlyFieldLabel(selected.name)}</Text>
      ) : null}

      {fields.length === 0 ? (
        <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:peoplePage.needField')}</Text>
      ) : null}

      {selected ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('partners:peoplePage.search')}
          placeholderTextColor={colors.textTertiary}
          style={[styles.search, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
        />
      ) : null}
      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}

      {selected ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('partners:peoplePage.onThisGrove')}</Text>
            <Button title={t('partners:peoplePage.addPerson')} size="small" onPress={() => openInvite()} />
          </View>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:peoplePage.appLead')}</Text>

          <View style={[styles.row, { backgroundColor: colors.surfaceElevated }]}>
            <View style={styles.rowMain}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {selected.ownerDisplayName || selected.ownerEmail}
              </Text>
              <Text style={{ color: colors.textSecondary }}>{t('partners:peoplePage.owner')}</Text>
            </View>
          </View>

          {people.map((person) =>
            person.memberships.map((membership) => (
              <View key={`${person.userId}-${membership.fieldId}`} style={[styles.row, { backgroundColor: colors.surfaceElevated }]}>
                <View style={styles.rowMain}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{person.displayName || person.email}</Text>
                  <Text style={{ color: colors.textSecondary }}>{relationshipLabel(membership.relationship)}</Text>
                  <Text style={{ color: colors.textTertiary }}>
                    {capabilityLabel(membership.accessPreset, membership.modules)}
                  </Text>
                </View>
                <Button
                  title={t('partners:peoplePage.manage')}
                  size="small"
                  variant="outline"
                  onPress={() =>
                    setEditing({
                      person: data.people.find((row) => row.userId === person.userId) || person,
                      membership,
                    })
                  }
                />
              </View>
            ))
          )}

          {invites.map((invite) => {
            const who = invite.displayName || invite.email || t('partners:peoplePage.thisPerson');
            return (
              <View key={invite.id} style={[styles.row, { backgroundColor: colors.surfaceElevated }]}>
                <View style={styles.rowMain}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{who}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {t('partners:peoplePage.kindInvite')} · {relationshipLabel(invite.role)} ·{' '}
                    {capabilityLabel(invite.accessLevel, invite.modules)}
                  </Text>
                  <View style={styles.actions}>
                    <Button title={t('partners:peoplePage.copyLink')} size="small" variant="text" onPress={() => void copyLink(invite)} />
                    <Button
                      title={t('partners:peoplePage.resend')}
                      size="small"
                      variant="text"
                      onPress={() => void fieldPeopleService.resendInvite(invite.fieldId, invite.id).then(refresh)}
                    />
                    <Button
                      title={t('partners:peoplePage.cancelInvite')}
                      size="small"
                      variant="text"
                      textColor={colors.error}
                      onPress={() => cancelInvite(invite)}
                    />
                  </View>
                </View>
              </View>
            );
          })}

          {people.length === 0 && invites.length === 0 ? (
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              {needle ? t('partners:peoplePage.noMatch') : t('partners:peoplePage.emptyGrove')}
            </Text>
          ) : null}

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('partners:peoplePage.yourContacts')}</Text>
            <Button
              title={t('partners:peoplePage.notebookAdd')}
              size="small"
              variant="outline"
              onPress={() => {
                setAddContactKey((value) => value + 1);
                setAddingContact(true);
              }}
            />
          </View>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('partners:peoplePage.contactsConnect')}</Text>

          {contacts.length === 0 ? (
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              {needle ? t('partners:peoplePage.noMatch') : t('partners:peoplePage.emptyContactsShort')}
            </Text>
          ) : null}

          {contacts.map((contact) => {
            const here = onThisGrove(contact);
            return (
              <View key={contact.id} style={[styles.row, { backgroundColor: colors.surfaceElevated }]}>
                <View style={styles.rowMain}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{contact.displayName}</Text>
                  <Text style={{ color: colors.textSecondary }}>{contact.email || contact.phone || t('partners:peoplePage.kindContact')}</Text>
                  <View style={styles.actions}>
                    {here ? (
                      <Text style={{ color: colors.textSecondary }}>{t('partners:peoplePage.alreadyHere')}</Text>
                    ) : (
                      <Button
                        title={t('partners:peoplePage.giveAccess')}
                        size="small"
                        variant="outline"
                        onPress={() => openInvite({ name: contact.displayName, email: contact.email })}
                      />
                    )}
                    <Button
                      title={t('partners:peoplePage.editContact')}
                      size="small"
                      variant="text"
                      onPress={() => setEditingContact(contact)}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <InvitePersonSheet
        visible={inviting}
        fields={fields.map((field) => ({ id: field.id, name: friendlyFieldLabel(field.name) }))}
        peopleEmailsByField={emailsByField}
        initialFieldIds={fieldId ? [fieldId] : []}
        initialName={inviteSeed.name}
        initialEmail={inviteSeed.email}
        onClose={() => setInviting(false)}
        onSent={(message) => {
          setNotice(message);
          refresh();
        }}
      />

      {editing ? (
        <EditAccessSheet
          visible
          personName={editing.person.displayName || editing.person.email || ''}
          userId={editing.person.userId}
          activeFieldId={editing.membership.fieldId}
          memberships={editing.person.memberships}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}

      <SavedContactSheet
        key={addContactKey}
        visible={addingContact}
        fieldId={fieldId || undefined}
        fields={fields}
        onClose={() => setAddingContact(false)}
        onSaved={refresh}
      />
      {editingContact ? (
        <SavedContactSheet
          key={editingContact.id}
          visible
          fieldId={fieldId || undefined}
          fields={fields}
          existing={asSaved(editingContact)}
          onClose={() => setEditingContact(null)}
          onSaved={refresh}
        />
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  groveRow: { gap: 8, paddingBottom: spacing.sm },
  groveChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  groveName: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  notice: { fontWeight: '600', marginBottom: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', flex: 1 },
  row: {
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMain: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
});

export default PartnersHomeScreen;
