const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Note = require("../models/Note");

// GET all notes for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ date: -1 });
    res.json(notes);
  } catch (err) {
    console.error("Error fetching notes:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// POST create a new note
router.post("/", auth, async (req, res) => {
  const { title, content, keywords } = req.body;
  try {
    const newNote = new Note({ user: req.user.id, title, content, keywords: Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map(k=>k.trim()).filter(Boolean) : []) });
    const note = await newNote.save();
    res.json(note);
  } catch (err) {
    console.error("Error creating note:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// PUT update a note
router.put("/:id", auth, async (req, res) => {
  const { title, content, keywords } = req.body;
  try {
    let note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    if (note.user.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

    note.title = title;
    note.content = content;
    if (typeof keywords !== 'undefined') {
      note.keywords = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map(k=>k.trim()).filter(Boolean) : []);
    }
    note = await note.save();
    res.json(note);
  } catch (err) {
    console.error("Error updating note:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE a note
router.delete("/:id", auth, async (req, res) => {
  try {
 const note = await Note.findById(req.params.id);
if (!note) return res.status(404).json({ message: "Note not found" });
if (note.user.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

await Note.deleteOne({ _id: req.params.id });
res.json({ message: "Note removed" });

  } catch (err) {
    console.error("Error deleting note:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
