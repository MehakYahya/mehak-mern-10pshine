import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ResetPassword from '../pages/Login/ResetPassword';

describe('ResetPassword component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    global.fetch = undefined;
    global.__TEST_ROUTER__ = undefined;
  });

  it('verifies code using sessionStorage (dev path) and completes reset', async () => {
    sessionStorage.setItem('resetCode', '1234');

    const mockNavigate = jest.fn();
    global.__TEST_ROUTER__ = {
      searchParams: { get: () => null },
      locationState: { email: 'dev@example.com' },
      navigate: mockNavigate,
    };

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url && url.includes('reset-password')) {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'Password updated' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<ResetPassword />);

    const codeInput = screen.getByPlaceholderText(/123456/i);
    const passwordInput = screen.getByPlaceholderText(/New password/i);
    const resetBtn = screen.getByRole('button', { name: /reset/i });

    fireEvent.change(codeInput, { target: { value: '1234' } });
    fireEvent.change(passwordInput, { target: { value: 'MyPass123!' } });
    fireEvent.click(resetBtn);

    await waitFor(() => expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument());

    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    fireEvent.change(confirmInput, { target: { value: 'MyPass123!' } });

    jest.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => expect(screen.getByText(/Password updated/i)).toBeInTheDocument());
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    jest.useRealTimers();
  });

  it('verifies code via server and completes reset', async () => {
    sessionStorage.removeItem('resetCode');

    const mockNavigate = jest.fn();
    global.__TEST_ROUTER__ = {
      searchParams: { get: () => null },
      locationState: { email: 'srv@example.com' },
      navigate: mockNavigate,
    };

    global.fetch = jest.fn().mockImplementation((url) => {
      if (url && url.includes('verify-reset-code')) {
        return Promise.resolve({ ok: true, json: async () => ({ token: 'srvtoken', message: 'verified' }) });
      }
      if (url && url.includes('reset-password')) {
        return Promise.resolve({ ok: true, json: async () => ({ message: 'Password updated (srv)' }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });

    render(<ResetPassword />);

    const codeInput = screen.getByPlaceholderText(/123456/i);
    const passwordInput = screen.getByPlaceholderText(/New password/i);
    const resetBtn = screen.getByRole('button', { name: /reset/i });

    fireEvent.change(codeInput, { target: { value: '9999' } });
    fireEvent.change(passwordInput, { target: { value: 'SrvPass!23' } });
    fireEvent.click(resetBtn);

    await waitFor(() => expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument());

    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    fireEvent.change(confirmInput, { target: { value: 'SrvPass!23' } });

    jest.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => expect(screen.getByText(/Password updated \(srv\)/i)).toBeInTheDocument());
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    jest.useRealTimers();
  });
});
