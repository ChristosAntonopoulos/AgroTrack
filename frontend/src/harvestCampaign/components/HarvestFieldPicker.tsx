import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import type { FieldLocationGuess } from '../fieldGuess';

type SingleProps = {
  mode: 'single';
  fields: Field[];
  value: string;
  onChange: (fieldId: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
  recommendation?: FieldLocationGuess | null;
  sectionLabel?: string;
  /** When true, show a fixed field label (single participant) — no chip picker. */
  locked?: boolean;
};

type MultiProps = {
  mode: 'multiple';
  fields: Field[];
  value: string[];
  onChange: (fieldIds: string[]) => void;
  allowNone?: never;
  noneLabel?: never;
  recommendation?: never;
  sectionLabel?: string;
  locked?: never;
};

export type HarvestFieldPickerProps = SingleProps | MultiProps;

/**
 * Field chips with optional GPS recommendation UX.
 * Recommendation never auto-writes the selection — accept is explicit.
 */
export const HarvestFieldPicker: React.FC<HarvestFieldPickerProps> = (props) => {
  const { t } = useTranslation('fields');
  const [userChoseField, setUserChoseField] = useState(false);
  const [acceptedGuess, setAcceptedGuess] = useState(false);
  const [dismissedGuess, setDismissedGuess] = useState(false);

  const section = props.sectionLabel ? (
    <p className="hc-form-section">{props.sectionLabel}</p>
  ) : null;

  if (props.mode === 'multiple') {
    return (
      <>
        {section}
        <div className="money-chips" role="group" aria-label={props.sectionLabel}>
          {props.fields.map((field) => {
            const pressed = props.value.includes(field.id);
            return (
              <button
                key={field.id}
                type="button"
                className={`money-chip${pressed ? ' is-active' : ''}`}
                aria-pressed={pressed}
                onClick={() =>
                  props.onChange(
                    pressed
                      ? props.value.filter((id) => id !== field.id)
                      : [...props.value, field.id]
                  )
                }
              >
                {friendlyFieldLabel(field.name)}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  const { fields, value, onChange, allowNone, noneLabel, recommendation, locked } = props;

  if (locked && value) {
    const field = fields.find((f) => f.id === value);
    return (
      <>
        {section}
        <p className="hc-field-locked" aria-live="polite">
          <span className="hc-kicker">{t('harvestCampaign.fieldLockedLabel')}</span>
          <strong>{friendlyFieldLabel(field?.name || value)}</strong>
        </p>
      </>
    );
  }

  const guessed = recommendation?.confident ? recommendation.field : null;
  const showGuessPrompt = Boolean(guessed) && !userChoseField && !acceptedGuess && !dismissedGuess;
  const showLockedGuess = Boolean(guessed) && acceptedGuess && !userChoseField && !dismissedGuess;

  const pickManual = (fieldId: string) => {
    setUserChoseField(true);
    setDismissedGuess(true);
    onChange(fieldId);
  };

  if (showGuessPrompt && guessed) {
    return (
      <>
        {section}
        <div className="hc-guess capture-field-locked">
          <p className="capture-hint">{t('harvestCampaign.sacks.locationGuess')}</p>
          <strong>{friendlyFieldLabel(guessed.name)}</strong>
          <div className="money-footer-actions hc-inline-actions">
            <button
              type="button"
              className="money-primary-action"
              onClick={() => {
                onChange(guessed.id);
                setAcceptedGuess(true);
              }}
            >
              {t('harvestCampaign.sacks.useThisField', {
                defaultValue: t('harvestCampaign.sacks.yes'),
              })}
            </button>
            <button
              type="button"
              className="money-text-link"
              onClick={() => {
                setDismissedGuess(true);
                setUserChoseField(true);
              }}
            >
              {t('harvestCampaign.sacks.changeField', {
                defaultValue: t('harvestCampaign.sacks.otherField'),
              })}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (showLockedGuess && guessed) {
    return (
      <>
        {section}
        <div className="capture-field-locked">
          <strong>{friendlyFieldLabel(guessed.name)}</strong>
          <button
            type="button"
            className="money-text-link"
            onClick={() => {
              setDismissedGuess(true);
              setUserChoseField(true);
            }}
          >
            {t('harvestCampaign.sacks.changeField', {
              defaultValue: t('harvestCampaign.sacks.otherField'),
            })}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {section}
      <div className="money-chips" role="group" aria-label={props.sectionLabel}>
        {fields.map((field) => {
          const pressed = value === field.id;
          return (
            <button
              key={field.id}
              type="button"
              className={`money-chip${pressed ? ' is-active' : ''}`}
              aria-pressed={pressed}
              onClick={() => pickManual(field.id)}
            >
              {friendlyFieldLabel(field.name)}
            </button>
          );
        })}
        {allowNone ? (
          <button
            type="button"
            className={`money-chip${!value ? ' is-active' : ''}`}
            aria-pressed={!value}
            onClick={() => pickManual('')}
          >
            {noneLabel || t('harvestCampaign.millKg.split.none')}
          </button>
        ) : null}
      </div>
    </>
  );
};
