import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { getFieldService, getFieldWorkService } from '../../services/serviceFactory';
import type { Field } from '../../services/fieldService';
import type {
  CopyFieldWorkProfileResult,
  FieldWorkProfile,
} from '../../services/fieldWorkService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { getApiErrorMessage } from '../../utils/translateApiError';
import {
  buildCopyDiffPreview,
  selectableCopyTargets,
  type CopyProfileOptions,
} from '../../utils/fieldWorkProfileCopy';

type Phase = 'pick' | 'options' | 'review' | 'done';

type Props = {
  sourceFieldId: string;
  profile: FieldWorkProfile;
  onDone: () => void;
  onCancel: () => void;
};

const WorkProfileCopyWizard: React.FC<Props> = ({
  sourceFieldId,
  profile,
  onDone,
  onCancel,
}) => {
  const { t } = useTranslation(['tasks', 'common']);
  const [phase, setPhase] = useState<Phase>('pick');
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<CopyProfileOptions>({
    copyIrrigation: false,
    copyLastPerformed: false,
    copyAssignments: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyFieldWorkProfileResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const all = await getFieldService().getFields();
        if (!cancelled) setFields(selectableCopyTargets(all, sourceFieldId));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.profile.copy.loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceFieldId, t]);

  const targets = useMemo(
    () => fields.filter((f) => selectedIds.includes(f.id)),
    [fields, selectedIds]
  );

  const diffRows = useMemo(
    () => buildCopyDiffPreview(profile, options),
    [profile, options]
  );

  const toggleField = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const apply = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const res = await getFieldWorkService().copyWorkProfile(sourceFieldId, {
        targetFieldIds: selectedIds,
        ...options,
      });
      setResult(res);
      setPhase('done');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.profile.copy.applyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="fw-setup-status">{t('common:loading', { defaultValue: '…' })}</p>;
  }

  if (fields.length === 0 && phase === 'pick') {
    return (
      <div>
        <h2 className="fw-setup-question">{t('tasks:fieldWork.profile.copy.title')}</h2>
        <p className="fw-setup-hint">{t('tasks:fieldWork.profile.copy.noTargets')}</p>
        <Button variant="primary" size="lg" fullWidth onClick={onCancel}>
          {t('common:back', { defaultValue: 'Πίσω' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="fw-copy">
      {phase === 'pick' ? (
        <>
          <h2 className="fw-setup-question">{t('tasks:fieldWork.profile.copy.title')}</h2>
          <p className="fw-setup-hint">{t('tasks:fieldWork.profile.copy.pickBody')}</p>
          <div className="fw-setup-choices" role="group">
            {fields.map((f) => {
              const selected = selectedIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  className={`fw-setup-choice${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleField(f.id)}
                >
                  <span className="fw-setup-choice-body">
                    <span className="fw-setup-choice-title">
                      {friendlyFieldLabel(f.name)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="fw-setup-actions">
            <Button variant="ghost" size="lg" onClick={onCancel}>
              {t('common:cancel', { defaultValue: 'Άκυρο' })}
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={selectedIds.length === 0}
              onClick={() => setPhase('options')}
            >
              {t('tasks:fieldWork.profile.copy.continue')}
            </Button>
          </div>
        </>
      ) : null}

      {phase === 'options' ? (
        <>
          <h2 className="fw-setup-question">{t('tasks:fieldWork.profile.copy.optionsTitle')}</h2>
          <p className="fw-setup-hint">{t('tasks:fieldWork.profile.copy.optionsBody')}</p>
          <label className="fw-copy-check">
            <input
              type="checkbox"
              checked={options.copyIrrigation}
              onChange={(e) =>
                setOptions((o) => ({ ...o, copyIrrigation: e.target.checked }))
              }
            />
            <span>{t('tasks:fieldWork.profile.copy.optIrrigation')}</span>
          </label>
          <label className="fw-copy-check">
            <input
              type="checkbox"
              checked={options.copyLastPerformed}
              onChange={(e) =>
                setOptions((o) => ({ ...o, copyLastPerformed: e.target.checked }))
              }
            />
            <span>{t('tasks:fieldWork.profile.copy.optLastPerformed')}</span>
          </label>
          <label className="fw-copy-check">
            <input
              type="checkbox"
              checked={options.copyAssignments}
              onChange={(e) =>
                setOptions((o) => ({ ...o, copyAssignments: e.target.checked }))
              }
            />
            <span>{t('tasks:fieldWork.profile.copy.optAssignments')}</span>
          </label>
          <div className="fw-setup-actions">
            <Button variant="ghost" size="lg" onClick={() => setPhase('pick')}>
              {t('common:back', { defaultValue: 'Πίσω' })}
            </Button>
            <Button variant="primary" size="lg" onClick={() => setPhase('review')}>
              {t('tasks:fieldWork.profile.copy.review')}
            </Button>
          </div>
        </>
      ) : null}

      {phase === 'review' ? (
        <>
          <h2 className="fw-setup-question">{t('tasks:fieldWork.profile.copy.reviewTitle')}</h2>
          <p className="fw-setup-hint">
            {t('tasks:fieldWork.profile.copy.reviewBody', { count: targets.length })}
          </p>
          <ul className="fw-profile-list">
            {targets.map((f) => (
              <li key={f.id} className="fw-profile-row">
                <div className="fw-profile-row-text">
                  <strong>{friendlyFieldLabel(f.name)}</strong>
                </div>
              </li>
            ))}
          </ul>
          <ul className="fw-profile-list">
            {diffRows.map((row) => (
              <li key={row.key} className="fw-profile-row">
                <div className="fw-profile-row-text">
                  <strong>
                    {t(`tasks:fieldWork.profile.copy.diff.${row.labelKey}`)}
                  </strong>
                  <span>
                    {row.included
                      ? t('tasks:fieldWork.profile.copy.willCopy')
                      : t('tasks:fieldWork.profile.copy.willSkip')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="fw-setup-actions">
            <Button variant="ghost" size="lg" onClick={() => setPhase('options')}>
              {t('common:back', { defaultValue: 'Πίσω' })}
            </Button>
            <Button
              variant="primary"
              size="lg"
              disabled={submitting}
              onClick={apply}
            >
              {submitting
                ? t('tasks:fieldWork.profile.copy.applying')
                : t('tasks:fieldWork.profile.copy.apply')}
            </Button>
          </div>
        </>
      ) : null}

      {phase === 'done' && result ? (
        <>
          <h2 className="fw-setup-question">{t('tasks:fieldWork.profile.copy.doneTitle')}</h2>
          <ul className="fw-profile-list">
            {result.results.map((r) => (
              <li key={r.fieldId} className="fw-profile-row">
                <div className="fw-profile-row-text">
                  <strong>
                    {friendlyFieldLabel(
                      fields.find((f) => f.id === r.fieldId)?.name || r.fieldId
                    )}
                  </strong>
                  <span>
                    {r.success
                      ? t('tasks:fieldWork.profile.copy.ok')
                      : r.errorMessage || r.errorCode}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="primary" size="lg" fullWidth onClick={onDone}>
            {t('tasks:fieldWork.profile.copy.finish')}
          </Button>
        </>
      ) : null}

      {error ? <p className="fw-setup-status is-error">{error}</p> : null}
    </div>
  );
};

export default WorkProfileCopyWizard;
