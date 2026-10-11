import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ForgotPasswordPage from './ForgotPasswordPage';

const mockForgot = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../services/authService', () => ({
  authService: { forgotPassword: (...args: unknown[]) => mockForgot(...args) },
}));
jest.mock('../services/mock/mockAuthService', () => ({
  mockAuthService: { forgotPassword: (...args: unknown[]) => mockForgot(...args) },
}));
jest.mock('../config/apiConfig', () => ({ isMockDataEnabled: () => false }));
jest.mock('../utils/translateApiError', () => ({ getApiErrorMessage: () => null }));

describe('QA-010 forgot password email validation', () => {
  beforeEach(() => mockForgot.mockReset());

  it('QA-010 shows an inline, announced error for an invalid email and does not call the API', () => {
    render(<ForgotPasswordPage />);
    const input = screen.getByLabelText('common:email');
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('auth:forgot.emailInvalid');
    expect(alert.id).toBe('forgot-email-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'forgot-email-error');
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('QA-010 shows the missing-email message inline when empty', () => {
    render(<ForgotPasswordPage />);
    const input = screen.getByLabelText('common:email');
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(screen.getByRole('alert')).toHaveTextContent('auth:forgot.missingEmail');
  });
});
