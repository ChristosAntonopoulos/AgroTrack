import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import { toDateInputValue } from '../../utils/proposalPresentation';

interface ScheduleGroupSheetProps {
  group: ProposalTemplateGroup | null;
  fieldNames: Record<string, string>;
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
  open,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('tasks');
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

  if (!group) return null;

  const selectedIds = group.proposals.filter((p) => selected[p.id]).map((p) => p.id);

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t('fieldWork.scheduleGroup.title')}
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={selectedIds.length === 0 || busy}
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
      <p className="tasks-dismiss-copy">{t('fieldWork.scheduleGroup.copy')}</p>
      <div className="tasks-schedule-fields">
        <label className="tasks-schedule-all">
          <input
            type="checkbox"
            checked={selectedIds.length === group.proposals.length}
            onChange={(event) => {
              const next: Record<string, boolean> = {};
              group.proposals.forEach((proposal) => {
                next[proposal.id] = event.target.checked;
              });
              setSelected(next);
            }}
          />
          {t('fieldWork.scheduleGroup.allFields')}
        </label>
        {group.proposals.map((proposal) => (
          <div key={proposal.id} className="tasks-schedule-field-row">
            <label>
              <input
                type="checkbox"
                checked={Boolean(selected[proposal.id])}
                onChange={(event) =>
                  setSelected((prev) => ({ ...prev, [proposal.id]: event.target.checked }))
                }
              />
              {fieldNames[proposal.fieldId] || proposal.fieldId}
            </label>
            {perFieldDates ? (
              <input
                type="date"
                value={dates[proposal.id] || ''}
                onChange={(event) =>
                  setDates((prev) => ({ ...prev, [proposal.id]: event.target.value }))
                }
              />
            ) : null}
          </div>
        ))}
      </div>
      <Button variant="outline" size="lg" onClick={() => setPerFieldDates((v) => !v)}>
        {perFieldDates
          ? t('fieldWork.scheduleGroup.sameDate')
          : t('fieldWork.scheduleGroup.differentDates')}
      </Button>
      {!perFieldDates ? (
        <label className="tasks-context-control" style={{ display: 'block', marginTop: 12 }}>
          <span className="tasks-context-label">{t('fieldWork.scheduleGroup.sharedDate')}</span>
          <input
            type="date"
            value={dates[group.proposals[0]?.id] || ''}
            onChange={(event) => {
              const value = event.target.value;
              const next: Record<string, string> = {};
              group.proposals.forEach((proposal) => {
                next[proposal.id] = value;
              });
              setDates(next);
            }}
          />
        </label>
      ) : null}
    </RightDrawer>
  );
};

export default ScheduleGroupSheet;
