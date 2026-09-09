import React from 'react';
import {
  Scissors,
  ShoppingBasket,
  Truck,
  Leaf,
  Droplets,
  Shield,
  Factory,
  Users,
  Sprout,
  FlaskConical,
  ClipboardList,
  MoreHorizontal,
  Handshake,
  Tractor,
  Wrench,
  Package,
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  scissors: <Scissors size={28} />,
  basket: <ShoppingBasket size={28} />,
  tractor: <Tractor size={28} />,
  leaf: <Leaf size={28} />,
  droplets: <Droplets size={28} />,
  shield: <Shield size={28} />,
  truck: <Truck size={28} />,
  factory: <Factory size={28} />,
  users: <Users size={28} />,
  sprout: <Sprout size={28} />,
  'test-tube': <FlaskConical size={28} />,
  clipboard: <ClipboardList size={28} />,
  'more-horizontal': <MoreHorizontal size={28} />,
  handshake: <Handshake size={28} />,
  wrench: <Wrench size={28} />,
  package: <Package size={28} />,
};

export const categoryIcon = (icon?: string) => ICONS[icon || ''] || <Handshake size={28} />;
