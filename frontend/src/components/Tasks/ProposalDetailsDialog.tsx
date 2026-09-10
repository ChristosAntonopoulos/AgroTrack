import React, { useEffect, useId, useRef } from 'react';

interface ProposalDetailsDialogProps {
  open: boolean;
  title: string;
  fieldName: string;
  explanation: string;
  periodLabel: string;
  period: string;
  sourceLabel: string;
  source?: string;
  confidenceLabel: string;
  confidence?: string;
  weatherLabel: string;
  weatherHeadline: string;
  weatherFacts: string[];
  closeLabel: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

const ProposalDetailsDialog: React.FC<ProposalDetailsDialogProps> = ({
  open,
  title,
  fieldName,
  explanation,
  periodLabel,
  period,
  sourceLabel,
  source,
  confidenceLabel,
  confidence,
  weatherLabel,
  weatherHeadline,
  weatherFacts,
  closeLabel,
  onClose,
  returnFocusTo,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        returnFocusTo?.focus();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((node) => !node.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;

  return (
    <div
      className="task-proposal-dialog-backdrop"
      role="presentation"
      onClick={() => {
        onClose();
        returnFocusTo?.focus();
      }}
    >
      <div
        ref={dialogRef}
        className="task-proposal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="task-proposal-dialog-title">
          {title}
        </h2>
        <p className="task-proposal-dialog-field">{fieldName}</p>
        <p className="task-proposal-dialog-copy">{explanation}</p>
        {period ? (
          <p>
            <strong>{periodLabel}</strong> {period}
          </p>
        ) : null}
        {source ? (
          <p>
            <strong>{sourceLabel}</strong> {source}
          </p>
        ) : null}
        {confidence ? (
          <p>
            <strong>{confidenceLabel}</strong> {confidence}
          </p>
        ) : null}
        {weatherHeadline || weatherFacts.length > 0 ? (
          <div>
            <p>
              <strong>{weatherLabel}</strong>
            </p>
            {weatherHeadline ? <p>{weatherHeadline}</p> : null}
            {weatherFacts.length > 0 ? (
              <ul>
                {weatherFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <button
          ref={closeRef}
          type="button"
          className="task-proposal-dialog-close"
          onClick={() => {
            onClose();
            returnFocusTo?.focus();
          }}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
};

export default ProposalDetailsDialog;
