import React from 'react';
import {
  Bug,
  ClipboardList,
  Droplets,
  Eye,
  FlaskConical,
  Grape,
  Leaf,
  Scissors,
  Sprout,
} from 'lucide-react';
import { templateMeta, type FieldWorkCategory } from '../../data/fieldWorkCatalogueLabels';

const ICONS: Record<FieldWorkCategory, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  monitoring: Bug,
  pruning: Scissors,
  fertilisation: Leaf,
  irrigation: Droplets,
  harvest: Grape,
  inspection: Eye,
  analysis: FlaskConical,
  ground: Sprout,
  other: ClipboardList,
};

interface ProposalCategoryIconProps {
  templateCode?: string;
  label: string;
}

const ProposalCategoryIcon: React.FC<ProposalCategoryIconProps> = ({ templateCode, label }) => {
  const category = templateMeta(templateCode)?.category ?? 'other';
  const Icon = ICONS[category] || ClipboardList;
  return (
    <span className="task-proposal-icon" aria-hidden title={label}>
      <Icon size={22} aria-hidden />
    </span>
  );
};

export default ProposalCategoryIcon;
