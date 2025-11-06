import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from '../pages/Notes/NoteEditor';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

jest.mock('react-quill', () => {
  const React = require('react');
  return React.forwardRef(({ value, onChange }, ref) => React.createElement('textarea', { ref, value: value || '', onChange: e => onChange(e.target.value, null, null, { getSelection: () => null, getFormat: () => ({}) }) }));
});

describe('NoteEditor component', () => {
  beforeEach(() => { localStorage.setItem('token', 'tok'); jest.clearAllMocks(); });

  it('allows creating a note and saving', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    render(<NoteEditor />);

    const titleInput = screen.getByPlaceholderText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'My note' } });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/notes'));
  });
});
