import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const AppIcon: React.FC<AppIconProps> = ({ name, size = 20, color }) => {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.primary} />;
};

export default AppIcon;
