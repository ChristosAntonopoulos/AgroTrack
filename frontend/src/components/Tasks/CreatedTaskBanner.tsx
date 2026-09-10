import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import './form/TaskForm.css';

interface CreatedTaskBannerProps {
  title: string;
  fieldName: string;
  dateLabel: string;
  onView: () => void;
  onCreateAnother: () => void;
  onUndo: () => void;
}

const CreatedTaskBanner: React.FC<CreatedTaskBannerProps> = ({
  title,
  fieldName,
  dateLabel,
  onView,
  onCreateAnother,
  onUndo,
}) => {
  const { t } = useTranslation('tasks');

  return (
    <div className="task-created-banner" role="status">
      <div>
        <h2>{t('fieldWork.form.createdTitle')}</h2>
        <p>
          {[title, fieldName, dateLabel].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="task-created-actions">
        <Button variant="primary" size="lg" onClick={onView}>
          {t('fieldWork.form.viewTask')}
        </Button>
        <Button variant="outline" size="lg" onClick={onCreateAnother}>
          {t('fieldWork.form.createAnother')}
        </Button>
        <Button variant="ghost" size="lg" onClick={onUndo}>
          {t('fieldWork.form.undo')}
        </Button>
      </div>
    </div>
  );
};

export default CreatedTaskBanner;
