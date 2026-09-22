import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../Common/PageContainer';
import Card from '../Common/Card';
import LoadingSpinner from '../Common/LoadingSpinner';
import BrandLogo from '../Common/BrandLogo';
import '../../pages/InviteAcceptPage.css';

type InviteAcceptShellProps = {
  loading: boolean;
  error: string | null;
  loginFallbackLabel: string;
  children?: React.ReactNode;
};

const InviteAcceptShell: React.FC<InviteAcceptShellProps> = ({
  loading,
  error,
  loginFallbackLabel,
  children,
}) => {
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer maxWidth="sm" className="invite-accept-page">
      <Card className="invite-accept-card">
        <div className="invite-accept-brand">
          <BrandLogo variant="mark" size="sm" alt="" />
          <span>OLEACHRON</span>
        </div>
        {error ? <p className="invite-accept-error">{error}</p> : null}
        {children ? (
          <div className="invite-accept-body">{children}</div>
        ) : (
          <Link to="/login">{loginFallbackLabel}</Link>
        )}
      </Card>
    </PageContainer>
  );
};

export default InviteAcceptShell;
