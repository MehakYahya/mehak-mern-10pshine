import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiBase, authHeaders } from "../../utils/api";
import "./Note.css";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const navigate = useNavigate();


  // Fetch notes (default: not archived)
  useEffect(() => {
    fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { navigate("/login"); throw new Error("Unauthorized"); }
        return r.json();
      })
      .then(setNotes)
      .catch(console.error);
  }, [navigate]);

  // Fetch archived notes
  const [showArchived, setShowArchived] = useState(false);
  const fetchArchived = () => {
    fetch(`${apiBase}/api/notes/archived`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setNotes)
      .catch(console.error);
  };

  // Pin/unpin note
  const togglePin = async (id) => {
    await fetch(`${apiBase}/api/notes/${id}/pin`, { method: "PATCH", headers: authHeaders() });
    if (showArchived) fetchArchived();
    else {
      fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
        .then(r => r.json())
        .then(setNotes);
    }
  };

  // Archive/unarchive note
  const toggleArchive = async (id) => {
    await fetch(`${apiBase}/api/notes/${id}/archive`, { method: "PATCH", headers: authHeaders() });
    if (showArchived) fetchArchived();
    else {
      fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
        .then(r => r.json())
        .then(setNotes);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await fetch(`${apiBase}/api/notes/${id}`, { method: "DELETE", headers: authHeaders() });
    // Use functional update to avoid stale closure issues
    setNotes(prev => prev.filter(n => n._id !== id));
  };

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>{showArchived ? "Archived Notes" : "Your Notes"}</h1>
        <Link to="/notes/new">New Note</Link>
        <button style={{ marginLeft: 12 }} onClick={() => {
          setShowArchived(a => !a);
          setNotes([]);
          setTimeout(() => {
            if (!showArchived) fetchArchived();
            else {
              fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
                .then(r => r.json())
                .then(setNotes);
            }
          }, 0);
        }}>{showArchived ? "Show Active" : "Show Archived"}</button>
      </div>
      <ul>
        {notes.map(note => (
          <li key={note._id} style={{ background: note.pinned ? '#fffbe6' : undefined, opacity: note.archived ? 0.6 : 1 }}>
            <h3 dangerouslySetInnerHTML={{ __html: note.title }} />
            <div
              className="note-content"
              dangerouslySetInnerHTML={{
                __html: (note.content || '').replace(/(<img[^>]*)(style="[^"]*")([^>]*>)/gi, (match, p1, p2, p3) => {
                  // Remove width/height from style attribute
                  let newStyle = p2.replace(/\b(width|height)\s*:\s*[^;]+;?/gi, '');
                  // If style is now empty, remove it entirely
                  if (/^style="\s*"$/.test(newStyle)) newStyle = '';
                  return p1 + newStyle + p3;
                })
              }}
            />
            <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
              <button onClick={() => togglePin(note._id)}>{note.pinned ? "Unpin" : "Pin"}</button>
              <button onClick={() => toggleArchive(note._id)}>{note.archived ? "Unarchive" : "Archive"}</button>
              <Link to={`/notes/${note._id}/edit`}>Edit</Link>
              <button onClick={() => remove(note._id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
