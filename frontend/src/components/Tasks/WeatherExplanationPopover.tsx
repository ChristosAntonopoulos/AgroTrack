import React, { useEffect, useRef } from 'react';

interface WeatherExplanationPopoverProps {
  id: string;
  open: boolean;
  headline: string;
  facts: string[];
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

const WeatherExplanationPopover: React.FC<WeatherExplanationPopoverProps> = ({
  id,
  open,
  headline,
  facts,
  onClose,
  returnFocusTo,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        returnFocusTo?.focus();
      }
    };
    const onDoc = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
        returnFocusTo?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, onClose, returnFocusTo]);

  if (!open) return null;

  return (
    <div
      id={id}
      ref={panelRef}
      className="task-weather-popover"
      role="dialog"
      aria-modal="false"
      aria-label={headline || undefined}
      tabIndex={-1}
    >
      {headline ? <p className="task-weather-popover-headline">{headline}</p> : null}
      {facts.length > 0 ? (
        <ul className="task-weather-popover-facts">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default WeatherExplanationPopover;
