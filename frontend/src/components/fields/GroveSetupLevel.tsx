import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export type SetupLevelKey = 'name' | 'location' | 'details';
export type SetupLevelState = 'current' | 'done' | 'skipped' | 'upcoming';

type Props = {
  levels: Array<{ key: SetupLevelKey; state: SetupLevelState }>;
};

const GroveSetupLevel: React.FC<Props> = ({ levels }) => {
  const { t } = useTranslation('fields');

  return (
    <nav className="grove-setup-level" aria-label={t('createGrove.setupLevelAria')}>
      {levels.map((level, idx) => (
        <React.Fragment key={level.key}>
          {idx > 0 ? <span className="grove-setup-level-sep" aria-hidden /> : null}
          <div
            className={`grove-setup-level-item is-${level.state}`}
            aria-current={level.state === 'current' ? 'step' : undefined}
          >
            <span className="grove-setup-level-mark" aria-hidden>
              {level.state === 'done' ? (
                <Check size={14} strokeWidth={2.5} />
              ) : level.state === 'skipped' ? (
                '—'
              ) : (
                idx + 1
              )}
            </span>
            <span className="grove-setup-level-label">
              {t(`createGrove.levels.${level.key}`)}
              {level.state === 'skipped' ? (
                <span className="grove-setup-level-later">
                  {' '}
                  ({t('createGrove.later')})
                </span>
              ) : null}
            </span>
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default GroveSetupLevel;
