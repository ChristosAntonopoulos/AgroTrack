import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type AssigneeOption = {
  key: string;
  label: string;
  hint?: string;
  group?: 'self' | 'partner' | 'family' | 'contact' | 'later';
};

interface AssigneeSelectorProps {
  options: AssigneeOption[];
  value: string;
  onChange: (key: string) => void;
}

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ options, value, onChange }) => {
  const { t } = useTranslation('tasks');
  const selfOption = options.find((option) => option.group === 'self') || options[0];
  const selfKey = selfOption?.key || 'later';
  const laterOption = options.find((option) => option.group === 'later' || option.key === 'later');
  const peopleOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.key !== selfKey && option.group !== 'later' && option.key !== 'later'
      ),
    [options, selfKey]
  );

  const selectedPerson = peopleOptions.find((option) => option.key === value);
  const isSelf = value === selfKey;
  const isLater = Boolean(laterOption && value === laterOption.key);
  const [pickingOther, setPickingOther] = useState(Boolean(selectedPerson));
  const showPicker = pickingOther || Boolean(selectedPerson);

  const partners = peopleOptions.filter((option) => option.group === 'partner' || option.group === 'family');
  const contacts = peopleOptions.filter((option) => option.group === 'contact');
  const remainder = peopleOptions.filter(
    (option) => option.group !== 'partner' && option.group !== 'family' && option.group !== 'contact'
  );

  return (
    <div className="task-form-field">
      <p className="task-form-label" id="task-assignee-label">
        {t('fieldWork.form.whoQuestion')}
      </p>
      <div
        className={`task-assignee-toggle${peopleOptions.length > 0 ? '' : ' is-compact'}`}
        role="radiogroup"
        aria-labelledby="task-assignee-label"
      >
        <button
          type="button"
          role="radio"
          aria-checked={isSelf && !showPicker}
          className={`task-assignee-chip${isSelf && !showPicker ? ' is-selected' : ''}`}
          onClick={() => {
            setPickingOther(false);
            onChange(selfKey);
          }}
        >
          {selfOption?.label || t('fieldWork.form.assigneeMe')}
        </button>
        {peopleOptions.length > 0 ? (
          <button
            type="button"
            role="radio"
            aria-checked={showPicker}
            className={`task-assignee-chip${showPicker ? ' is-selected' : ''}`}
            onClick={() => {
              setPickingOther(true);
              if (!selectedPerson) {
                onChange(peopleOptions[0].key);
              }
            }}
          >
            {t('fieldWork.form.assigneeSomeoneElse')}
          </button>
        ) : null}
        {laterOption ? (
          <button
            type="button"
            role="radio"
            aria-checked={isLater && !showPicker}
            className={`task-assignee-chip${isLater && !showPicker ? ' is-selected' : ''}`}
            onClick={() => {
              setPickingOther(false);
              onChange(laterOption.key);
            }}
          >
            {laterOption.label}
          </button>
        ) : null}
      </div>

      {showPicker && peopleOptions.length > 0 ? (
        <label className="task-form-field task-assignee-select-wrap">
          <span className="tasks-sr-only">{t('fieldWork.form.assigneeSomeoneElse')}</span>
          <select
            className="task-form-input task-assignee-select"
            value={selectedPerson?.key || peopleOptions[0].key}
            onChange={(event) => onChange(event.target.value)}
            aria-label={t('fieldWork.form.assigneeSomeoneElse')}
          >
            {partners.length > 0 ? (
              <optgroup label={t('fieldWork.form.assigneeGroupPartners')}>
                {partners.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.hint ? `${option.label} · ${option.hint}` : option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {contacts.length > 0 ? (
              <optgroup label={t('fieldWork.form.assigneeGroupContacts')}>
                {contacts.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.hint ? `${option.label} · ${option.hint}` : option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {remainder.length > 0 ? (
              <optgroup label={t('fieldWork.form.assigneeGroupOthers')}>
                {remainder.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.hint ? `${option.label} · ${option.hint}` : option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      ) : null}

      {isSelf && !showPicker ? (
        <p className="task-form-help">{t('fieldWork.form.assigneeMeHint')}</p>
      ) : null}
    </div>
  );
};

export default AssigneeSelector;
