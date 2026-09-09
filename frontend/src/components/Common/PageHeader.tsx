import React, { ReactNode } from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
  children,
}) => {
  return (
    <header className={`u-page-header page-header ${className}`.trim()}>
      <div className="u-page-header-text">
        {typeof title === 'string' ? <h1 className="u-page-header-title">{title}</h1> : title}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <p className="u-page-header-subtitle">{subtitle}</p>
          ) : (
            subtitle
          )
        ) : null}
        {children}
      </div>
      {actions ? <div className="u-page-header-actions">{actions}</div> : null}
    </header>
  );
};

export default PageHeader;
