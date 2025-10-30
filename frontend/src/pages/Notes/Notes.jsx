
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiBase, authHeaders } from "../../utils/api";
import "./Note.css";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${apiBase}/api/notes`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { navigate("/login"); throw new Error("Unauthorized"); }
        return r.json();
      })
      .then(setNotes)
      .catch(console.error);
  }, [navigate]);


  const remove = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await fetch(`${apiBase}/api/notes/${id}`, { method: "DELETE", headers: authHeaders() });
    setNotes(prev => prev.filter(n => n._id !== id));
  };

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>Your Notes</h1>
        <Link to="/notes/new">New Note</Link>
      </div>
      <ul>
        {notes.map(note => (
          <li key={note._id}>
            <h3 dangerouslySetInnerHTML={{ __html: note.title }} />
            <div
              className="note-content"
              dangerouslySetInnerHTML={{
                __html: (note.content || '').replace(/(<img[^>]*)(style="[^"]*")([^>]*>)/gi, (match, p1, p2, p3) => {
                  let newStyle = p2.replace(/\b(width|height)\s*:\s*[^;]+;?/gi, '');
                  if (/^style="\s*"$/.test(newStyle)) newStyle = '';
                  return p1 + newStyle + p3;
                })
              }}
            />
            <Link to={`/notes/${note._id}/edit`}>Edit</Link>
            <button onClick={() => remove(note._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
