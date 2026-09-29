import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

/** Redirect locked FieldOwners away from non-setup routes. */
const ActivationGate: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activation?.locked) return;

    if (isActivationAllowedPath(location.pathname, location.search)) return;

    const step =
      activation.activeStep || (activation.completion.createGrove ? 'drawBoundary' : 'createGrove');
    const target = stepPath(step, activation.primaryField?.id ?? null);
    navigate(target, { replace: true });
  }, [
    activation?.locked,
    activation?.activeStep,
    activation?.completion.createGrove,
    activation?.primaryField?.id,
    location.pathname,
    location.search,
    navigate,
  ]);

  return null;
};

export default ActivationGate;
