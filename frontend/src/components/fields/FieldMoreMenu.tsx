import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Navigation } from 'lucide-react';
import { Field } from '../../services/fieldService';
import { resolveFieldCenter } from '../../utils/fieldGeo';
import './FieldMoreMenu.css';

type Props = {
  field: Field;
  canOwn: boolean;
  onDelete?: () => void;
};

const FieldMoreMenu: React.FC<Props> = ({ field, canOwn, onDelete }) => {
  const { t } = useTranslation(['fields', 'common', 'chronologio']);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openDirections = () => {
    const center = resolveFieldCenter(field);
    if (!center) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center[0]},${center[1]}`)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setOpen(false);
  };

  return (
    <div className="field-more" ref={wrapRef}>
      <button
        type="button"
        className="field-more-btn"
        aria-label={t('common:actions')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={20} />
      </button>
      {open ? (
        <div className="field-more-menu" role="menu">
          {canOwn ? (
            <button type="button" role="menuitem" onClick={() => navigate(`/fields/${field.id}/edit`)}>
              {t('fields:controlRoom.edit')}
            </button>
          ) : null}
          <button type="button" role="menuitem" onClick={() => navigate(`/fields/${field.id}?mode=chronologio`)}>
            {t('chronologio:title')}
          </button>
          <button type="button" role="menuitem" onClick={() => navigate(`/fields/${field.id}/weather`)}>
            {t('chronologio:weatherVegetation.button')}
          </button>
          <button type="button" role="menuitem" onClick={() => navigate(`/partners?fieldId=${encodeURIComponent(field.id)}`)}>
            {t('fields:more.partners')}
          </button>
          {resolveFieldCenter(field) ? (
            <button type="button" role="menuitem" onClick={openDirections}>
              <Navigation size={14} /> {t('fields:controlRoom.directions')}
            </button>
          ) : null}
          {canOwn && onDelete ? (
            <button type="button" role="menuitem" className="field-more-danger" onClick={onDelete}>
              {t('common:delete')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default FieldMoreMenu;
