import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testUsers } from '../services/testUsers';
import { isMockMode } from '../services/serviceFactory';
import { roleHomePath } from '../navigation/navConfig';
import { AppRole } from '../navigation/navConfig';
import { getApiErrorMessage } from '../utils/translateApiError';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoginIllustration from '../components/Auth/LoginIllustration';
import { Shield, Briefcase } from 'lucide-react';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const navigateAfterLogin = (role: string) => {
    navigate(roleHomePath(role as AppRole));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      const matched = testUsers.find(u => u.email === email);
      navigateAfterLogin(matched?.role || 'FieldOwner');
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
      navigateAfterLogin(testUser.role);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:login.failed'));
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
      default:
        return <Shield />;
    }
  };

  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case 'FieldOwner':
        return 'primary';
      case 'Producer':
        return 'success';
      default:
        return 'primary';
    }
  };

  const getRoleLabel = (userRole: string) => {
    if (userRole === 'FieldOwner') return t('auth:login.roleOwner');
    if (userRole === 'Producer') return t('auth:login.roleProducer');
    return userRole;
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
              <p className="quick-login-hint">{t('auth:login.demoHint')}</p>
              <div className="quick-login-buttons">
                {testUsers.map((user) => (
                  <Button
                    key={user.email}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    disabled={loading}
                    variant={getRoleColor(user.role) as 'primary' | 'success'}
                    fullWidth
                    className="quick-login-btn"
                  >
                    <span className="quick-login-icon">{getRoleIcon(user.role)}</span>
                    <div className="quick-login-info">
                      <span className="quick-login-name">{user.displayName}</span>
                      <span className="quick-login-role">{getRoleLabel(user.role)}</span>
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
