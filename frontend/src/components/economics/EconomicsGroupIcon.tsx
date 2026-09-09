import React from 'react';
import {
  Users,
  Factory,
  Fuel,
  Bug,
  Sprout,
  Droplets,
  Scissors,
  Wrench,
  Truck,
  Wheat,
  CircleDot,
  CircleDollarSign,
  Landmark,
} from 'lucide-react';
import type { EconomicsGroupId } from '../../utils/economics';

export const EconomicsGroupIcon: React.FC<{ group: EconomicsGroupId; size?: number }> = ({
  group,
  size = 16,
}) => {
  const props = { size, 'aria-hidden': true as const };
  switch (group) {
    case 'workers':
      return <Users {...props} />;
    case 'mill':
      return <Factory {...props} />;
    case 'fuel':
      return <Fuel {...props} />;
    case 'plantProtection':
      return <Bug {...props} />;
    case 'fertilization':
      return <Sprout {...props} />;
    case 'irrigation':
      return <Droplets {...props} />;
    case 'pruning':
      return <Scissors {...props} />;
    case 'machinery':
      return <Wrench {...props} />;
    case 'transport':
      return <Truck {...props} />;
    case 'harvest':
      return <Wheat {...props} />;
    case 'sale':
    case 'fruitSale':
    case 'oilSale':
    case 'otherIncome':
      return <CircleDollarSign {...props} />;
    case 'subsidy':
      return <Landmark {...props} />;
    default:
      return <CircleDot {...props} />;
  }
};
