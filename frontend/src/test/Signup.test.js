import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Signup from '../pages/Signup/Signup';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe('Signup component', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

  it('renders inputs and submits signup', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 't123', message: 'ok' })
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    jest.useFakeTimers();
    render(<Signup />);
    fireEvent.change(screen.getByPlaceholderText(/Name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'Passw0rd!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('t123'));
    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
    jest.useRealTimers();
    alertSpy.mockRestore();
  });
});
