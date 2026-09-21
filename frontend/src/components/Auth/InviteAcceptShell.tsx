import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../Common/PageContainer';
import PageHeader from '../Common/PageHeader';
import Card from '../Common/Card';
import LoadingSpinner from '../Common/LoadingSpinner';
import '../../pages/InviteAcceptPage.css';

type InviteAcceptShellProps = {
  title: string;
  loading: boolean;
  error: string | null;
  loginFallbackLabel: string;
  children?: React.ReactNode;
};

const InviteAcceptShell: React.FC<InviteAcceptShellProps> = ({
  title,
  loading,
  error,
  loginFallbackLabel,
  children,
}) => {
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer maxWidth="sm" className="invite-accept-page">
      <Card>
        <PageHeader title={title} />
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
