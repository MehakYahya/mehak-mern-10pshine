
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { apiBase, authHeaders } from "../utils/api";
// Highlight search query in text
const highlightText = (text = "", query = "") => {
  if (!query) return text;
  try {
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\$&')})`, "gi");
    return text.replace(regex, '<mark style="background:yellow;color:black;">$1</mark>');
  } catch (e) {
    return text;
  }
};

// Highlight in HTML content
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


export default function SecretNotesPage({ resetSecretKey }) {
  // Password state and modal
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  // Get current password from localStorage or default
  const getCurrentPassword = () => localStorage.getItem("secretDashboardPass") || "letmein";
  const handleChangePassword = (e) => {
    e.preventDefault();
    setPassError("");
    setSuccessMsg("");
    if (!newPassword || !confirmPassword) {
      setPassError("Please enter and confirm new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }
    localStorage.setItem("secretDashboardPass", newPassword);
    setSuccessMsg("Password changed successfully!");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setShowChangePassModal(false), 1200);
  };
  const navigate = useNavigate();
  // ...existing code...
  const [secretNotes, setSecretNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const quillRef = useRef(null);
  const [page, setPage] = useState(1);
  const NOTES_PER_PAGE = 9;

  // Helpers
  const isSecretNote = (note) => (note.keywords || []).some(k => (k || '').trim().toLowerCase() === 'secret');

  // Fetch secret notes from backend
  useEffect(() => {
    fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { navigate("/login"); throw new Error("Unauthorized"); }
        return r.json();
      })
      .then(allNotes => {
        if (!Array.isArray(allNotes)) {
          setSecretNotes([]);
          return;
        }
        setSecretNotes(allNotes.filter(isSecretNote));
      })
      .catch(console.error);
  }, [navigate]);

  // Quill config
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  }), []);
  const quillFormats = useMemo(() => [
    'header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link', 'image', 'clean'
  ], []);

  // Image helpers (kept lightweight)
  const resizeImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 200, 150);
            ctx.drawImage(img, 0, 0, 200, 150);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } catch (err) { reject(err); }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const insertImageViaDialog = () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.click();
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        resizeImageFile(file).then(dataUrl => {
          const editor = quillRef.current?.getEditor?.();
          if (!editor) return;
          const range = editor.getSelection(true);
          const index = range?.index ?? editor.getLength();
          editor.insertEmbed(index, 'image', dataUrl, 'user');
          editor.setSelection(index + 1, 0);
        }).catch(err => console.error(err));
      };
    } catch (err) { console.error(err); }
  };

  // Note CRUD handlers
  const handleAddOrUpdateSecretNote = (e) => {
    e.preventDefault();
    const kwArr = [
      ...keywords.split(',').map(k => k.trim()).filter(Boolean).filter(k => k.toLowerCase() !== 'secret'),
      'secret'
    ];
    let contentToSave = content;
    try {
      const editor = quillRef.current?.getEditor?.();
      if (editor?.root?.innerHTML) contentToSave = editor.root.innerHTML;
    } catch (err) {}

    const noteData = {
      title,
      content: contentToSave,
      keywords: kwArr
    };
    if (editMode && editingId) {
      // Update note
      fetch(`${apiBase}/api/notes/${editingId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(noteData)
      })
        .then(r => r.json())
        .then(() => {
          setEditMode(false);
          setEditingId(null);
          setTitle("");
          setContent("");
          setKeywords("");
          // Refetch notes
          fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
            .then(r => r.json())
            .then(allNotes => {
              if (!Array.isArray(allNotes)) {
                setSecretNotes([]);
                return;
              }
              setSecretNotes(allNotes.filter(isSecretNote));
            });
        });
    } else {
      // Add note
      fetch(`${apiBase}/api/notes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(noteData)
      })
        .then(r => r.json())
        .then(() => {
          setEditMode(false);
          setEditingId(null);
          setTitle("");
          setContent("");
          setKeywords("");
          // Refetch notes
          fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
            .then(r => r.json())
            .then(allNotes => {
              if (!Array.isArray(allNotes)) {
                setSecretNotes([]);
                return;
              }
              setSecretNotes(allNotes.filter(isSecretNote));
            });
        });
    }
  };

  const handleEdit = (note) => {
    setTitle(note.title);
    setContent(note.content);
    setKeywords((note.keywords || []).filter(k => k.toLowerCase() !== 'secret').join(', '));
    setEditMode(true);
    setEditingId(note._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this secret note?')) return;
    fetch(`${apiBase}/api/notes/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    })
      .then(() => {
        setEditMode(false);
        setEditingId(null);
        setTitle("");
        setContent("");
        setKeywords("");
        // Refetch notes
        fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
          .then(r => r.json())
          .then(allNotes => {
            if (!Array.isArray(allNotes)) {
              setSecretNotes([]);
              return;
            }
            setSecretNotes(allNotes.filter(isSecretNote));
          });
      });
  };

  // Tag list for filter (match Dashboard.js)
  const allTags = useMemo(() => Array.from(new Set(secretNotes.flatMap(n => (n.keywords || []).filter(k => k && k.toLowerCase() !== 'secret')))), [secretNotes]);

  // Filtering, sorting, and pagination (match Dashboard.js)
  const getFilteredSortedNotes = (noteList) => {
    let filtered = noteList;
    if (selectedTag) {
      filtered = filtered.filter(note => (note.keywords || []).includes(selectedTag));
    }
    filtered = filtered.slice().sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      if (sortOrder === "oldest") return dateA - dateB;
      return dateB - dateA;
    });
    return filtered;
  };

  const filteredNotes = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    let filtered = secretNotes;
    if (q) {
      filtered = filtered.filter(
        (note) =>
          (note.title || "").toLowerCase().includes(q) ||
          (note.content || "").toLowerCase().includes(q) ||
          ((note.keywords || []).some(k => (k || "").toLowerCase().includes(q)))
      );
    }
    return getFilteredSortedNotes(filtered);
  }, [secretNotes, searchQuery, selectedTag, sortOrder]);

  // Pinned notes to top before paginating
  const sortedNotes = [...filteredNotes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const totalPages = Math.max(1, Math.ceil(sortedNotes.length / NOTES_PER_PAGE));
  const paginatedNotes = sortedNotes.slice((page - 1) * NOTES_PER_PAGE, page * NOTES_PER_PAGE);

  // Pin/unpin for secret notes
  const togglePin = (id) => {
    setSecretNotes(notes => notes.map(n => n._id === id ? { ...n, pinned: !n.pinned } : n));
  };

  // Remove keyword from a note
  const handleRemoveKeyword = (noteId, kw) => {
    if (!window.confirm(`Remove keyword "${kw}" from this note?`)) return;
    setSecretNotes(notes => notes.map(n => n._id === noteId ? { ...n, keywords: (n.keywords || []).filter(k => k.toLowerCase() !== kw.toLowerCase() && k.toLowerCase() !== 'secret').concat('secret') } : n));
  };

  return (
    <>
      <div className="dashboard-main">
        <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 220 }}>
              <button
                className="logout-btn"
                style={{ background: 'none', border: 'none', fontSize: 38, cursor: 'pointer', padding: '0 2px 0 0', color: '#1C6EA4', boxShadow: 'none', marginLeft: -20, marginRight: 6 }}
              onClick={() => navigate('/dashboard')}
              aria-label="Back"
            >
              &#8592;
            </button>
            <span style={{ fontWeight: 900, fontSize: 28, color: '#ff4081', letterSpacing: 1, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>NoteSphere</span>
          </div>
          <div className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <button
              className="menu-btn"
              style={{ background: 'none', border: 'none', fontSize: 38, cursor: 'pointer', marginRight: 8, lineHeight: 1 }}
              onClick={() => setShowMenu(m => !m)}
              aria-label="Menu"
            >
              &#8942;
            </button>
            {showMenu && (
              <div style={{ position: 'absolute', top: 36, right: 60, background: '#fff', border: '1px solid #ccc', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10 }}>
                <button
                  style={{ padding: '8px 16px', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => { setShowChangePassModal(true); setShowMenu(false); }}
                >Change Password</button>
              </div>
            )}
            {/* Back button moved before logo */}
          </div>
        </header>

        <div className="welcome-text">Secret Notes Dashboard</div>
        {/* Change Password button moved to header */}

        <div className="content">
          <div className="search-filter-row" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div className="search-box" style={{ flex: 1, border: '2px solid #1C6EA4' }}>
              <input type="text" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flex: 1 }}>
              <select className="dashboard-select" value={selectedTag} style={{ flex: 1, border: '2px solid #1C6EA4' }} onChange={e => setSelectedTag(e.target.value)}>
                <option value="">All Tags</option>
                {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <select className="dashboard-sort" value={sortOrder} style={{ flex: 1, border: '2px solid #1C6EA4' }} onChange={e => setSortOrder(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>

          {/* Filter and sort logic from Dashboard.js */}
          {(() => {
            // Filter notes by selected tag
            let filtered = secretNotes;
            if (selectedTag) {
              filtered = filtered.filter(note => (note.keywords || []).includes(selectedTag));
            }
            // Search query filter
            const q = (searchQuery || "").trim().toLowerCase();
            if (q) {
              filtered = filtered.filter(
                (note) =>
                  (note.title || "").toLowerCase().includes(q) ||
                  (note.content || "").replace(/<[^>]+>/g, " ").toLowerCase().includes(q) ||
                  ((note.keywords || []).some(k => (k || "").toLowerCase().includes(q)))
              );
            }
            // Sort by pinned, then by date
            filtered = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
            filtered = filtered.slice().sort((a, b) => {
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              if (sortOrder === "oldest") return dateA - dateB;
              return dateB - dateA;
            });
            // Pagination
            const totalPages = Math.max(1, Math.ceil(filtered.length / NOTES_PER_PAGE));
            const paginatedNotes = filtered.slice((page - 1) * NOTES_PER_PAGE, page * NOTES_PER_PAGE);

            return (
              <>
                <p style={{ color: 'var(--muted)', marginTop: 12 }}>Total Secret Notes: {filtered.length}</p>
                <h3 className="dashboard-header-gradient" style={{ color: '#1C6EA4', marginLeft: '5px' }}>Recent Secret Notes</h3>
                <div className="recent-notes note-grid" style={{ position: 'relative' }}>
                  {paginatedNotes.length === 0 ? <p>No secret notes found.</p> : paginatedNotes.map(note => (
                    <div
                      key={note._id}
                      className={`note-card${note.pinned ? ' pinned' : ''}`}
                      tabIndex={0}
                      style={{ position: 'relative' }}
                      onDoubleClick={() => handleEdit(note)}
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
                      {/* Only show keywords and note text, not 'secret' or the note title if it's 'secret' */}
                      {note.title && note.title.toLowerCase() !== 'secret' && (
                        <h4 dangerouslySetInnerHTML={{ __html: highlightText(note.title, searchQuery) }} />
                      )}
                      {note.keywords?.filter(k => k.toLowerCase() !== 'secret').length > 0 && (
                        <div className="note-keywords" style={{ marginBottom: 6 }}>
                          {note.keywords.filter(k => k.toLowerCase() !== 'secret').map((k, i) => <span key={i} className="keyword">{k}</span>)}
                        </div>
                      )}
                      <div className="note-content" dangerouslySetInnerHTML={{ __html: highlightHtmlContent(note.content || "", searchQuery) }} />
                      <div className="actions">
                        <button className="btn btn-edit" onClick={() => handleEdit(note)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => handleDelete(note._id)}>Delete</button>
                      </div>
                    </div>
                  ))}

                  {/* placeholders */}
                  {Array.from({ length: Math.max(0, 3 - paginatedNotes.length) }).map((_, i) => (
                    <div key={"recent-placeholder-" + i} className="note-placeholder" />
                  ))}
                  {filtered.length === 0 && <p>No secret notes yet. Add one!</p>}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                    <span style={{ color: 'var(--accent-dark)' }}>Page {page} of {totalPages}</span>
                    <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
                  </div>
                )}
              </>
            );
          })()}


          {/* Change Password Modal */}
          {showChangePassModal && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: 400, width: '100%' }}>
                <form onSubmit={handleChangePassword}>
                  <h3>Change Secret Dashboard Password</h3>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  {passError && <div style={{ color: 'red', marginBottom: 8 }}>{passError}</div>}
                  {successMsg && <div style={{ color: 'green', marginBottom: 8 }}>{successMsg}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" type="submit">Change</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowChangePassModal(false); setNewPassword(""); setConfirmPassword(""); setPassError(""); setSuccessMsg(""); }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Add/Edit Modal */}
          {(editMode || title || content || keywords) && (
            <div className="modal-overlay">
              <div
                className="modal"
                style={{
                  maxWidth: 540,
                  width: '100%',
                  background: 'linear-gradient(90deg, #fff 0%, #B2C6D5 100%)',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px rgba(25, 118, 210, 0.12)',
                  padding: '32px 24px',
                  border: '1.5px solid #b6e0fe',
                }}
              >
                <form onSubmit={handleAddOrUpdateSecretNote}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>{editMode ? "Edit Secret Note" : "Add Secret Note"}</h3>
                    {editMode && (
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
                                const noteTitle = title || 'SecretNote';
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
                    )}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title"
                    style={{ width: '100%', marginBottom: 8 }}
                    required
                  />
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    className="note-quill"
                    modules={quillModules}
                    formats={quillFormats}
                    value={content}
                    onChange={setContent}
                    style={{ marginBottom: 8, minHeight: 120 }}
                  />

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

                  <input
                    type="text"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="Keywords (comma separated)"
                    style={{ width: '100%', marginBottom: 8 }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" type="submit">{editMode ? "Update" : "Add"}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { setEditMode(false); setEditingId(null); setTitle(""); setContent(""); setKeywords(""); }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Floating Add Button always visible, never blinks */}
      <button
        className="fab"
        title="Add Secret Note"
        onClick={() => {
          setEditMode(true);
          setEditingId(null);
          setTitle("");
          setContent("");
          setKeywords("");
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >+
      </button>
    </>
  );
}
