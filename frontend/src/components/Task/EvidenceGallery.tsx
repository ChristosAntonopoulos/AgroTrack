import React, { useMemo, useState } from 'react';
import { Evidence } from '../../services/taskService';
import { X } from 'lucide-react';
import './EvidenceGallery.css';

type EvidenceItem = Evidence & { taskTitle?: string };

type Props = {
  items: EvidenceItem[];
  title?: string;
  emptyText?: string;
};

const EvidenceGallery: React.FC<Props> = ({ items, title = 'Evidence', emptyText = 'No evidence yet.' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'before' | 'after' | 'general'>('all');

  const ordered = useMemo(() => {
    const base = items
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filter === 'all') return base;
    return base.filter((x) => (x.kind || 'general') === filter);
  }, [items, filter]);

  const openItem = openIndex != null ? ordered[openIndex] : null;

  return (
    <div className="eg">
      {title ? <div className="eg-title">{title}</div> : null}

      <div className="eg-filters">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All
        </button>
        <button type="button" className={filter === 'before' ? 'active' : ''} onClick={() => setFilter('before')}>
          Before
        </button>
        <button type="button" className={filter === 'after' ? 'active' : ''} onClick={() => setFilter('after')}>
          After
        </button>
        <button type="button" className={filter === 'general' ? 'active' : ''} onClick={() => setFilter('general')}>
          General
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="eg-empty">{emptyText}</div>
      ) : (
        <div className="eg-grid">
          {ordered.map((ev, idx) => (
            <button
              key={`${ev.photoUrl || 'no-photo'}-${ev.timestamp}-${idx}`}
              className="eg-thumb"
              type="button"
              onClick={() => setOpenIndex(idx)}
              disabled={!ev.photoUrl}
              title={ev.taskTitle || 'Evidence'}
            >
              {ev.photoUrl ? <img src={ev.photoUrl} alt="Evidence" /> : <div className="eg-no-photo">No photo</div>}
              <div className="eg-thumb-meta">
                <div className="eg-thumb-kind">{(ev.kind || 'general').toUpperCase()}</div>
                <div className="eg-thumb-task">{ev.taskTitle || ''}</div>
                <div className="eg-thumb-time">{new Date(ev.timestamp).toLocaleDateString()}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openItem ? (
        <div className="eg-modal" role="dialog" aria-modal="true">
          <div className="eg-modal-backdrop" onClick={() => setOpenIndex(null)} />
          <div className="eg-modal-content">
            <button className="eg-close" type="button" onClick={() => setOpenIndex(null)} aria-label="Close">
              <X />
            </button>
            {openItem.photoUrl ? (
              <img className="eg-modal-image" src={openItem.photoUrl} alt="Evidence large" />
            ) : null}
            <div className="eg-modal-body">
              <div className="eg-modal-kind">{(openItem.kind || 'general').toUpperCase()}</div>
              {openItem.taskTitle ? <div className="eg-modal-task">{openItem.taskTitle}</div> : null}
              {openItem.notes ? <div className="eg-modal-notes">{openItem.notes}</div> : null}
              <div className="eg-modal-time">{new Date(openItem.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EvidenceGallery;

