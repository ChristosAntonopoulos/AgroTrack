import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PartnersSheet from './PartnersSheet';
import { Field } from '../../services/fieldService';
import { SavedContact, UpsertSavedContactPayload } from '../../services/partnerService';
import { getPartnerService } from '../../services/serviceFactory';
import { getApiErrorMessage } from '../../services/api';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';

type Props = {
  visible: boolean;
  fieldId?: string;
  fields: Field[];
  existing?: SavedContact | null;
  onClose: () => void;
  onSaved?: () => void;
};

const SavedContactSheet: React.FC<Props> = ({
  visible,
  fieldId,
  fields,
  existing,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const { colors } = useTheme();
  const [name, setName] = useState(existing?.displayName || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const fieldIds = existing?.fieldIds?.length ? existing.fieldIds : fieldId ? [fieldId] : [];
  const [source, setSource] = useState<'Manual' | 'PhoneBook'>(existing?.source || 'Manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canPick = useMemo(() => canPickDeviceContact(), []);

  const payload = (): UpsertSavedContactPayload => ({
    displayName: name.trim(),
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    notes: notes.trim() || undefined,
    fieldIds,
    source,
  });

  const fromPhone = async () => {
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      if (picked.displayName) setName(picked.displayName);
      if (picked.phone) setPhone(picked.phone);
      if (picked.email) setEmail(picked.email);
      setSource('PhoneBook');
    } catch {
      setError(t('partners:contactPickerUnavailable'));
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const service = getPartnerService();
      if (existing) await service.updateContact(existing.id, payload());
      else await service.createContact(payload());
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('partners:saveContact')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    await getPartnerService().deleteContact(existing.id);
    onSaved?.();
    onClose();
  };

  const fieldLabel = fields
    .filter((field) => fieldIds.includes(field.id))
    .map((field) => friendlyFieldLabel(field.name))
    .join(', ');

  return (
    <PartnersSheet
      visible={visible}
      title={existing ? t('partners:editContact') : t('partners:newContact')}
      subtitle={t('partners:saveContactHint')}
      onClose={onClose}
      footer={
        <>
          <Button
            title={existing ? t('partners:saveContactEdit') : t('partners:saveContactCreate')}
            loading={saving}
            disabled={!name.trim()}
            onPress={() => void save()}
          />
          {existing ? (
            <Button title={t('partners:deleteContact')} variant="outline" onPress={() => void remove()} />
          ) : null}
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} />
        </>
      }
    >
      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
      {canPick && !existing ? (
        <Button title={t('partners:fromPhone')} variant="outline" onPress={() => void fromPhone()} />
      ) : null}
      {fieldLabel ? (
        <Text style={{ color: colors.textSecondary }}>{t('partners:fieldContext', { field: fieldLabel })}</Text>
      ) : null}
      <Input label={t('partners:inviteName')} value={name} onChangeText={setName} autoComplete="name" />
      <Input
        label={t('partners:invitePhone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Input
        label={t('partners:contactEmail')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label={t('partners:contactNotes')} value={notes} onChangeText={setNotes} multiline />
    </PartnersSheet>
  );
};

export default SavedContactSheet;
