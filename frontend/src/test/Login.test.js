import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../pages/Login/Login';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  MemoryRouter: ({ children }) => children,
}));

describe('Login component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders login form inputs and buttons', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/Username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/Forgot Password\?/i)).toBeInTheDocument();
  });

  it('submits login and navigates on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'fake-token' }),
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/Username/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('fake-token'));
    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));

    alertSpy.mockRestore();
  });

  it('can open forgot-password form and submit', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'sent' }),
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<Login />);
    fireEvent.click(screen.getByText(/Forgot Password\?/i));
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'x@y.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    alertSpy.mockRestore();
  });
});
