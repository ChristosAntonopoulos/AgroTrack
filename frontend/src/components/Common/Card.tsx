import React, { ReactNode, ElementType } from 'react';
import { Link } from 'react-router-dom';
import './Card.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
  as?: ElementType | typeof Link;
  to?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  header,
  footer,
  hover = false,
  padding = 'md',
  className = '',
  children,
  as,
  to,
  onClick,
  ...props
}) => {
  const cardClasses = [
    'card',
    hover && 'card-hover',
    `card-padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {(title || subtitle || header) && (
        <div className="card-header">
          {header ? (
            header
          ) : (
            <>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </>
          )}
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </>
  );

  if (as === Link || to) {
    const Component = as || Link;
    return (
      <Component
        to={to}
        className={cardClasses}
        onClick={onClick}
        {...(props as any)}
      >
        {content}
      </Component>
    );
  }

  const Component = as || 'div';
  return (
    <Component
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {content}
    </Component>
  );
};

export default Card;
