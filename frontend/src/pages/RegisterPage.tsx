import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoginIllustration from '../components/Auth/LoginIllustration';
import './RegisterPage.css';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Producer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, firstName, lastName, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('auth:register.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-left">
        <LoginIllustration />
      </div>
      <div className="register-right">
        <Card className="register-card">
          <h1>{t('auth:register.title')}</h1>
          <h2>{t('auth:register.subtitle')}</h2>
          {error && <div className="error-message">{error}</div>}
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
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="firstName">{t('auth:register.firstName')}</label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">{t('auth:register.lastName')}</label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">{t('common:role')}</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="Producer">{t('common:roles.Producer')}</option>
                <option value="FieldOwner">{t('common:roles.FieldOwner')}</option>
              </select>
            </div>
            <Button type="submit" disabled={loading} loading={loading} fullWidth>
              {t('auth:register.button')}
            </Button>
          </form>
          <p className="login-link">
            {t('auth:register.hasAccount')} <Link to="/login">{t('auth:register.loginLink')}</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
