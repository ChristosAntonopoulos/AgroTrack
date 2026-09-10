import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checklistPreviewItems } from '../../../utils/taskChecklistPreview';

interface TaskChecklistPreviewProps {
  templateCode?: string;
}

const TaskChecklistPreview: React.FC<TaskChecklistPreviewProps> = ({ templateCode }) => {
  const { t, i18n } = useTranslation('tasks');
  const [open, setOpen] = useState(false);
  const preview = checklistPreviewItems(templateCode, i18n.language);
  if (!templateCode) return null;

  return (
    <div className="task-checklist-preview">
      <p className="task-form-help">
        {t('fieldWork.form.checklistIntro', { count: preview.total })}
      </p>
      <ol>
        {(open ? preview.items : preview.items.slice(0, 3)).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <button type="button" className="task-date-more" onClick={() => setOpen((value) => !value)}>
        {open ? t('fieldWork.form.hideChecklist') : t('fieldWork.form.showChecklist')}
      </button>
    </div>
  );
};

export default TaskChecklistPreview;
