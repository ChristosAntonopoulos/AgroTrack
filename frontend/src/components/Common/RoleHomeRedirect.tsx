import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleHomePath, AppRole } from '../../navigation/navConfig';

const RoleHomeRedirect: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '') as AppRole;
  return <Navigate to={roleHomePath(role)} replace />;
};

export default RoleHomeRedirect;

