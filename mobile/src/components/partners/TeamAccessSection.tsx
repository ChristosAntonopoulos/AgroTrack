import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import {
  FieldInvite,
  FieldMembership,
  MAX_FAMILY_SEATS,
  MAX_PARTNER_SEATS,
  countSeats,
  fieldPeopleService,
} from '../../services/fieldPeopleService';
import { mapInviteLifecycle } from './inviteLifecycle';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import TeamMemberCard from './TeamMemberCard';
import { spacing } from '../../theme';

type Props = {
  fieldId: string;
  fieldName?: string;
  fieldColor?: string;
  showFieldHeading?: boolean;
  people: FieldMembership[];
  loading?: boolean;
  canManage?: boolean;
  pendingInvitesById?: Record<string, FieldInvite>;
  onAddFamily: () => void;
  onAddPartner: () => void;
  onChanged: () => void;
};

const TeamAccessSection: React.FC<Props> = ({
  fieldId,
  fieldName,
  showFieldHeading,
  people,
  loading,
  canManage,
  pendingInvitesById = {},
  onAddFamily,
  onAddPartner,
  onChanged,
}) => {
  const { t } = useTranslation('partners');
  const { colors } = useTheme();
  const [listedInvites, setListedInvites] = useState<FieldInvite[]>([]);
  const familyUsed = countSeats(people, 'Family');
  const partnerUsed = countSeats(people, 'Partner');
  const familyMax = MAX_FAMILY_SEATS;
  const partnerMax = MAX_PARTNER_SEATS;
  const activePeople = people.filter(
    (p) =>
      p.role !== 'Admin' &&
      !/^revoked$/i.test(p.status) &&
      !/^removed$/i.test(p.status) &&
      !/^pending$/i.test(p.status) &&
      !/^expired$/i.test(p.status)
  );
  const pendingPeople = people.filter(
    (p) =>
      p.role !== 'Admin' &&
      (/^pending$/i.test(p.status) || /^expired$/i.test(p.status) || /^invited$/i.test(p.status))
  );
  const familyMembers = activePeople.filter((p) => p.role === 'Family');
  const partners = activePeople.filter((p) => p.role === 'Partner');
  const canAddFamily = Boolean(canManage && familyUsed < familyMax);
  const canAddPartner = Boolean(canManage && partnerUsed < partnerMax);

  useEffect(() => {
    if (!fieldId || !canManage) {
      setListedInvites([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fieldPeopleService.listInvites(fieldId);
        if (!cancelled) setListedInvites(rows);
      } catch {
        if (!cancelled) setListedInvites([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, canManage, people]);

  const invitesById = useMemo(() => {
    const next: Record<string, FieldInvite> = { ...pendingInvitesById };
    listedInvites.forEach((invite) => {
      next[invite.id] = invite;
    });
    return next;
  }, [listedInvites, pendingInvitesById]);

  const pendingInvites = listedInvites.filter((invite) => {
    const life = mapInviteLifecycle(invite.status);
    return life === 'pending' || life === 'expired';
  });

  const unmatchedPendingInvites = pendingInvites.filter((invite) => {
    const alreadyShown = pendingPeople.some(
      (person) =>
        person.inviteId === invite.id ||
        (person.email && invite.email && person.email.toLowerCase() === invite.email.toLowerCase())
    );
    return !alreadyShown;
  });

  const hasAnyone =
    familyMembers.length > 0 ||
    partners.length > 0 ||
    pendingPeople.length > 0 ||
    unmatchedPendingInvites.length > 0;

  const inviteForPerson = (person: FieldMembership) =>
    (person.inviteId ? invitesById[person.inviteId] : null) ||
    pendingInvites.find(
      (invite) =>
        (person.email && invite.email && person.email.toLowerCase() === invite.email.toLowerCase()) ||
        (person.displayName && invite.displayName && person.displayName === invite.displayName)
    ) ||
    null;

  const renderSeat = (member: FieldMembership, kind: 'family' | 'partner') => (
    <TeamMemberCard
      key={`${member.userId || member.inviteId || member.email}-${kind}`}
      kind={kind}
      displayName={member.displayName || member.email || member.userId}
      phone={member.phone}
      email={member.email}
      modules={member.modules}
      accessLevel={member.accessLevel}
      status={member.status}
      pendingInvite={inviteForPerson(member)}
      canManage={canManage}
      onChanged={onChanged}
      onUpdate={async (payload) => {
        if (!member.userId) return;
        await fieldPeopleService.updatePerson(fieldId, member.userId, payload);
      }}
      onRevoke={async () => {
        if (!member.userId) return;
        await fieldPeopleService.removeMembership(fieldId, member.userId);
      }}
    />
  );

  return (
    <View style={styles.section}>
      {showFieldHeading ? (
        <>
          <Text style={[styles.kicker, { color: colors.textTertiary }]}>{t('team.title')}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {friendlyFieldLabel(fieldName) || t('team.title')}
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('teamFieldLead')}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('team.title')}</Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('team.lead')}</Text>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('contactsVsUsers')}</Text>
        </>
      )}
      {!canManage ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('team.viewOnly')}</Text>
      ) : null}

      <View style={styles.seatRow}>
        <Ionicons name="people-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('family.title')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('seatsOccupied', { used: familyUsed, max: familyMax })}
          </Text>
        </View>
        {canManage ? (
          <Button
            title={t('team.addFamily')}
            size="small"
            variant="outline"
            onPress={onAddFamily}
            disabled={!canAddFamily || loading}
          />
        ) : null}
      </View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        {t('seatsExplainFamily', { max: familyMax })}
      </Text>
      {!canAddFamily && canManage ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {t('inviteFamilySeatFull', { used: familyUsed, max: familyMax })}
        </Text>
      ) : null}

      <View style={styles.seatRow}>
        <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{t('ownerPartner.title')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('seatsOccupied', { used: partnerUsed, max: partnerMax })}
          </Text>
        </View>
        {canManage ? (
          <Button
            title={t('team.addPartner')}
            size="small"
            variant="outline"
            onPress={onAddPartner}
            disabled={!canAddPartner || loading}
          />
        ) : null}
      </View>
      <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('seatsExplainPartner')}</Text>
      {!canAddPartner && canManage ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          {t('invitePartnerSeatFull', { used: partnerUsed, max: partnerMax })}
        </Text>
      ) : null}

      {!loading && !hasAnyone ? (
        <Text style={[styles.lead, { color: colors.textSecondary }]}>{t('team.empty')}</Text>
      ) : null}

      {familyMembers.map((member) => renderSeat(member, 'family'))}
      {partners.map((member) => renderSeat(member, 'partner'))}
      {pendingPeople.map((member) => renderSeat(member, member.role === 'Partner' ? 'partner' : 'family'))}
      {unmatchedPendingInvites.map((invite) => (
        <TeamMemberCard
          key={`${invite.id}-invite`}
          kind={invite.role === 'Partner' ? 'partner' : 'family'}
          displayName={invite.displayName || invite.email || invite.id}
          phone={invite.phone}
          email={invite.email}
          modules={invite.modules}
          accessLevel={invite.accessLevel}
          status={invite.status || 'pending'}
          pendingInvite={invite}
          canManage={canManage}
          onChanged={onChanged}
          onUpdate={async () => undefined}
          onRevoke={async () => undefined}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg, gap: 6 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: { fontSize: 20, fontWeight: '800' },
  lead: { fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, lineHeight: 18 },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
  },
});

export default TeamAccessSection;
