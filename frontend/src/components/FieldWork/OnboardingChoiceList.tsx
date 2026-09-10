import React from 'react';
import { Check } from 'lucide-react';

export type OnboardingChoice = {
  id: string;
  title: string;
  description?: string;
};

type Props = {
  choices: OnboardingChoice[];
  selectedId?: string | null;
  selectedIds?: string[];
  multi?: boolean;
  onSelect: (id: string) => void;
};

const OnboardingChoiceList: React.FC<Props> = ({
  choices,
  selectedId,
  selectedIds,
  multi,
  onSelect,
}) => {
  const visible = choices.slice(0, 6);
  return (
    <div className="fw-setup-choices" role={multi ? 'group' : 'radiogroup'}>
      {visible.map((choice) => {
        const selected = multi
          ? Boolean(selectedIds?.includes(choice.id))
          : selectedId === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={selected}
            className={`fw-setup-choice${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(choice.id)}
          >
            {multi ? (
              <span className="fw-setup-choice-check" aria-hidden>
                {selected ? <Check size={14} strokeWidth={3} /> : null}
              </span>
            ) : null}
            <span className="fw-setup-choice-body">
              <span className="fw-setup-choice-title">{choice.title}</span>
              {choice.description ? (
                <p className="fw-setup-choice-desc">{choice.description}</p>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default OnboardingChoiceList;
