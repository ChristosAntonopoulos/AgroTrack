import React from 'react';
import RightDrawer from '../Common/RightDrawer';
import type { EventAccentToken } from '../../chronologio/eventCardLayout';

type Props = {
  open: boolean;
  onClose: () => void;
  resetKey: string;
  title: string;
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  accent: EventAccentToken;
  when?: string;
  fieldName?: string | null;
  fieldColor?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const ChronologioDetailShell: React.FC<Props> = ({
  open,
  onClose,
  resetKey,
  title,
  categoryLabel,
  categoryIcon,
  accent,
  when,
  fieldName,
  fieldColor,
  footer,
  children,
}) => (
  <RightDrawer
    open={open}
    onClose={onClose}
    resetKey={resetKey}
    size="lg"
    accent
    className={`chrono-detail-drawer chrono-detail-drawer--${accent}`}
    title={title}
    kicker={categoryLabel}
    icon={categoryIcon}
    subtitle={when}
    headerExtra={
      fieldName ? (
        <p className="chrono-drawer-field">
          <span
            className="chrono-drawer-field-dot"
            style={fieldColor ? { background: fieldColor } : undefined}
            aria-hidden
          />
          <span>{fieldName}</span>
        </p>
      ) : null
    }
    footer={footer}
  >
    {children}
  </RightDrawer>
);

export default ChronologioDetailShell;
