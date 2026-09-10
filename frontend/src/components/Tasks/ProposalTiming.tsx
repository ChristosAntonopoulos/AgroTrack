import React from 'react';
import { CalendarDays } from 'lucide-react';

interface ProposalTimingProps {
  period: string;
  label: string;
}

const ProposalTiming: React.FC<ProposalTimingProps> = ({ period, label }) => {
  if (!period) return null;
  return (
    <p className="task-proposal-timing">
      <CalendarDays size={16} aria-hidden />
      <span>
        <span className="task-proposal-timing-label">{label}</span>
        {period}
      </span>
    </p>
  );
};

export default ProposalTiming;
