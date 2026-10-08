import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { getPasswordChecks, getPasswordStrengthScore } from '../../utils/passwordValidation';
import './PasswordStrength.css';

type Props = {
  password: string;
  id?: string;
};

const RULES: Array<{ key: keyof ReturnType<typeof getPasswordChecks>; labelKey: string }> = [
  { key: 'minLength', labelKey: 'auth:register.passwordRuleLength' },
  { key: 'hasUpper', labelKey: 'auth:register.passwordRuleUpper' },
  { key: 'hasLower', labelKey: 'auth:register.passwordRuleLower' },
  { key: 'hasDigit', labelKey: 'auth:register.passwordRuleDigit' },
];

const PasswordStrength: React.FC<Props> = ({ password, id = 'password-strength' }) => {
  const { t } = useTranslation(['auth']);
  const checks = getPasswordChecks(password);
  const score = getPasswordStrengthScore(password);
  const level =
    score <= 0 ? 'empty' : score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';
  const label =
    score <= 0
      ? ''
      : score <= 1
        ? t('auth:register.passwordStrengthWeak')
        : score <= 2
          ? t('auth:register.passwordStrengthFair')
          : score <= 3
            ? t('auth:register.passwordStrengthGood')
            : t('auth:register.passwordStrengthStrong');

  return (
    <div id={id} className="password-strength" aria-live="polite">
      <div
        className={`password-strength-bar password-strength-bar--${level}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-label={label || t('auth:register.passwordHint')}
      >
        <span style={{ width: `${(score / 4) * 100}%` }} />
      </div>
      {label ? <p className={`password-strength-label password-strength-label--${level}`}>{label}</p> : null}
      <ul className="password-strength-rules">
        {RULES.map(({ key, labelKey }) => {
          const ok = checks[key];
          return (
            <li key={key} className={ok ? 'is-met' : 'is-pending'}>
              {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              <span>{t(labelKey)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrength;
