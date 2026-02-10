import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testUsers } from '../services/testUsers';
import { isMockMode } from '../services/serviceFactory';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoginIllustration from '../components/Auth/LoginIllustration';
import { User, Shield, Briefcase, UserCheck } from 'lucide-react';
import './LoginPage.css';

const LoginPage: React.FC = () => {
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (testUser: typeof testUsers[0]) => {
    setError(null);
    setLoading(true);
    setEmail(testUser.email);
    setPassword(testUser.password);

    try {
      await login(testUser.email, testUser.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
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

  const getRoleColor = (role: string) => {
    switch (role) {
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
          <h1>Welcome Back</h1>
          <h2>Login to your account</h2>
          {error && <div className="error-message">{error}</div>}
          
          {showQuickLogin && (
            <div className="quick-login-section">
              <h3>Quick Login (Test Users)</h3>
              <div className="quick-login-buttons">
                {testUsers.map((user) => (
                  <Button
                    key={user.email}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    disabled={loading}
                    variant={getRoleColor(user.role) as any}
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
                <span>OR</span>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
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
              <label htmlFor="password">Password</label>
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
              Login
            </Button>
          </form>
          <p className="register-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
