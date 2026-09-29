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

interface TaskCategoryMarkProps {
  templateCode?: string;
  size?: number;
  className?: string;
}

const TaskCategoryMark: React.FC<TaskCategoryMarkProps> = ({
  templateCode,
  size = 20,
  className = 'task-category-mark',
}) => {
  const category = templateMeta(templateCode)?.category ?? 'other';
  const Icon = ICONS[category] || ClipboardList;
  return (
    <span className={`${className} task-category-mark--${category}`} aria-hidden>
      <Icon size={size} aria-hidden />
    </span>
  );
};

export default TaskCategoryMark;
