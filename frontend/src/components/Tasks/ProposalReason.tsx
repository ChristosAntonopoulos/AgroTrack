import React from 'react';

interface ProposalReasonProps {
  text: string;
}

const ProposalReason: React.FC<ProposalReasonProps> = ({ text }) => (
  <p className="task-proposal-reason">{text}</p>
);

export default ProposalReason;
