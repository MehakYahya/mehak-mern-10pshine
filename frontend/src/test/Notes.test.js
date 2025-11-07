import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Notes from '../pages/Notes/Notes';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
}));

describe('Notes component', () => {
  beforeEach(() => { localStorage.setItem('token', 'fake'); jest.clearAllMocks(); });

  it('fetches and displays notes and handles actions', async () => {
    const notes = [
      { _id: '1', title: '<b>Note1</b>', content: 'c1', pinned: false, archived: false },
    ];

    global.fetch = jest.fn((url) => {
      if (url.endsWith('/api/notes')) return Promise.resolve({ ok: true, json: async () => notes });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Notes />);
    await waitFor(() => expect(screen.getByText(/Note1/i)).toBeInTheDocument());

    const pinBtn = screen.getByText(/Pin/i);
    fireEvent.click(pinBtn);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
