import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { apiBase } from '../../utils/api';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./Dashboard.css";

function Dashboard() {
  
  const NOTES_PER_PAGE = 9;
  const [homePage, setHomePage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [activeTab, setActiveTab] = useState("home"); 
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const token = localStorage.getItem("token");

  
  const getNoteDate = (note) => {
    if (note.createdAt) return new Date(note.createdAt);
    
    if (note._id && typeof note._id === 'string' && note._id.length >= 8) {
      const ts = parseInt(note._id.substring(0, 8), 16);
      return new Date(ts * 1000);
    }
    return new Date(0);
  };

  const getFilteredSortedNotes = (noteList) => {
    let filtered = noteList;
    if (selectedTag) {
      filtered = filtered.filter(note => (note.keywords || []).includes(selectedTag));
    }
    filtered = filtered.slice().sort((a, b) => {
      const dateA = getNoteDate(a);
      const dateB = getNoteDate(b);
      if (sortOrder === "oldest") return dateA - dateB;
      return dateB - dateA;
    });
    return filtered;
  };

  
  const filteredHomeNotes = getFilteredSortedNotes(notes);
  const homeTotalPages = Math.max(1, Math.ceil(filteredHomeNotes.length / NOTES_PER_PAGE));
  const paginatedHomeNotes = filteredHomeNotes.slice((homePage - 1) * NOTES_PER_PAGE, homePage * NOTES_PER_PAGE);

  
  const filteredNotesTab = useMemo(() => {
    let filtered = notes;
    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (note) =>
          (note.title || "").toLowerCase().includes(q) ||
          (note.content || "").toLowerCase().includes(q) ||
          ((note.keywords || []).some(k => (k || "").toLowerCase().includes(q)))
      );
    }
    return getFilteredSortedNotes(filtered);
  }, [notes, searchQuery, selectedTag, sortOrder]);
  const notesTotalPages = Math.max(1, Math.ceil(filteredNotesTab.length / NOTES_PER_PAGE));
  const paginatedNotesTab = filteredNotesTab.slice((notesPage - 1) * NOTES_PER_PAGE, notesPage * NOTES_PER_PAGE);

  
  const fetchNotes = useCallback(async () => {
    try {
      const t = localStorage.getItem("token");
      const res = await axios.get(`${apiBase}/api/notes`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setNotes(res.data || []);
      setFilteredNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  
  useEffect(() => {
    if (!token) return;
    try { window.history.pushState(null, '', window.location.href); } catch (e) {}
    const onPop = () => {
      const p = window.location.pathname.replace(/\/$/, '');
      if (p === '' || p === '/' || p === '/login' || p === '/signup') {
        try { window.history.pushState(null, '', '/dashboard'); }
        catch (e) { window.location.href = '/dashboard'; }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [token]);

  
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  }), []);

  
  useEffect(() => {
    setNotesPage(1);
  }, [searchQuery, selectedTag, sortOrder]);

  
  const handleRemoveKeyword = async (noteId, kw) => {
    if (!window.confirm(`Remove keyword "${kw}" from this note?`)) return;
    try {
      const note = notes.find(n => n._id === noteId);
      if (!note) return;
      const newKeywords = (note.keywords || []).filter(k => k.toLowerCase() !== kw.toLowerCase());
      await axios.put(`${apiBase}/api/notes/${noteId}`, { title: note.title, content: note.content, keywords: newKeywords }, { headers: { Authorization: `Bearer ${token}` } });
      fetchNotes();
    } catch (err) {
      console.error('Failed to remove keyword', err.response?.data || err.message);
    }
  };

  
  const highlightText = (text = "", query = "") => {
    if (!query) return text;
    try {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
      return text.replace(regex, `<mark style="background:yellow;color:black;">$1</mark>`);
    } catch (e) {
      return text;
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const noteData = {
        title,
        content,
        keywords: keywords.split(",").map(k => k.trim()).filter(k => k),
      };
      if (editingId) {
        await axios.put(`${apiBase}/api/notes/${editingId}`, noteData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${apiBase}/api/notes`, noteData, { headers: { Authorization: `Bearer ${token}` } });
      }
      setTitle(""); setContent(""); setKeywords(""); setEditingId(null); setActiveTab("notes");
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  
  const handleEdit = (note) => {
    setTitle(note.title || "");
    setContent(note.content || "");
    setKeywords((note.keywords || []).join(", "));
    setEditingId(note._id);
    setActiveTab("add");
  };

  
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this note?");
    if (!confirmDelete) return;
    try {
      await axios.delete(`${apiBase}/api/notes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchNotes();
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
    }
  };

  
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  
  const [profileName, setProfileName] = useState(localStorage.getItem('name') || '');
  const [profileEmail, setProfileEmail] = useState(localStorage.getItem('email') || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (profileName) return;
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      if (payload?.name) { setProfileName(payload.name); localStorage.setItem('name', payload.name); }
      if (payload?.email) { setProfileEmail(payload.email); localStorage.setItem('email', payload.email); }
    } catch (err) { console.error('Failed to parse token for profile info', err); }
  }, [profileName]);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/profile`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.name) { setProfileName(data.name); localStorage.setItem('name', data.name); }
        if (data.email) { setProfileEmail(data.email); localStorage.setItem('email', data.email); }
      } catch (err) { console.error('Failed to fetch profile', err); }
    })();
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

  
  const allTags = Array.from(new Set(notes.flatMap(n => n.keywords || [])));

  return (
    <div className="dashboard">
      <nav className="side-nav">
        <h1>NoteSphere</h1>
        <ul>
          <li className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>Home</li>
          <li className={activeTab === "add" ? "active" : ""} onClick={() => setActiveTab("add")}>Add Note</li>
          <li className={activeTab === "notes" ? "active" : ""} onClick={() => setActiveTab("notes")}>All Notes</li>
          <li className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</li>
        </ul>
      </nav>

      <div className="content">
        <div className="top-bar">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        
        {activeTab === "home" && (

          <div className="home-tab">
            <h2>Welcome back, {profileName || localStorage.getItem('name') || 'User'}!</h2>
            <p>Total Notes: {notes.length}</p>

            <div className="search-filter-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div className="search-box" style={{ flex: 1, marginRight: 24 }}>
                <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select className="dashboard-select" value={selectedTag} onChange={e => setSelectedTag(e.target.value)}>
                  <option value="">All Tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select className="dashboard-sort" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            <h3>Recent Notes</h3>
            <div className="recent-notes note-grid">
              {paginatedHomeNotes.map(note => (
                <div key={note._id} className="note-card" tabIndex={0}>
                  <h4 dangerouslySetInnerHTML={{ __html: highlightText(note.title || "", searchQuery) }} />
                  <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content || "" }} />
                  {note.keywords?.length > 0 && (
                    <div className="note-keywords">
                      {note.keywords.map((k, i) => <span key={i} className="keyword">{k}</span>)}
                    </div>
                  )}
                  <div className="actions">
                    <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>Edit</button>
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}>Delete</button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && <p>No notes yet. Add one!</p>}
            </div>

            {homeTotalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost" onClick={() => setHomePage(p => Math.max(1, p - 1))} disabled={homePage === 1}>Prev</button>
                <span>Page {homePage} of {homeTotalPages}</span>
                <button className="btn btn-ghost" onClick={() => setHomePage(p => Math.min(homeTotalPages, p + 1))} disabled={homePage === homeTotalPages}>Next</button>
              </div>
            )}
          </div>
        )}

        
        {activeTab === "add" && (
          <div className="add-tab">
            <h2>{editingId ? "Edit Note" : "New Note"}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
              <ReactQuill modules={quillModules} value={content} onChange={setContent} />
              <input type="text" placeholder="Keywords (comma separated)" value={keywords} onChange={e => setKeywords(e.target.value)} />
              <button type="submit" className="btn btn-primary">{editingId ? "Update" : "Add"}</button>
              <button type="button" className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => { setActiveTab('home'); setEditingId(null); }}>Cancel</button>
            </form>
          </div>
        )}

        
        {activeTab === "notes" && (

          <div className="notes-tab">
            <h2>All Notes</h2>

            <div className="search-filter-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div className="search-box" style={{ flex: 1, marginRight: 24 }}>
                <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select className="dashboard-select" value={selectedTag} onChange={e => setSelectedTag(e.target.value)}>
                  <option value="">All Tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select className="dashboard-sort" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>

            {filteredNotes.length === 0 ? <p>No notes found.</p> : (
              <>
                <div className="note-grid">
                  {paginatedNotesTab.map(note => (
                    <div key={note._id} className="note-card" tabIndex={0}>
                      <h3 dangerouslySetInnerHTML={{ __html: highlightText(note.title || "", searchQuery) }} />
                      <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content || "" }} />
                      {note.keywords?.length > 0 && (
                        <div className="note-keywords">
                          {note.keywords.map((k, i) => <span key={i} className="keyword">{k} <button className="kw-remove" onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(note._id, k); }}>×</button></span>)}
                        </div>
                      )}
                      <div className="actions">
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>Edit</button>
                        <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                {notesTotalPages > 1 && (
                  <div className="pagination">
                    <button className="btn btn-ghost" onClick={() => setNotesPage(p => Math.max(1, p - 1))} disabled={notesPage === 1}>Prev</button>
                    <span>Page {notesPage} of {notesTotalPages}</span>
                    <button className="btn btn-ghost" onClick={() => setNotesPage(p => Math.min(notesTotalPages, p + 1))} disabled={notesPage === notesTotalPages}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        
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


      {activeTab !== "add" && (
        <button className="fab" onClick={() => setActiveTab("add")}>+</button>
      )}
    </div>
  );
}

export default Dashboard;
