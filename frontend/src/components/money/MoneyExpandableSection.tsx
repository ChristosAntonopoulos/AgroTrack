import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Money.css';

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const MoneyExpandableSection: React.FC<Props> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={`money-card money-expandable${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="money-expandable__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <ChevronDown size={18} aria-hidden className="money-expandable__chevron" />
      </button>
      {open ? (
        <div id={panelId} className="money-expandable__body">
          {children}
        </div>
      ) : null}
    </section>
  );
};

export default MoneyExpandableSection;
