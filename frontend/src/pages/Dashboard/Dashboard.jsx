import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import SecretNotesPage from "../SecretNotesPage";
import { apiBase } from '../../utils/api';
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./Dashboard.css";

// Utility to remove inline color styles from HTML
function stripInlineColorStyles(html) {
  return html.replace(/style=(['"])([^'"\>]*)\1/gi, function(match, quote, styleContent) {
    // Remove color property from style content
    const cleaned = styleContent.replace(/color\s*:[^;]+;?/gi, '');
    if (cleaned.trim()) {
      return `style=${quote}${cleaned}${quote}`;
    } else {
      return '';
    }
  });
}


// Helper to get initials from name
function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Dashboard() {
  // Remove profile image handler
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const removeProfileImage = () => {
    setProfileImageUrl("");
    setPendingProfileImage("");
  };
  const [showFileInput, setShowFileInput] = useState(false);
  const avatarModalRef = useRef();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  useEffect(() => {
    if (!showAvatarModal) return;
    function handleClick(e) {
      if (avatarModalRef.current && !avatarModalRef.current.contains(e.target)) {
        setShowAvatarModal(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAvatarModal]);
  // Notes state must be declared before any useEffect thior function that uses it
  const [notes, setNotes] = useState([]);
  const [secretKey, setSecretKey] = useState(Date.now());
  // State for secret dashboard password modal
  const [showSecretPasswordModal, setShowSecretPasswordModal] = useState(false);
  const [secretPasswordInput, setSecretPasswordInput] = useState("");
  const [secretPasswordError, setSecretPasswordError] = useState("");
  // Use the same password as SecretNotesPage.js
  const SECRET_DASHBOARD_PASSWORD = "letmein";

  // Handler for logo click
  const handleLogoClick = () => {
    setSecretPasswordInput("");
    setSecretPasswordError("");
    setShowSecretPasswordModal(true);
  };

  const handleSecretPasswordSubmit = (e) => {
    e.preventDefault();
    if (secretPasswordInput === SECRET_DASHBOARD_PASSWORD) {
      setShowSecretPasswordModal(false);
      navigate('/secret');
    } else {
      setSecretPasswordError("Incorrect password. Try again.");
    }
  };
  const navigate = useNavigate();
  const [pendingProfileImage, setPendingProfileImage] = useState(null);
  const fileInputRef = React.useRef();
  // Removed duplicate showAvatarModal declaration
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    setChangePasswordLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ currentPassword, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password change failed');
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordError("");
      window.alert("Password changed successfully!");
    } catch (err) {
      setChangePasswordError(err.message || 'Password change failed');
    } finally {
      setChangePasswordLoading(false);
    }
  };
  const [profileMessage, setProfileMessage] = useState("");
  const [profileName, setProfileName] = useState(localStorage.getItem('name') || '');
  const [profileEmail, setProfileEmail] = useState(localStorage.getItem('email') || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const userInputRef = React.useRef(false);
  const handleProfileNameChange = (e) => {
    userInputRef.current = true;
    setProfileName(e.target.value);
    setProfileMessage("");
  };
  

  const NOTES_PER_PAGE = 9;
  const [homePage, setHomePage] = useState(1);
  const [notesPage, setNotesPage] = useState(1);
  const [activeTab, setActiveTab] = useState("home"); // home, add, notes, profile
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
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

  const stripHtml = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const filteredHomeNotes = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    let filtered = notes.filter(n => !(n.keywords || []).some(k => (k || '').trim().toLowerCase() === 'secret'));
    if (q) {
      filtered = filtered.filter(
        (note) =>
          (note.title || "").toLowerCase().includes(q) ||
          stripHtml(note.content || "").toLowerCase().includes(q) ||
          ((note.keywords || []).some(k => (k || "").toLowerCase().includes(q)))
      );
    }
    return getFilteredSortedNotes(filtered);
  }, [notes, searchQuery, getFilteredSortedNotes]);
  // Sort pinned notes to top before paginating
  const sortedHomeNotes = [...filteredHomeNotes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const homeTotalPages = Math.max(1, Math.ceil(sortedHomeNotes.length / NOTES_PER_PAGE));
  const paginatedHomeNotes = sortedHomeNotes.slice((homePage - 1) * NOTES_PER_PAGE, homePage * NOTES_PER_PAGE);

  const filteredNotesTab = useMemo(() => {
    let filtered = notes.filter(n => !(n.keywords || []).some(k => (k || '').trim().toLowerCase() === 'secret'));
    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (note) =>
          (note.title || "").toLowerCase().includes(q) ||
          stripHtml(note.content || "").toLowerCase().includes(q) ||
          ((note.keywords || []).some(k => (k || "").toLowerCase().includes(q)))
      );
    }
    return getFilteredSortedNotes(filtered);
  }, [notes, searchQuery, selectedTag, sortOrder, getFilteredSortedNotes]);
  // Sort pinned notes to top before paginating
  const sortedNotesTab = [...filteredNotesTab].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const notesTotalPages = Math.max(1, Math.ceil(sortedNotesTab.length / NOTES_PER_PAGE));
  const paginatedNotesTab = sortedNotesTab.slice((notesPage - 1) * NOTES_PER_PAGE, notesPage * NOTES_PER_PAGE);

  
  // Pin/unpin note for dashboard
  const togglePin = async (id) => {
    try {
      await axios.patch(`${apiBase}/api/notes/${id}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchNotes();
    } catch (err) {
      console.error('Pin/unpin failed:', err.response?.data || err.message);
    }
  };

  // Helper to fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      const res = await axios.get(`${apiBase}/api/notes`, { headers: { Authorization: `Bearer ${token}` } });
      setNotes(res.data);
    } catch (err) {
      console.error('Fetch notes failed:', err.response?.data || err.message);
    }
  }, [token]);

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
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, "gi");
      return text.replace(regex, `<mark style="background:yellow;color:black;">$1</mark>`);
    } catch (e) {
      return text;
    }
  };

  const highlightHtmlContent = (html = "", query = "") => {
    if (!query) return html;
    try {
     
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const walk = (node) => {
        if (node.nodeType === 3) { // text node
          const replaced = highlightText(node.textContent, query);
          if (replaced !== node.textContent) {
            const span = document.createElement('span');
            span.innerHTML = replaced;
            node.replaceWith(...span.childNodes);
          }
        } else if (node.nodeType === 1 && node.childNodes) {
          Array.from(node.childNodes).forEach(walk);
        }
      };
      walk(tempDiv);
      return tempDiv.innerHTML;
    } catch (e) {
      return html;
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
      setTitle("");
      setContent("");
      setKeywords("");
      setEditingId(null);
      setShowEditorModal(false);
      setActiveTab("home");
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
  setShowEditorModal(true);
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

  

  useEffect(() => {
    if (profileName && profileImageUrl) return;
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      if (payload?.name) { setProfileName(payload.name); localStorage.setItem('name', payload.name); }
      if (payload?.email) { setProfileEmail(payload.email); localStorage.setItem('email', payload.email); }
    } catch (err) { console.error('Failed to parse token for profile info', err); }
  }, [profileName, profileImageUrl]);

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
        if (data.profileImage) {
          setProfileImageUrl(data.profileImage);
          localStorage.setItem('profileImage', data.profileImage);
        } else {
          setProfileImageUrl("");
          localStorage.removeItem('profileImage');
        }
      } catch (err) { console.error('Failed to fetch profile', err); }
    })();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage("");
    let didTimeout = false;
    // Fallback: always reset loading after 10s
    const timeout = setTimeout(() => {
      didTimeout = true;
      setProfileLoading(false);
      setProfileMessage("Profile update failed: request timed out");
    }, 10000);
    try {
      const res = await fetch(`${apiBase}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          name: profileName,
          password: profilePassword || undefined,
          profileImage: pendingProfileImage !== null ? pendingProfileImage : profileImageUrl || undefined
        }),
      });
      if (didTimeout) return; 
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      if (data.token) localStorage.setItem('token', data.token);
      if (data.name) localStorage.setItem('name', data.name);
      if (data.email) localStorage.setItem('email', data.email);
      if (typeof data.profileImage !== 'undefined') {
        setProfileImageUrl(data.profileImage);
        localStorage.setItem('profileImage', data.profileImage);
      }
      setPendingProfileImage(null);
      setProfileMessage("");
      setProfilePassword('');
      window.alert("Profile updated successfully!");
      setActiveTab('home'); // Navigate back to dashboard
    } catch (err) {
      if (!didTimeout) {
        clearTimeout(timeout);
        setProfileMessage("Profile update failed: " + (err.message || 'Unknown error'));
      }
    } finally {
      if (!didTimeout) setProfileLoading(false);
    }
  };

  
  // Only show non-secret tags in tag filter
  const allTags = useMemo(() => Array.from(new Set(notes.filter(n => !(n.keywords || []).some(k => (k || '').trim().toLowerCase() === 'secret')).flatMap(n => n.keywords || []))), [notes]);


  const handleProfileImageChange = (e) => {
    const fileInput = e.target;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
  setPendingProfileImage(ev.target.result); // Update preview in profile tab only
      fileInput.value = '';
      setTimeout(() => setShowAvatarModal(false), 0);
    };
    reader.readAsDataURL(file);
  };

  // Reset form fields when switching to 'add' tab
  useEffect(() => {
    if (!editingId && !showEditorModal) {
      setTitle("");
      setContent("");
      setKeywords("");
    }
  }, [editingId, showEditorModal]);


  return (
    <>
      {/* Secret Dashboard Password Modal */}
      {showSecretPasswordModal && (
        <div className="secret-password-modal-overlay">
          <div className="secret-password-modal">
            <h3>Enter Password for Secret Dashboard</h3>
            <form onSubmit={handleSecretPasswordSubmit}>
              <input
                type="password"
                value={secretPasswordInput}
                onChange={e => setSecretPasswordInput(e.target.value)}
                placeholder="Password"
                autoFocus
                style={{ width: "100%", marginBottom: 12 }}
              />
              {secretPasswordError && (
                <div style={{ color: "#d32f2f", marginBottom: 8 }}>{secretPasswordError}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="btn btn-primary">Submit</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSecretPasswordModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="dashboard-main">
        {/* Only show header and welcome if not creating a new note */}
        {!(activeTab === 'add' && !editingId) && (
          <>
            <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', minWidth: 220, margin: '0 0 0 30px' }}>
                {/* NoteSphere logo or name */}
                <span
                  style={{ fontWeight: 900, fontSize: 28, color: '#ff4081', letterSpacing: 1, cursor: 'pointer' }}
                  onDoubleClick={handleLogoClick}
                  title="Double-click to open secret dashboard (password required)"
                >
                  NoteSphere
                </span>
              </div>
              <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  className="profile-dp"
                  title={profileName}
                  style={{ position: 'relative', marginRight: 12, cursor: 'pointer' }}
                  onClick={() => setActiveTab('profile')}
                >
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" style={{width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff4081'}} />
                  ) : (
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: '#ff4081',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                      border: '2px solid #ff4081',
                      userSelect: 'none',
                    }}>{getInitials(profileName || localStorage.getItem('name') || 'U')}</div>
                  )}
                </div>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
              </div>
            </header>
            {/* Welcome message below header */}
            {activeTab !== 'profile' && (
              <div className="welcome-text">
                {`Welcome${profileName ? ', ' : ''}${profileName || ''}`}
              </div>
            )}
          </>
        )}
        <div className="content">
        {showChangePassword && (
          <div className="modal-overlay">
            <div className="modal change-password-modal">
              <h3>Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <label>
                  Current Password
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required disabled={changePasswordLoading} />
                </label>
                <label>
                  New Password
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={changePasswordLoading} />
                </label>
                <label>
                  Confirm New Password
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={changePasswordLoading} />
                </label>
                {changePasswordError && <div className="profile-error-msg">{changePasswordError}</div>}
                <div style={{display: 'flex', gap: 8, marginTop: 16}}>
                  <button type="submit" className="btn btn-primary" disabled={changePasswordLoading}>{changePasswordLoading ? 'Changing...' : 'Change'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setChangePasswordError(""); }} disabled={changePasswordLoading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        

        {activeTab === "home" && (
          <div className="home-tab">
            <div className="search-filter-row" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <div className="search-box" style={{ flex: 1, border: '2px solid #1C6EA4' }}>
                <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flex: 1 }}>
                <select className="dashboard-select" value={selectedTag}  style={{ flex: 1, border: '2px solid #1C6EA4' }} onChange={e => setSelectedTag(e.target.value)}>
                  <option value="">All Tags</option>
                  {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select className="dashboard-sort" value={sortOrder} style={{ flex: 1, border: '2px solid #1C6EA4' }} onChange={e => setSortOrder(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
            <p style={{ color: 'var(--muted)', marginTop: 12 }}>Total Notes: {notes.length}</p>

            <h3 className="dashboard-header-gradient" style={{ color: '#1C6EA4', marginLeft: '5px' }}>Recent Notes</h3>
            <div className="recent-notes note-grid">
              {paginatedHomeNotes.map(note => (
                <div
                  key={note._id}
                  className={`note-card${note.pinned ? ' pinned' : ''}`}
                  tabIndex={0}
                  style={{ position: 'relative' }}
                  onDoubleClick={() => {
                    setTitle(note.title || "");
                    setContent(note.content || "");
                    setKeywords((note.keywords || []).join(", "));
                    setEditingId(note._id);
                    setShowEditorModal(true);
                  }}
                >
                      {(note.date || note.createdAt) && (
                        <div style={{
                          fontSize: '0.85em',
                          color: '#888',
                          fontWeight: 400,
                          margin: '4px 0 8px 0',
                        }}>
                          Created: {new Date(note.date || note.createdAt).toLocaleString()}
                        </div>
                      )}
                  <button
                    className="note-pinned-emoji"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    title={note.pinned ? 'Unpin' : 'Pin'}
                    onClick={e => { e.stopPropagation(); togglePin(note._id); }}
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    {note.pinned ? "📌" : "📍"}
                  </button>
                  <h4 dangerouslySetInnerHTML={{ __html: highlightText(note.title || "", searchQuery) }} />
                  {note.keywords?.length > 0 && (
                    <div className="note-keywords" style={{marginBottom: 6}}>
                      {note.keywords.map((k, i) => <span key={i} className="keyword">{k}</span>)}
                    </div>
                  )}
                  <div className="note-content" dangerouslySetInnerHTML={{ __html: stripInlineColorStyles(highlightHtmlContent(note.content || "", searchQuery)) }} />
                  <div style={{ fontSize: '0.85em', color: 'var(--muted)', marginBottom: 4 }}>
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                  </div>
                  <div className="actions">
                    <button className="btn btn-edit" onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>Edit</button>
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}>Delete</button>
                  </div>
                </div>
              ))}
              {/* Add invisible placeholders to always fill 3 columns */}
              {Array.from({ length: Math.max(0, 3 - paginatedHomeNotes.length) }).map((_, i) => (
                <div key={"recent-placeholder-" + i} className="note-placeholder" />
              ))}
              {notes.length === 0 && <p>No notes yet. Add one!</p>}
            </div>

            {homeTotalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost" onClick={() => setHomePage(p => Math.max(1, p - 1))} disabled={homePage === 1}>Prev</button>
                <span style={{ color: 'var(--accent-dark)' }}>Page {homePage} of {homeTotalPages}</span>
                <button className="btn btn-ghost" onClick={() => setHomePage(p => Math.min(homeTotalPages, p + 1))} disabled={homePage === homeTotalPages}>Next</button>
              </div>
            )}
          </div>
        )}

        
        {showEditorModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(60,80,120,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal note-editor-modal" style={{ background: 'linear-gradient(90deg, #fff 0%, #B2C6D5 100%)', borderRadius: 18, boxShadow: '0 4px 32px rgba(44, 164, 228, 0.18)', padding: '32px 28px', maxWidth: 540, width: '100%', margin: '0 auto', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontWeight: 700 }}>{editingId ? "Edit Note" : "New Note"}</h2>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#888', padding: '0 8px' }}
                    aria-label="More"
                    onClick={e => {
                      e.preventDefault();
                      setShowDownloadMenu(m => !m);
                    }}
                  >&#8942;</button>
                  {showDownloadMenu && (
                    <div style={{ position: 'absolute', top: 32, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10 }}>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          minHeight: '28px',
                          width: '100%',
                          background: '#1976d2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                          boxShadow: '0 2px 6px rgba(25, 118, 210, 0.12)',
                          margin: '2px 0',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#ff4081'}
                        onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
                        onClick={() => {
                          setShowDownloadMenu(false);
                          // Download as PDF logic
                          const noteTitle = title || 'Note';
                          const noteContent = content || '';
                          const keywordsText = keywords ? `Keywords: ${keywords}` : '';
                          const html = `<h2>${noteTitle}</h2><div>${keywordsText}</div><div>${noteContent}</div>`;
                          const win = window.open('', '_blank');
                          win.document.write(`<html><head><title>${noteTitle}</title></head><body>${html}</body></html>`);
                          win.document.close();
                          win.print();
                        }}
                      >Download as PDF</button>
                    </div>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', marginBottom: 12, fontSize: 18, borderRadius: 8, border: '1.5px solid #b0c4de', padding: '10px 14px' }} />
                <ReactQuill modules={quillModules} value={content} onChange={setContent} style={{ marginBottom: 12, borderRadius: 8, background: '#fff' }} />
                {keywords && (
                  <div className="note-keywords-edit" style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {keywords.split(',').map((k, i) => {
                      const kw = k.trim();
                      if (!kw) return null;
                      return (
                        <span key={i} className="keyword" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {kw}
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#ff4081', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginLeft: 2, position: 'relative', top: '3px' }}
                            title={`Remove keyword '${kw}'`}
                            onClick={() => {
                              const newKeywords = keywords.split(',').filter((word, idx) => idx !== i).join(',');
                              setKeywords(newKeywords);
                            }}
                          >×</button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <input type="text" placeholder="Keywords (comma separated)" value={keywords} onChange={e => setKeywords(e.target.value)} style={{ width: '100%', marginBottom: 18, fontSize: 16, borderRadius: 8, border: '1.5px solid #b0c4de', padding: '8px 12px' }} />
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, borderRadius: 8, fontSize: 16, padding: '8px 24px' }}>{editingId ? "Update" : "Add"}</button>
                  <button type="button" className="btn btn-ghost" style={{ borderRadius: 8, fontWeight: 700, fontSize: 16, padding: '8px 24px' }} onClick={() => { setShowEditorModal(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {activeTab === "notes" && (

          <div className="notes-tab">
            <h2>All Notes</h2>

        {activeTab === "secret" && (
          <SecretNotesPage key={secretKey} resetSecretKey={secretKey} />
        )}
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

            {filteredNotesTab.length === 0 ? <p>No notes found.</p> : (
              <>
                <div className="note-grid">
                  {paginatedNotesTab.map(note => (
                    <div key={note._id} className="note-card" tabIndex={0} style={{ position: 'relative' }}>
                      <button
                        className="note-pinned-emoji"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        title={note.pinned ? 'Unpin' : 'Pin'}
                        onClick={e => { e.stopPropagation(); togglePin(note._id); }}
                        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                      >
                        {note.pinned ? "📌" : "📍"}
                      </button>
                      <h3 dangerouslySetInnerHTML={{ __html: highlightText(note.title || "", searchQuery) }} />
                      {note.createdAt && (
                        <div style={{
                          fontSize: '1.08em',
                          color: '#222',
                          background: '#ffe600',
                          fontWeight: 800,
                          padding: '6px 12px',
                          borderRadius: 8,
                          margin: '10px 0 8px 0',
                          display: 'inlinewhy-block',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
                        }}>
                          Created: {new Date(note.createdAt).toLocaleString()}
                        </div>
                      )}
                      {note.keywords?.length > 0 && (
                        <div className="note-keywords" style={{marginBottom: 6}}>
                          {note.keywords.map((k, i) => <span key={i} className="keyword">{k} <button className="kw-remove" onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(note._id, k); }}>×</button></span>)}
                        </div>
                      )}
                      <div className="note-content" dangerouslySetInnerHTML={{ __html: stripInlineColorStyles(highlightHtmlContent(note.content || "", searchQuery)) }} />
                      <div className="actions">
                        <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleEdit(note); }}>Edit</button>
                        <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note._id); }}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {/* Add invisible placeholders to always fill 3 columns */}
                  {Array.from({ length: Math.max(0, 3 - paginatedNotesTab.length) }).map((_, i) => (
                    <div key={"placeholder-" + i} className="note-placeholder" />
                  ))}
                </div>

                {notesTotalPages > 1 && (
                  <div className="pagination">
                    <button className="btn btn-ghost" onClick={() => setNotesPage(p => Math.max(1, p - 1))} disabled={notesPage === 1}>Prev</button>
                    <span style={{ color: 'var(--accent-dark)' }}>Page {notesPage} of {notesTotalPages}</span>
                    <button className="btn btn-ghost" onClick={() => setNotesPage(p => Math.min(notesTotalPages, p + 1))} disabled={notesPage === notesTotalPages}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        
        {activeTab === "profile" && (
          <div className="profile-tab" style={{ background: 'linear-gradient(90deg, #dfec9c 0%, #9CAFAA 100%)', minHeight: '100%', borderRadius: 18, boxShadow: '0 2px 12px rgba(44, 164, 228, 0.08)', padding: '32px 24px', marginTop: '-24px' }}>
            <h2 style={{ color: '#1C6EA4', fontWeight: 800, marginBottom: 24 }}>Profile</h2>
            <form onSubmit={saveProfile} className="profile-form">
              <div className="profile-avatar-label">
                <span className="profile-avatar-title" style={{ color: '#1C6EA4', fontWeight: 700 }}>Profile Picture</span>
                <div className="profile-avatar-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                  <div
                    style={{ width: 110, height: 110, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 12px rgba(44,164,228,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', overflow: 'visible' }}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Change profile picture"
                  >
                    {/* Cancel emoji button for removing profile image */}
                    {profileImageUrl && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeProfileImage(); }}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: '2px',
                          background: '#fff',
                          border: '1.5px solid #ff4081',
                          borderRadius: '50%',
                          fontSize: 16,
                          color: '#ff4081',
                          cursor: 'pointer',
                          zIndex: 10,
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          padding: 0,
                        }}
                        title="Remove profile picture"
                        aria-label="Remove profile picture"
                      >
                        <span role="img" aria-label="cancel" style={{fontSize: 14, fontWeight: 700}}>❌</span>
                      </button>
                    )}
                    {(pendingProfileImage || profileImageUrl) ? (
                      <img src={pendingProfileImage || profileImageUrl} alt="Profile" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #33A1E0' }} />
                    ) : (
                      <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#33A1E0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 38, border: '3px solid #33A1E0', userSelect: 'none' }}>{getInitials(profileName || localStorage.getItem('name') || 'U')}</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handleProfileImageChange}
                    />
                  </div>
                </div>
              </div>
              <div className="profile-field">
                <span style={{ color: '#1C6EA4', fontWeight: 600 }}>Name</span>
                <input type="text" value={profileName} onChange={handleProfileNameChange} required style={{ border: '2px solid #1C6EA4', borderRadius: 8, padding: '8px 12px', marginTop: 4 }} />
              </div>
              <div className="profile-field">
                <span style={{ color: '#1C6EA4', fontWeight: 600 }}>Email</span>
                <input type="email" value={profileEmail} disabled readOnly style={{ border: '2px solid #1C6EA4', borderRadius: 8, padding: '8px 12px', marginTop: 4, background: '#f5f7fa', color: '#888' }} />
              </div>
              <button type="button" className="btn btn-accent change-password-btn" onClick={() => setShowChangePassword(true)} style={{marginTop: '1rem', background: '#33A1E0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700}}>Change Password</button>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={profileLoading} style={{ background: '#1C6EA4', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}>
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
                <button type="button" className="btn btn-ghost" style={{ borderRadius: 8, fontWeight: 700 }} onClick={() => setActiveTab('home')}>Cancel</button>
              </div>
              {profileMessage && !profileMessage.includes('success') ? (
                <div className="profile-error-msg" style={{marginTop: 10, textAlign: 'center', color: '#154D71', fontWeight: 600}}>
                  {profileMessage}
                </div>
              ) : null}
            </form>
          </div>
        )}
      </div>

      </div>
      {}
    </>
  );
}

export default Dashboard;

