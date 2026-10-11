import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';

/** Friendly "something broke" screen. Plain markup so it works even when providers failed. */
export const CrashScreen: React.FC = () => {
  const { t } = useTranslation('errors');
  return (
    <div className="error-container" role="alert" style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <TriangleAlert size={44} aria-hidden />
      <h1>{t('crashTitle')}</h1>
      <p>{t('crashBody')}</p>
      <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/')}>
        {t('crashReload')}
      </button>
    </div>
  );
};

/** Router `errorElement`: replaces the default "Unexpected Application Error" screen. */
export const RouteErrorPage: React.FC = () => {
  const error = useRouteError();
  React.useEffect(() => {
    // Logged for diagnostics; the user only sees the friendly copy.
    console.error('Route error', error);
  }, [error]);
  return <CrashScreen />;
};

type State = { failed: boolean };

/** Catches render errors above the router (providers, layout) in production. */
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}
