import React from 'react';
import { useTranslation } from 'react-i18next';
import { phoneHref } from '../../utils/phoneLinks';

type Props = {
  phone?: string | null;
};

const PhoneActions: React.FC<Props> = ({ phone }) => {
  const { t } = useTranslation(['partners']);
  const tel = phoneHref(phone, 'tel');
  const sms = phoneHref(phone, 'sms');
  if (!tel && !sms) return null;

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
    </div>
  );
};

export default PhoneActions;
