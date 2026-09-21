import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { Field } from '../../services/fieldService';
import './FieldMoreMenu.css';

type Props = {
  field: Field;
  canOwn: boolean;
  canManageAccess?: boolean;
  onDelete?: () => void;
};

const FieldMoreMenu: React.FC<Props> = ({
  field,
  canOwn,
  canManageAccess = false,
  onDelete,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const capabilities = field.capabilities;
  const canEdit = capabilities?.canEditField ?? canOwn;
  const canManage = capabilities?.canManageAccess ?? canManageAccess;
  const canArchive = capabilities?.canArchiveField ?? false;
  const canDelete = capabilities?.canDeleteField ?? canOwn;
  const hasItems = canEdit || canManage || canArchive || (canDelete && onDelete);

  if (!hasItems) return null;

  return (
    <div className="field-more" ref={wrapRef}>
      <button
        type="button"
        className="field-more-btn"
        aria-label={t('common:actions')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={20} />
      </button>
      {open ? (
        <div className="field-more-menu" role="menu">
          {canEdit ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`/fields/${field.id}/edit`);
              }}
            >
              {t('fields:page.editField')}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`/partners?fieldId=${encodeURIComponent(field.id)}`);
              }}
            >
              {t('fields:page.manageAccess')}
            </button>
          ) : null}
          {canArchive ? (
            <button type="button" role="menuitem" disabled title={t('fields:page.archiveUnavailable')}>
              {t('fields:page.archive')}
            </button>
          ) : null}
          {canDelete && onDelete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {t('fields:deleteField')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default FieldMoreMenu;
