import React from 'react';
import './LoadingSpinner.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: 'primary' | 'white' | 'inherit';
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  fullScreen = false,
  className = '',
}) => {
  const spinnerClasses = [
    'loading-spinner',
    `loading-spinner-${size}`,
    `loading-spinner-${color}`,
    fullScreen && 'loading-spinner-fullscreen',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <div className={spinnerClasses}>
      <div className="spinner" />
    </div>
  );

  if (fullScreen) {
    return <div className="loading-spinner-overlay">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;
