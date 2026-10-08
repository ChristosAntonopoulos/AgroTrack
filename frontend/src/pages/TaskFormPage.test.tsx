import React from 'react';
import { render, waitFor } from '@testing-library/react';
import TaskFormPage from './TaskFormPage';

const mockNavigate = jest.fn();

const mockSearchState = {
  initial: 'fieldId=field-1&templateCode=T06',
};

jest.mock(
  'react-router-dom',
  () => {
    const ReactLib = require('react');
    return {
      useNavigate: () => mockNavigate,
      useSearchParams: () => {
        const [params] = ReactLib.useState(() => new URLSearchParams(mockSearchState.initial));
        return [params, jest.fn()];
      },
    };
  },
  { virtual: true }
);

describe('TaskFormPage redirect', () => {
  it('redirects /tasks/new into the schedule sheet query on /tasks', async () => {
    render(<TaskFormPage />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/tasks?view=today&schedule=1&fieldId=field-1&templateCode=T06',
        { replace: true }
      );
    });
  });
});
