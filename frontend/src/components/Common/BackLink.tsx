import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';
import './BackLink.css';

type Props = {
  to: string;
  children?: ReactNode;
  className?: string;
  /** Accessible name when children are omitted or decorative */
  'aria-label'?: string;
};

/**
 * Shared nested-route exit control. Top-level nav pages must not render this.
 */
const BackLink: React.FC<Props> = ({ to, children, className = '', 'aria-label': ariaLabel }) => {
  const { t } = useTranslation('common');
  const label = children ?? t('back');

  return (
    <div className={`app-back-link ${className}`.trim()}>
      <Button
        to={to}
        variant="outline"
        size="sm"
        icon={<ArrowLeft size={16} aria-hidden />}
        aria-label={ariaLabel}
      >
        {label}
      </Button>
    </div>
  );
};

export default BackLink;
