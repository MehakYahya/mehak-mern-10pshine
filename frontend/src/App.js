import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';
import ForgotPassword from './pages/Login/ForgotPassword';
import ResetPassword from './pages/Login/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Notes from './pages/Notes/Notes';
import NoteEditor from './pages/Notes/NoteEditor';
import RequireAuth from './components/RequireAuth';

import SecretNotesPage from './pages/SecretNotesPage';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={<RequireAuth><Dashboard /></RequireAuth>}
        />
        <Route
          path="/notes"
          element={<RequireAuth><Notes /></RequireAuth>}
        />
        <Route
          path="/notes/new"
          element={<RequireAuth><NoteEditor /></RequireAuth>}
        />
        <Route
          path="/notes/:id/edit"
          element={<RequireAuth><NoteEditor /></RequireAuth>}
        />
        <Route
          path="/secret"
          element={<RequireAuth><SecretNotesPage /></RequireAuth>}
        />
      </Routes>
    </div>
  );
}

export default App;
