import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleHomePath, type AppRole } from '../../navigation/navConfig';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { stepPath } from '../../onboarding/steps';

/** Paths allowed while hard-locked until first όρια. */
export const isActivationAllowedPath = (pathname: string, _search = ''): boolean => {
  if (pathname === '/settings' || pathname === '/access-denied') return true;
  if (pathname === '/fields' || pathname === '/fields/new' || pathname === '/chronologio') return true;
  if (/^\/fields\/[^/]+\/edit$/.test(pathname)) return true;
  // Named grove can be opened while the boundary is still unfinished.
  if (/^\/fields\/[^/]+$/.test(pathname)) return true;
  return false;
};

const activationRedirectTarget = (
  activation: NonNullable<ReturnType<typeof useOwnerActivationOptional>>,
  role: string | undefined
): string => {
  const step =
    activation.activeStep || (activation.completion.createGrove ? 'drawBoundary' : 'createGrove');
  if (step === 'createGrove') {
    return roleHomePath((role || '') as AppRole);
  }
  return stepPath(step, activation.primaryField?.id ?? null);
};

/**
 * When hard-locked, replace forbidden routes before their page mounts.
 * Keeps URL and visible screen in sync (avoids SPA “menu moved, content stuck”).
 */
const ActivationGate: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const { user } = useAuth();
  const location = useLocation();

  if (
    activation?.locked &&
    !isActivationAllowedPath(location.pathname, location.search)
  ) {
    const target = activationRedirectTarget(activation, user?.role);
    const here = `${location.pathname}${location.search}`;
    if (target !== here && !( !target.includes('?') && target === location.pathname)) {
      return <Navigate to={target} replace />;
    }
  }

  return <Outlet key={location.pathname} />;
};

export default ActivationGate;
