import React, { useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  CloudOff,
  CloudSun,
  Info,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import type { ProposalChip } from '../../utils/proposalPresentation';
import WeatherExplanationPopover from './WeatherExplanationPopover';

const ICONS: Record<ProposalChip['id'], React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  official: ShieldAlert,
  expiring: AlertTriangle,
  good: Sun,
  caution: CloudSun,
  unsuitable: AlertTriangle,
  unknown: CloudOff,
  seasonal: Info,
};

const WEATHER_CHIPS = new Set<ProposalChip['id']>(['good', 'caution', 'unsuitable', 'unknown']);

interface WeatherSuitabilityBadgeProps {
  chip: ProposalChip;
  label: string;
  headline: string;
  facts: string[];
}

const WeatherSuitabilityBadge: React.FC<WeatherSuitabilityBadgeProps> = ({
  chip,
  label,
  headline,
  facts,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const Icon = ICONS[chip.id] || Info;
  const explainsWeather = WEATHER_CHIPS.has(chip.id);

  if (!explainsWeather) {
    return (
      <span className={`task-proposal-chip task-proposal-chip--${chip.id}`}>
        <Icon size={14} aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <span className="task-proposal-chip-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`task-proposal-chip task-proposal-chip--${chip.id} is-button`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={14} aria-hidden />
        {label}
      </button>
      <WeatherExplanationPopover
        id={popoverId}
        open={open}
        headline={headline}
        facts={facts}
        onClose={() => setOpen(false)}
        returnFocusTo={buttonRef.current}
      />
    </span>
  );
};

export default WeatherSuitabilityBadge;
