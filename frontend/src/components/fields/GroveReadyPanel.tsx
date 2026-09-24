import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle, NotebookPen, Pentagon, Trees } from 'lucide-react';
import Button from '../Common/Button';

type Props = {
  name: string;
  hasBoundary: boolean;
  hasDetails: boolean;
  onRecordWork: () => void;
  onDrawBoundary: () => void;
  onOpenChronologio: () => void;
  onOpenGrove: () => void;
};

const GroveReadyPanel: React.FC<Props> = ({
  name,
  hasBoundary,
  hasDetails,
  onRecordWork,
  onDrawBoundary,
  onOpenChronologio,
  onOpenGrove,
}) => {
  const { t } = useTranslation('fields');

  const ready = [
    { key: 'name', label: t('createGrove.ready.readyName') },
    { key: 'timeline', label: t('createGrove.ready.readyTimeline') },
    { key: 'work', label: t('createGrove.ready.readyWork') },
  ];

  const canWait = [
    {
      key: 'boundary',
      label: t('createGrove.ready.waitBoundary'),
      done: hasBoundary,
    },
    {
      key: 'details',
      label: t('createGrove.ready.waitDetails'),
      done: hasDetails,
    },
  ];

  return (
    <div className="field-form-panel grove-ready-panel">
      <header className="grove-ready-header">
        <h2>{t('createGrove.ready.title', { name })}</h2>
        <p className="field-form-panel-desc">{t('createGrove.ready.body')}</p>
      </header>

      <div className="grove-ready-split" role="group" aria-label={t('createGrove.ready.splitAria')}>
        <section className="grove-ready-column">
          <h3>{t('createGrove.ready.readyHeading')}</h3>
          <ul>
            {ready.map((item) => (
              <li key={item.key}>
                <Check size={16} strokeWidth={2.4} aria-hidden />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="grove-ready-column">
          <h3>{t('createGrove.ready.waitHeading')}</h3>
          <ul>
            {canWait.map((item) => (
              <li key={item.key} className={item.done ? 'is-done' : 'is-wait'}>
                {item.done ? (
                  <Check size={16} strokeWidth={2.4} aria-hidden />
                ) : (
                  <Circle size={16} strokeWidth={1.8} aria-hidden />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grove-ready-actions">
        <Button type="button" variant="primary" onClick={onRecordWork} icon={<NotebookPen size={18} />}>
          {t('createGrove.ready.recordWork')}
        </Button>
        {!hasBoundary ? (
          <Button type="button" variant="secondary" onClick={onDrawBoundary} icon={<Pentagon size={18} />}>
            {t('createGrove.enrich.boundaryAction')}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onOpenChronologio}>
          {t('createGrove.ready.openChronologio')}
        </Button>
        <Button type="button" variant="ghost" onClick={onOpenGrove} icon={<Trees size={18} />}>
          {t('createGrove.ready.openGrove')}
        </Button>
      </div>
    </div>
  );
};

export default GroveReadyPanel;
