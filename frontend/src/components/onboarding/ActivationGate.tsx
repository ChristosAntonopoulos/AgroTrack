import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
import { stepPath } from '../../onboarding/steps';

/** Paths allowed while hard-locked until first όρια. */
export const isActivationAllowedPath = (pathname: string, search = ''): boolean => {
  if (pathname === '/settings' || pathname === '/access-denied') return true;
  if (pathname === '/fields' || pathname === '/fields/new') return true;
  if (/^\/fields\/[^/]+\/edit$/.test(pathname)) return true;
  // Post-boundary spatial welcome — allow during refresh race after save.
  if (/^\/fields\/[^/]+$/.test(pathname)) {
    const params = new URLSearchParams(search);
    if (params.get('activation') === 'spatial') return true;
  }
  return false;
};

/** Redirect locked FieldOwners away from non-setup routes. */
const ActivationGate: React.FC = () => {
  const activation = useOwnerActivationOptional();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activation?.locked) return;

    // Keep locked owners on the boundary step when editing an existing grove.
    if (
      /^\/fields\/[^/]+\/edit$/.test(location.pathname) &&
      activation.completion.createGrove &&
      !activation.completion.drawBoundary
    ) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') !== 'boundary') {
        params.set('focus', 'boundary');
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        return;
      }
    }

    if (isActivationAllowedPath(location.pathname, location.search)) return;

    const step =
      activation.activeStep || (activation.completion.createGrove ? 'drawBoundary' : 'createGrove');
    const target = stepPath(step, activation.primaryField?.id ?? null);
    navigate(target, { replace: true });
  }, [
    activation?.locked,
    activation?.activeStep,
    activation?.completion.createGrove,
    activation?.completion.drawBoundary,
    activation?.primaryField?.id,
    location.pathname,
    location.search,
    navigate,
  ]);

  return null;
};

export default ActivationGate;
