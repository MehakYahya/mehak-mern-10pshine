const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require('dotenv').config();
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/notesapp")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

app.use("/api/auth", authRoutes);

// Test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
