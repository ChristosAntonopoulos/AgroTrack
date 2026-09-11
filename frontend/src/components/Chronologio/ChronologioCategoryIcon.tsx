import React from 'react';
import {
  Activity,
  Camera,
  CheckSquare,
  CloudRain,
  Leaf,
  Sparkles,
  StickyNote,
  Users,
  Wallet,
  Wheat,
} from 'lucide-react';

type Props = {
  category: string;
  size?: number;
};

const ChronologioCategoryIcon: React.FC<Props> = ({ category, size = 16 }) => {
  switch (category) {
    case 'task':
    case 'work':
      return <CheckSquare size={size} />;
    case 'expense':
    case 'income':
    case 'money':
      return <Wallet size={size} />;
    case 'harvest':
      return <Wheat size={size} />;
    case 'note':
    case 'observation':
      return <StickyNote size={size} />;
    case 'weather':
      return <CloudRain size={size} />;
    case 'intelligence':
    case 'warning':
      return <Sparkles size={size} />;
    case 'lifecycle':
    case 'field_change':
      return <Leaf size={size} />;
    case 'collaborator':
      return <Users size={size} />;
    case 'photo':
      return <Camera size={size} />;
    default:
      return <Activity size={size} />;
  }
};

export default ChronologioCategoryIcon;
