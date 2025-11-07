const mongoose = require("mongoose");


const NoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  keywords: [String],
  date: { type: Date, default: Date.now },
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false }
});

module.exports = mongoose.model("Note", NoteSchema);
