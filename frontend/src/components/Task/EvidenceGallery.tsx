import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Evidence } from '../../services/taskService';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { X } from 'lucide-react';
import './EvidenceGallery.css';

type EvidenceItem = Evidence & { taskTitle?: string };

type Props = {
  items: EvidenceItem[];
  title?: string;
  emptyText?: string;
};

const EvidenceGallery: React.FC<Props> = ({ items, title, emptyText }) => {
  const { t } = useTranslation('tasks');
  const { formatDate, formatDateTime } = useLocaleFormatters();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'before' | 'after' | 'general'>('all');
  const heading = title ?? t('evidence.add');
  const empty = emptyText ?? t('evidence.empty');

  const ordered = useMemo(() => {
    const base = items
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filter === 'all') return base;
    return base.filter((x) => (x.kind || 'general') === filter);
  }, [items, filter]);

  const openItem = openIndex != null ? ordered[openIndex] : null;

  const kindLabel = (kind?: string) => {
    if (kind === 'before') return t('evidence.before');
    if (kind === 'after') return t('evidence.after');
    return t('evidence.general');
  };

  return (
    <div className="eg">
      {heading ? <div className="eg-title">{heading}</div> : null}

      <div className="eg-filters">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          {t('evidence.all')}
        </button>
        <button type="button" className={filter === 'before' ? 'active' : ''} onClick={() => setFilter('before')}>
          {t('evidence.before')}
        </button>
        <button type="button" className={filter === 'after' ? 'active' : ''} onClick={() => setFilter('after')}>
          {t('evidence.after')}
        </button>
        <button
          type="button"
          className={filter === 'general' ? 'active' : ''}
          onClick={() => setFilter('general')}
        >
          {t('evidence.general')}
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="eg-empty">{empty}</div>
      ) : (
        <div className="eg-grid">
          {ordered.map((ev, idx) => (
            <button
              key={`${ev.photoUrl || 'no-photo'}-${ev.timestamp}-${idx}`}
              className="eg-thumb"
              type="button"
              onClick={() => setOpenIndex(idx)}
              disabled={!ev.photoUrl}
              title={ev.taskTitle || heading}
            >
              {ev.photoUrl ? <img src={ev.photoUrl} alt="" /> : <div className="eg-no-photo">{t('evidence.noPhoto')}</div>}
              <div className="eg-thumb-meta">
                <div className="eg-thumb-kind">{kindLabel(ev.kind)}</div>
                <div className="eg-thumb-task">{ev.taskTitle || ''}</div>
                <div className="eg-thumb-time">{formatDate(ev.timestamp)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openItem ? (
        <div className="eg-modal" role="dialog" aria-modal="true">
          <div className="eg-modal-backdrop" onClick={() => setOpenIndex(null)} />
          <div className="eg-modal-content">
            <button
              className="eg-close"
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label={t('evidence.close')}
            >
              <X />
            </button>
            {openItem.photoUrl ? (
              <img className="eg-modal-image" src={openItem.photoUrl} alt="" />
            ) : null}
            <div className="eg-modal-body">
              <div className="eg-modal-kind">{kindLabel(openItem.kind)}</div>
              {openItem.taskTitle ? <div className="eg-modal-task">{openItem.taskTitle}</div> : null}
              {openItem.notes ? <div className="eg-modal-notes">{openItem.notes}</div> : null}
              <div className="eg-modal-time">{formatDateTime(openItem.timestamp)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EvidenceGallery;
