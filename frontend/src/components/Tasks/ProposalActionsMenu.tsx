import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export type ProposalDismissDecision = 'not_for_this_field' | 'dismiss_for_year';

interface ProposalActionsMenuProps {
  disabled?: boolean;
  moreLabel: string;
  remindLaterLabel: string;
  notForFieldLabel: string;
  notThisYearLabel: string;
  whyLabel: string;
  onRemindLater: () => void;
  onDismiss: (decision: ProposalDismissDecision) => void;
  onWhy: () => void;
}

const ProposalActionsMenu: React.FC<ProposalActionsMenuProps> = ({
  disabled,
  moreLabel,
  remindLaterLabel,
  notForFieldLabel,
  notThisYearLabel,
  whyLabel,
  onRemindLater,
  onDismiss,
  onWhy,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const first = wrapRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();

    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(index + 1 + items.length) % items.length]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  };

  return (
    <div className="task-proposal-more" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="task-proposal-more-btn"
        aria-label={moreLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={20} aria-hidden />
      </button>
      {open ? (
        <div className="task-proposal-more-menu" id={menuId} role="menu">
          <button type="button" role="menuitem" onClick={() => run(onRemindLater)}>
            {remindLaterLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => run(() => onDismiss('not_for_this_field'))}>
            {notForFieldLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => run(() => onDismiss('dismiss_for_year'))}>
            {notThisYearLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => run(onWhy)}>
            {whyLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProposalActionsMenu;
