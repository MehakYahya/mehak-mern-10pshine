
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiBase, authHeaders } from "../../utils/api";
import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';
import './NoteEditor.css';

// Pin/archive logic for editing a note (UI at bottom)
export function PinArchiveControls({ noteId, pinned, archived, onStatusChange }) {
  const [pin, setPin] = useState(pinned);
  const [archive, setArchive] = useState(archived);
  useEffect(() => { setPin(pinned); setArchive(archived); }, [pinned, archived]);

  const togglePin = async () => {
    await fetch(`${apiBase}/api/notes/${noteId}/pin`, { method: "PATCH", headers: authHeaders() });
    setPin(p => !p);
    onStatusChange && onStatusChange();
  };
  const toggleArchive = async () => {
    await fetch(`${apiBase}/api/notes/${noteId}/archive`, { method: "PATCH", headers: authHeaders() });
    setArchive(a => !a);
    onStatusChange && onStatusChange();
  };
  return (
    <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
      <button type="button" onClick={togglePin}>{pin ? "Unpin" : "Pin"}</button>
      <button type="button" onClick={toggleArchive}>{archive ? "Unarchive" : "Archive"}</button>
    </div>
  );
}

export default function NoteEditor() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [selection, setSelection] = useState(null);
  const [selFormats, setSelFormats] = useState({});
  const navigate = useNavigate();
  const { id } = useParams(); // if editing
  const quillRef = useRef(null);

  // --- Quill Modules ---
  const quillModules = useMemo(() => {
    const toolbarOptions = [
      [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link'],
      ['clean'],
      [{ 'list': false, 'exitList': 'paragraph' }]
    ];

    return { toolbar: { container: toolbarOptions } };
  }, []);

  const quillFormats = useMemo(() => [
    'font','size','header','bold','italic','underline','strike','blockquote','code-block',
    'script','list','bullet','indent','direction','color','background','align','link','image'
  ], []);

  const QuillComp = ReactQuill;

  // --- Normalize all images in the editor ---
  const normalizeImages = () => {
    try {
      const editor = quillRef.current?.getEditor?.();
      if (!editor?.root) return;
      const imgs = editor.root.querySelectorAll('img');
      if (!imgs.length) return;

      const seen = new Set();
      imgs.forEach(img => {
        const src = img.getAttribute('src') || '';
        if (!src) return;

        if (seen.has(src)) {
          img.parentNode?.removeChild(img);
          return;
        }
        seen.add(src);

        img.style.width = '200px';
        img.style.height = '150px';
        img.style.maxWidth = '200px';
        img.style.maxHeight = '150px';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.margin = '15px auto';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      });
    } catch (err) {
      console.error('normalizeImages failed', err);
    }
  };

  // --- Insert image via dialog ---
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
          setTimeout(() => normalizeImages(), 0);
        }).catch(err => console.error(err));
      };
    } catch (err) { console.error(err); }
  };

  // --- Resize image to 200x150 ---
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

  // --- Load note if editing ---
  useEffect(() => {
    if (!id) return;
    fetch(`${apiBase}/api/notes/${id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setTitle(data.title || "");
        setContent(data.content || "");
      })
      .catch(console.error);
  }, [id]);

  // --- Editor ready detection ---
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const editor = quillRef.current?.getEditor?.();
        if (editor) setEditorReady(true);
      } catch (e) { console.warn(e); }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // --- Save note ---
  const handleSave = async () => {
    setLoading(true);
    let contentToSave = content;
    try {
      const editor = quillRef.current?.getEditor?.();
      if (editor?.root?.innerHTML) contentToSave = editor.root.innerHTML;
    } catch (err) { console.warn(err); }

    const body = JSON.stringify({ title, content: contentToSave });
    const url = id ? `${apiBase}/api/notes/${id}` : `${apiBase}/api/notes`;
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: authHeaders(), body });
      if (!res.ok) throw new Error("Save failed");
      navigate("/notes");
    } catch (err) { console.error(err); alert("Save failed"); }
    finally { setLoading(false); }
  };

  // --- Handle editor changes ---
  const handleEditorChange = (val, delta, source, editor) => {
    setContent(val);
    try {
      const sel = editor.getSelection?.();
      setSelection(sel ?? null);
      setSelFormats(editor.getFormat?.(sel?.index ?? 0));
      normalizeImages(); // auto-resize all images
    } catch (e) {}
  };

  return (
    <div className="note-editor">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={insertImageViaDialog} style={{ padding: '6px 12px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Insert Image</button>
      </div>
      <QuillComp
        ref={quillRef}
        theme="snow"
        className="note-quill"
        modules={quillModules}
        formats={quillFormats}
        value={content}
        editorProps={{
          spellCheck: false,
          autoCorrect: 'off',
          autoCapitalize: 'off',
          'data-gramm': 'false'
        }}
        onChange={handleEditorChange}
        onChangeSelection={(range) => setSelection(range ?? null)}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
        <button type="button" onClick={insertImageViaDialog} style={{ marginLeft: 8 }}>Insert Image</button>
        <button type="button" onClick={normalizeImages} style={{ marginLeft: 8 }}>Fix Images</button>
      </div>

      <div style={{ marginTop: 12, padding: 8, border: '1px solid #eee', background: '#fafafa' }}>
        <div><strong>Editor ready:</strong> {editorReady ? 'yes' : 'no'}</div>
        <div><strong>Selection:</strong> {selection ? JSON.stringify(selection) : 'none'}</div>
        <div><strong>Formats at selection:</strong> {selFormats ? JSON.stringify(selFormats) : '{}'}</div>
      </div>
    </div>
  );
}
