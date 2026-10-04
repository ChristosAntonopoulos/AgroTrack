import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import {
  proposalTitle,
  toDateInputValue,
} from '../../utils/proposalPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import TaskCategoryMark from './TaskCategoryMark';

interface ScheduleGroupSheetProps {
  group: ProposalTemplateGroup | null;
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | undefined>;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    proposalIds: string[];
    datesByProposalId: Record<string, string>;
  }) => void;
}

const ScheduleGroupSheet: React.FC<ScheduleGroupSheetProps> = ({
  group,
  fieldNames,
  fieldColors,
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [perFieldDates, setPerFieldDates] = useState(false);

  React.useEffect(() => {
    if (!group) return;
    const nextSelected: Record<string, boolean> = {};
    const nextDates: Record<string, string> = {};
    const shared =
      toDateInputValue(group.recommendedWindowStart) ||
      toDateInputValue(group.proposals[0]?.recommendedWindowStart) ||
      '';
    group.proposals.forEach((proposal) => {
      nextSelected[proposal.id] = true;
      nextDates[proposal.id] = shared;
    });
    setSelected(nextSelected);
    setDates(nextDates);
    setPerFieldDates(false);
  }, [group]);

  const selectedIds = useMemo(
    () => (group ? group.proposals.filter((p) => selected[p.id]).map((p) => p.id) : []),
    [group, selected]
  );

  if (!group) return null;

  const multiField = group.proposals.length > 1;
  const allSelected = selectedIds.length === group.proposals.length;
  const lead = group.proposals[0];
  const title = lead ? proposalTitle(lead, i18n.language) : '';
  const unknownField = t('fieldWork.unknownField');
  const canConfirm =
    selectedIds.length > 0 &&
    selectedIds.every((id) => Boolean(dates[id])) &&
    !busy;

  const labelFor = (fieldId: string) =>
    friendlyFieldLabel(fieldNames[fieldId]) || fieldNames[fieldId] || unknownField;

  const setSharedDate = (value: string) => {
    const next: Record<string, string> = {};
    group.proposals.forEach((proposal) => {
      next[proposal.id] = value;
    });
    setDates(next);
  };

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    group.proposals.forEach((proposal) => {
      next[proposal.id] = !allSelected;
    });
    setSelected(next);
  };

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t('fieldWork.scheduleGroup.title')}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canConfirm}
          onClick={() =>
            onConfirm({
              proposalIds: selectedIds,
              datesByProposalId: dates,
            })
          }
        >
          {t('fieldWork.actions.schedule')}
        </Button>
      }
    >
      <div className="tasks-schedule-body">
        <p className="tasks-dismiss-copy">{t('fieldWork.scheduleGroup.copy')}</p>

        {title ? (
          <div className="tasks-schedule-context">
            <TaskCategoryMark templateCode={group.templateCode} size={18} />
            <p className="tasks-schedule-context-title">{title}</p>
          </div>
        ) : null}

        <section className="tasks-schedule-section" aria-labelledby="tasks-schedule-fields-label">
          <div className="tasks-schedule-section-head">
            <span id="tasks-schedule-fields-label" className="tasks-why-label">
              {t('fieldWork.proposal.fieldsLabel')}
            </span>
            {multiField ? (
              <span className="tasks-schedule-count">
                {t('fieldWork.scheduleGroup.selectedCount', {
                  selected: selectedIds.length,
                  total: group.proposals.length,
                })}
              </span>
            ) : null}
          </div>

          <div className="tasks-choice-list">
            {multiField ? (
              <button
                type="button"
                className={`tasks-choice-row tasks-schedule-select-row${
                  allSelected ? ' is-selected' : ''
                }`}
                aria-pressed={allSelected}
                onClick={toggleAll}
              >
                <span
                  className={`tasks-schedule-check${allSelected ? ' is-on' : ''}`}
                  aria-hidden
                >
                  {allSelected ? <Check size={16} strokeWidth={2.5} /> : null}
                </span>
                <span className="tasks-choice-label">{t('fieldWork.scheduleGroup.allFields')}</span>
              </button>
            ) : null}

            {group.proposals.map((proposal) => {
              const color = resolveFieldColor(fieldColors?.[proposal.fieldId], proposal.fieldId);
              const isOn = Boolean(selected[proposal.id]);
              return (
                <div key={proposal.id} className="tasks-schedule-field-block">
                  <button
                    type="button"
                    className={`tasks-choice-row tasks-schedule-select-row${
                      isOn ? ' is-selected' : ''
                    }`}
                    aria-pressed={isOn}
                    onClick={() =>
                      setSelected((prev) => ({ ...prev, [proposal.id]: !prev[proposal.id] }))
                    }
                  >
                    <span
                      className="tasks-schedule-dot"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span className="tasks-choice-label">{labelFor(proposal.fieldId)}</span>
                    <span className={`tasks-schedule-check${isOn ? ' is-on' : ''}`} aria-hidden>
                      {isOn ? <Check size={16} strokeWidth={2.5} /> : null}
                    </span>
                  </button>
                  {perFieldDates && isOn ? (
                    <label className="tasks-schedule-date tasks-schedule-date--nested">
                      <span className="tasks-context-label">
                        {t('fieldWork.scheduleGroup.sharedDate')}
                      </span>
                      <input
                        type="date"
                        value={dates[proposal.id] || ''}
                        onChange={(event) =>
                          setDates((prev) => ({ ...prev, [proposal.id]: event.target.value }))
                        }
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="tasks-schedule-section" aria-labelledby="tasks-schedule-when-label">
          <span id="tasks-schedule-when-label" className="tasks-why-label">
            {t('fieldWork.scheduleGroup.whenLabel')}
          </span>

          {multiField ? (
            <div className="tasks-choice-list">
              <button
                type="button"
                className={`tasks-choice-row${!perFieldDates ? ' is-selected' : ''}`}
                aria-pressed={!perFieldDates}
                onClick={() => setPerFieldDates(false)}
              >
                <span className="tasks-choice-label">
                  {t('fieldWork.scheduleGroup.sameDate')}
                </span>
                <span className="tasks-choice-hint">
                  {t('fieldWork.scheduleGroup.sameDateHint')}
                </span>
              </button>
              <button
                type="button"
                className={`tasks-choice-row${perFieldDates ? ' is-selected' : ''}`}
                aria-pressed={perFieldDates}
                onClick={() => setPerFieldDates(true)}
              >
                <span className="tasks-choice-label">
                  {t('fieldWork.scheduleGroup.differentDates')}
                </span>
                <span className="tasks-choice-hint">
                  {t('fieldWork.scheduleGroup.differentDatesHint')}
                </span>
              </button>
            </div>
          ) : null}

          {!perFieldDates || !multiField ? (
            <label className="tasks-schedule-date">
              <span className="tasks-context-label">{t('fieldWork.scheduleGroup.sharedDate')}</span>
              <input
                type="date"
                value={dates[group.proposals[0]?.id] || ''}
                onChange={(event) => setSharedDate(event.target.value)}
              />
            </label>
          ) : null}
        </section>
      </div>
    </RightDrawer>
  );
};

export default ScheduleGroupSheet;
