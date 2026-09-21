import React from 'react';
import { useTranslation } from 'react-i18next';
import { phoneHref } from '../../utils/phoneLinks';

type Props = {
  phone?: string | null;
  email?: string | null;
};

const PhoneActions: React.FC<Props> = ({ phone, email }) => {
  const { t } = useTranslation(['partners']);
  const tel = phoneHref(phone, 'tel');
  const sms = phoneHref(phone, 'sms');
  const mail = email?.trim() ? `mailto:${email.trim()}` : '';
  if (!tel && !sms && !mail) return null;

  return (
    <div className="partner-phone-actions">
      {tel ? (
        <a className="btn btn-primary btn-sm" href={tel}>
          {t('partners:call')}
        </a>
      ) : null}
      {sms ? (
        <a className="btn btn-outline btn-sm" href={sms}>
          {t('partners:text')}
        </a>
      ) : null}
      {mail ? (
        <a className="btn btn-outline btn-sm" href={mail}>
          {t('partners:emailAction')}
        </a>
      ) : null}
    </div>
  );
};

export default PhoneActions;
