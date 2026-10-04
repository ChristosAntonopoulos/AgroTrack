import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export type SetupLevelKey = 'name' | 'color' | 'boundary' | 'details';
export type SetupLevelState = 'current' | 'done' | 'skipped' | 'upcoming';

type Props = {
  levels: Array<{ key: SetupLevelKey; state: SetupLevelState }>;
  /** When set, done/current (and unlocked upcoming) steps are clickable. */
  onSelect?: (key: SetupLevelKey) => void;
  canSelect?: (key: SetupLevelKey) => boolean;
};

const GroveSetupLevel: React.FC<Props> = ({ levels, onSelect, canSelect }) => {
  const { t } = useTranslation('fields');

  return (
    <nav className="grove-setup-level" aria-label={t('createGrove.setupLevelAria')}>
      {levels.map((level, idx) => {
        const selectable =
          Boolean(onSelect) &&
          level.state !== 'skipped' &&
          (level.state === 'current' ||
            level.state === 'done' ||
            (level.state === 'upcoming' && canSelect?.(level.key)));

        const inner = (
          <>
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
          </>
        );

        return (
          <React.Fragment key={level.key}>
            {idx > 0 ? <span className="grove-setup-level-sep" aria-hidden /> : null}
            {selectable ? (
              <button
                type="button"
                className={`grove-setup-level-item is-${level.state} is-clickable`}
                aria-current={level.state === 'current' ? 'step' : undefined}
                onClick={() => onSelect?.(level.key)}
              >
                {inner}
              </button>
            ) : (
              <div
                className={`grove-setup-level-item is-${level.state}`}
                aria-current={level.state === 'current' ? 'step' : undefined}
              >
                {inner}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default GroveSetupLevel;
