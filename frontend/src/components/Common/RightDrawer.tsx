import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useDrawerDialog } from '../../hooks/useDrawerDialog';
import { useIsMobile } from '../../hooks/useBreakpoint';
import './RightDrawer.css';

export type RightDrawerSize = 'sm' | 'md' | 'lg';

export type RightDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  kicker?: React.ReactNode;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  leading?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  size?: RightDrawerSize;
  resetKey?: string;
  closeLabel?: string;
  hideClose?: boolean;
  closeDisabled?: boolean;
  accent?: boolean;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  labelledBy?: string;
  'aria-label'?: string;
  onExitComplete?: () => void;
};

const RightDrawer: React.FC<RightDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  kicker,
  icon,
  headerExtra,
  leading,
  footer,
  children,
  size = 'md',
  resetKey,
  closeLabel,
  hideClose = false,
  closeDisabled = false,
  accent = false,
  className,
  bodyClassName,
  footerClassName,
  labelledBy,
  'aria-label': ariaLabel,
  onExitComplete,
}) => {
  const { t } = useTranslation('common');
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { headingId, headingRef, panelRef, drawerScrollContainer } = useDrawerDialog({
    open,
    onClose,
    resetKey,
  });

  const label = closeLabel || t('close', { defaultValue: 'Close' });
  const titleId = labelledBy || headingId;
  const enter = isMobile ? { y: 28, opacity: 0 } : { x: 28, opacity: 0 };
  const shown = isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 };
  const leave = isMobile ? { y: 16, opacity: 0 } : { x: 16, opacity: 0 };
  const duration = reduceMotion ? 0 : 0.22;
  const ease = [0.22, 1, 0.36, 1] as const;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <motion.button
          key="oa-drawer-backdrop"
          type="button"
          className="oa-drawer-backdrop"
          tabIndex={-1}
          aria-hidden="true"
          onClick={onClose}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration, ease }}
        />
      ) : null}
      {open ? (
        <motion.aside
          key={resetKey ? `oa-drawer-${resetKey}` : 'oa-drawer'}
          ref={panelRef}
          className={[
            'oa-drawer',
            size !== 'md' ? `oa-drawer--${size}` : '',
            accent ? 'oa-drawer--accent' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabel ? undefined : titleId}
          aria-label={ariaLabel}
          initial={reduceMotion ? false : enter}
          animate={shown}
          exit={reduceMotion ? undefined : leave}
          transition={{ duration, ease }}
        >
          <div className="oa-drawer-handle" aria-hidden="true" />
          <header className="oa-drawer-header">
            {leading}
            <div className="oa-drawer-header-main">
              {icon ? (
                <div className="oa-drawer-icon" aria-hidden>
                  {icon}
                </div>
              ) : null}
              <div className="oa-drawer-copy">
                {kicker ? <p className="oa-drawer-kicker">{kicker}</p> : null}
                <h2 id={titleId} ref={headingRef} tabIndex={-1} className="oa-drawer-title">
                  {title}
                </h2>
                {subtitle ? <p className="oa-drawer-subtitle">{subtitle}</p> : null}
                {headerExtra}
              </div>
            </div>
            {hideClose ? null : (
              <button
                type="button"
                className="oa-drawer-close"
                onClick={onClose}
                disabled={closeDisabled}
                aria-label={label}
              >
                <X size={18} aria-hidden />
              </button>
            )}
          </header>
          <div
            className={['oa-drawer-body', bodyClassName].filter(Boolean).join(' ')}
            ref={drawerScrollContainer}
          >
            {children}
          </div>
          {footer ? (
            <footer className={['oa-drawer-footer', footerClassName].filter(Boolean).join(' ')}>
              {footer}
            </footer>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

export default RightDrawer;
