import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testUsers } from '../services/testUsers';
import { isMockMode } from '../services/serviceFactory';
import { getApiErrorMessage } from '../utils/translateApiError';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoginIllustration from '../components/Auth/LoginIllustration';
import { User, Shield, Briefcase, UserCheck } from 'lucide-react';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (testUser: (typeof testUsers)[0]) => {
    setError(null);
    setLoading(true);
    setEmail(testUser.email);
    setPassword(testUser.password);

    try {
      await login(testUser.email, testUser.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    setEmail(demoEmail);
    setPassword('password123');
    try {
      await login(demoEmail, 'password123');
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failedRetry'));
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (userRole: string) => {
    switch (userRole) {
      case 'FieldOwner':
        return <Shield />;
      case 'Producer':
        return <Briefcase />;
      case 'Agronomist':
        return <UserCheck />;
      default:
        return <User />;
    }
  };

  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case 'FieldOwner':
        return 'primary';
      case 'Producer':
        return 'success';
      case 'Agronomist':
        return 'info';
      default:
        return 'primary';
    }
  };

  const showQuickLogin = isMockMode() || process.env.NODE_ENV === 'development';

  return (
    <div className="login-container">
      <div className="login-left">
        <LoginIllustration />
      </div>
      <div className="login-right">
        <Card className="login-card">
          <h1>{t('auth:login.title')}</h1>
          <h2>{t('auth:login.subtitle')}</h2>
          {error && <div className="error-message">{error}</div>}

          {showQuickLogin && (
            <div className="quick-login-section">
              <h3>{t('auth:login.demoTitle')}</h3>
              <div className="quick-login-buttons">
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('owner@olivefarm.com')}
                  disabled={loading}
                  variant="primary"
                  fullWidth
                  className="quick-login-btn"
                >
                  <span className="quick-login-icon">{getRoleIcon('FieldOwner')}</span>
                  <div className="quick-login-info">
                    <span className="quick-login-name">John Smith</span>
                    <span className="quick-login-role">FieldOwner</span>
                  </div>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleDemoLogin('producer1@olivefarm.com')}
                  disabled={loading}
                  variant="success"
                  fullWidth
                  className="quick-login-btn"
                >
                  <span className="quick-login-icon">{getRoleIcon('Producer')}</span>
                  <div className="quick-login-info">
                    <span className="quick-login-name">Maria Garcia</span>
                    <span className="quick-login-role">Producer</span>
                  </div>
                </Button>
              </div>
              <div className="quick-login-divider">
                <span>{t('common:or')}</span>
              </div>
            </div>
          )}

          {showQuickLogin && (
            <div className="quick-login-section">
              <h3>{t('auth:login.quickLoginTitle')}</h3>
              <div className="quick-login-buttons">
                {testUsers.map((user) => (
                  <Button
                    key={user.email}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    disabled={loading}
                    variant={getRoleColor(user.role) as 'primary' | 'success' | 'info'}
                    fullWidth
                    className="quick-login-btn"
                  >
                    <span className="quick-login-icon">{getRoleIcon(user.role)}</span>
                    <div className="quick-login-info">
                      <span className="quick-login-name">{user.displayName}</span>
                      <span className="quick-login-role">{user.role}</span>
                    </div>
                  </Button>
                ))}
              </div>
              <div className="quick-login-divider">
                <span>{t('common:or')}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t('common:email')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t('common:password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={loading} loading={loading} fullWidth>
              {t('auth:login.button')}
            </Button>
          </form>
          <p className="register-link">
            {t('auth:login.noAccount')} <Link to="/register">{t('auth:login.registerLink')}</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
