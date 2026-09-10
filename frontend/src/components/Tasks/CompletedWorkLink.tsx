import React from 'react';
import { Link } from 'react-router-dom';

interface CompletedWorkLinkProps {
  to?: string;
  children: React.ReactNode;
}

const CompletedWorkLink: React.FC<CompletedWorkLinkProps> = ({ to = '/chronologio', children }) => (
  <p className="tasks-completed-link-wrap">
    <Link to={to} className="tasks-completed-link">
      {children}
    </Link>
  </p>
);

export default CompletedWorkLink;
