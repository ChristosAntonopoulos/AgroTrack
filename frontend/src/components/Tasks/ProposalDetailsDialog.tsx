import React from 'react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';

interface ProposalDetailsDialogProps {
  open: boolean;
  title: string;
  fieldName: string;
  explanation: string;
  periodLabel: string;
  period: string;
  sourceLabel: string;
  source?: string;
  confidenceLabel: string;
  confidence?: string;
  weatherLabel: string;
  weatherHeadline: string;
  weatherFacts: string[];
  closeLabel: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

const ProposalDetailsDialog: React.FC<ProposalDetailsDialogProps> = ({
  open,
  title,
  fieldName,
  explanation,
  periodLabel,
  period,
  sourceLabel,
  source,
  confidenceLabel,
  confidence,
  weatherLabel,
  weatherHeadline,
  weatherFacts,
  closeLabel,
  onClose,
}) => (
  <RightDrawer
    open={open}
    onClose={onClose}
    title={title}
    subtitle={fieldName}
    size="sm"
    closeLabel={closeLabel}
    footer={
      <Button variant="outline" onClick={onClose}>
        {closeLabel}
      </Button>
    }
  >
    <p className="task-proposal-dialog-copy">{explanation}</p>
    {period ? (
      <p>
        <strong>{periodLabel}</strong> {period}
      </p>
    ) : null}
    {source ? (
      <p>
        <strong>{sourceLabel}</strong> {source}
      </p>
    ) : null}
    {confidence ? (
      <p>
        <strong>{confidenceLabel}</strong> {confidence}
      </p>
    ) : null}
    {weatherHeadline || weatherFacts.length > 0 ? (
      <div>
        <p>
          <strong>{weatherLabel}</strong>
        </p>
        {weatherHeadline ? <p>{weatherHeadline}</p> : null}
        {weatherFacts.length > 0 ? (
          <ul>
            {weatherFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
      </div>
    ) : null}
  </RightDrawer>
);

export default ProposalDetailsDialog;
