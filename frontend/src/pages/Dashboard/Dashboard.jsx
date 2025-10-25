import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { apiBase } from '../../utils/api';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./Dashboard.css";

function Dashboard() {
  const [activeTab, setActiveTab] = useState("home"); // home, add, notes, profile
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const token = localStorage.getItem("token");

  // Fetch notes — stable reference so it can be used safely in useEffect
  const fetchNotes = useCallback(async () => {
    try {
      const t = localStorage.getItem("token");
    const res = await axios.get(`${apiBase}/api/notes`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setNotes(res.data);
      setFilteredNotes(res.data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // compact toolbar for Quill to reduce multi-row toolbar appearance (memoized)
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  }), []);

  // Search/filter notes
  useEffect(() => {
    if (!searchQuery.trim()) return setFilteredNotes(notes);
    const filtered = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.keywords || []).some((k) =>
          k.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    setFilteredNotes(filtered);
  }, [searchQuery, notes]);

  // Highlight search matches
  const highlightText = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, `<mark style="background:yellow;color:black;">$1</mark>`);
  };

  // Add/update note
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const noteData = {
        title,
        content,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
      };

      if (editingId) {
        await axios.put(`${apiBase}/api/notes/${editingId}`, noteData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${apiBase}/api/notes`, noteData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setTitle("");
      setContent("");
      setKeywords("");
      setEditingId(null);
      setActiveTab("notes");
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit note
  const handleEdit = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setKeywords((note.keywords || []).join(", "));
    setEditingId(note._id);
    setActiveTab("add");
  };

  // Delete note with confirmation
const handleDelete = async (id) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this note?");
  if (!confirmDelete) return;

  try {
    const res = await axios.delete(`${apiBase}/api/notes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(res.data); // Should show "Note removed"
    fetchNotes(); // Refresh the list
  } catch (err) {
    console.error("Delete failed:", err.response?.data || err.message);
  }
};

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Profile form state
  const [profileName, setProfileName] = useState(localStorage.getItem('name') || '');
  const [profileEmail, setProfileEmail] = useState(localStorage.getItem('email') || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // If profileName not set in localStorage, try to parse it from the JWT token
  useEffect(() => {
    if (profileName) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload && payload.name) {
        setProfileName(payload.name);
        localStorage.setItem('name', payload.name);
      }
      if (payload && payload.email) {
        setProfileEmail(payload.email);
        localStorage.setItem('email', payload.email);
      }
    } catch (err) {
      // ignore parse errors
      console.error('Failed to parse token for profile info', err);
    }
  }, [profileName]);

  // Fetch profile from backend to ensure email is accurate
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchProfile = async () => {
      try {
          const res = await fetch(`${apiBase}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        if (!res.ok) return;
        const data = await res.json();
        if (data.name) { setProfileName(data.name); localStorage.setItem('name', data.name); }
        if (data.email) { setProfileEmail(data.email); localStorage.setItem('email', data.email); }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };
    fetchProfile();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: profileName, email: profileEmail, password: profilePassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      // update localStorage and state
      if (data.token) localStorage.setItem('token', data.token);
      if (data.name) localStorage.setItem('name', data.name);
      if (data.email) localStorage.setItem('email', data.email);
      alert('Profile updated');
      setProfilePassword('');
    } catch (err) {
      console.error(err);
      alert('Profile update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Side Nav */}
      <nav className="side-nav">
        <h1>NoteSphere</h1>
        <ul>
          <li className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>Home</li>
          <li className={activeTab === "add" ? "active" : ""} onClick={() => setActiveTab("add")}>Add Note</li>
          <li className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</li>
        </ul>
      </nav>

      {/* Main Content */}
      <div className="content">
        {/* Top Bar */}
        <div className="top-bar">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        {/* Home Tab */}
        {activeTab === "home" && (
          <div className="home-tab">
            <h2>Welcome back, {profileName || localStorage.getItem('name') || 'User'}!</h2>
            <p>Total Notes: {notes.length}</p>

            <div className="home-search">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <h3>Recent Notes</h3>
            <div className="recent-notes">
              {notes.slice(0,3).map(note => (
                <div key={note._id} className="note-card">
                  <h4 dangerouslySetInnerHTML={{__html: highlightText(note.title, searchQuery)}} />
                  <div dangerouslySetInnerHTML={{ __html: highlightText(note.content.replace(/<[^>]+>/g, ""), searchQuery) }} />
                  {note.keywords && note.keywords.length > 0 && (
                    <div className="note-keywords">
                      {note.keywords.map((k, i) => <span key={i} className="keyword">{k}</span>)}
                    </div>
                  )}
                  <button onClick={() => handleEdit(note)}>Edit</button>
                </div>
              ))}
              {notes.length === 0 && <p>No notes yet. Add one!</p>}
            </div>
          </div>
        )}

        {/* Add Note Tab */}
        {activeTab === "add" && (
          <div className="add-tab">
            <h2>{editingId ? "Edit Note" : "New Note"}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
              <ReactQuill modules={quillModules} value={content} onChange={setContent} />
              <input
                type="text"
                placeholder="Keywords (comma separated)"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
              />
              <button type="submit">{editingId ? "Update" : "Add"}</button>
            </form>
          </div>
        )}

        {/* All Notes Tab */}
        {activeTab === "notes" && (
          <div className="notes-tab">
            <h2>All Notes</h2>
            <div className="notes-search">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {filteredNotes.length === 0 ? <p>No notes found.</p> : filteredNotes.map(note => (
              <div key={note._id} className="note-card">
                <h3 dangerouslySetInnerHTML={{ __html: highlightText(note.title, searchQuery) }} />
                <div dangerouslySetInnerHTML={{ __html: highlightText(note.content.replace(/<[^>]+>/g, ""), searchQuery) }} />
                {note.keywords && note.keywords.length > 0 && (
                  <div className="note-keywords">
                    {note.keywords.map((k, i) => <span key={i} className="keyword">{k}</span>)}
                  </div>
                )}
                <div className="actions">
                  <button onClick={() => handleEdit(note)}>Edit</button>
                  <button onClick={() => handleDelete(note._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="profile-tab">
            <h2>Profile</h2>
            <form onSubmit={saveProfile} className="profile-form">
              <label>
                Name
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required />
              </label>
              <label>
                Email
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required />
              </label>
              <label>
                New Password (leave blank to keep current)
                <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} />
              </label>
              <button type="submit" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Profile'}</button>
            </form>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      {activeTab !== "add" && (
        <button className="fab" onClick={() => setActiveTab("add")}>+</button>
      )}
    </div>
  );
}

export default Dashboard;
