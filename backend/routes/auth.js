const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("../utils/emailService");
console.log("Imported User model:", User);

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required!" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters!" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, name: user.name }, "your_secret_key", { expiresIn: "1h" });
    res.status(201).json({ message: "User registered successfully!", token, name: user.name });
  } catch (error) {
    console.error('🔥 Signup error details:', error.message);
    console.error('🔥 Stack trace:', error.stack);
    res.status(500).json({ message: error.message || "Something went wrong!" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required!" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password!" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password!" });

    const token = jwt.sign({ id: user._id, name: user.name }, "your_secret_key", { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful!", token, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// In-memory store for reset codes (for dev/demo only)
const resetCodes = {};

// Forgot Password (code-based)
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: "Email is required!" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store code with user id (expires in 15 min)
    resetCodes[user._id] = { code, expires: Date.now() + 15 * 60 * 1000 };

    // For dev: return code in response (in prod, send via email)
    res.status(200).json({
      message: "Password reset code has been generated.",
      code,
      info: "Use this code to reset your password. Code expires in 15 minutes."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password (code-based)
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    if (!email || !code || !newPassword)
      return res.status(400).json({ message: "Email, code, and new password are required!" });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters!" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const stored = resetCodes[user._id];
    if (!stored || stored.code !== code)
      return res.status(400).json({ message: "Invalid or expired code!" });
    if (Date.now() > stored.expires)
      return res.status(400).json({ message: "Code has expired!" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Remove code after use
    delete resetCodes[user._id];

    res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


