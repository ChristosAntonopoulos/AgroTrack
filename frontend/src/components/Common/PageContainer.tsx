import React, { ReactNode } from 'react';
import './PageContainer.css';

interface PageContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  maxWidth = 'xl',
  padding = 'md',
  className = '',
  children,
}) => {
  const containerClasses = [
    'page-container',
    `page-container-${maxWidth}`,
    `page-container-padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={containerClasses}>{children}</div>;
};

export default PageContainer;
