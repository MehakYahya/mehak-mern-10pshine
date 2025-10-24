const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendPasswordResetEmail, sendPasswordResetCodeEmail } = require("../utils/emailService");
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

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Store code with user id (expires in 15 min)
    resetCodes[user._id] = { code, expires: Date.now() + 15 * 60 * 1000 };

    // Send code via email
    try {
      await sendPasswordResetCodeEmail(email, code);
      res.status(200).json({
        message: "Password reset code has been sent to your email.",
        info: "Check your inbox and spam folder. Code expires in 15 minutes."
      });
    } catch (emailError) {
      console.error("Code email sending failed:", emailError);
      // Fallback: do not return the code in production; return error for now
      res.status(500).json({ message: "Failed to send reset code email. Please try again later." });
    }
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
    const submittedCode = String(code).trim();
    if (!stored) return res.status(400).json({ message: "Invalid or expired code!" });

    // Check expiration first
    if (Date.now() > stored.expires) {
      // remove expired code
      delete resetCodes[user._id];
      return res.status(400).json({ message: "Code has expired!" });
    }

    // initialize attempts counter if missing
    stored.attempts = stored.attempts || 0;

    // If too many failed attempts, invalidate the code
    if (stored.attempts >= 5) {
      delete resetCodes[user._id];
      return res.status(429).json({ message: "Too many invalid attempts. Please request a new code." });
    }

    if (stored.code !== submittedCode) {
      stored.attempts += 1;
      return res.status(400).json({ message: "Invalid or expired code!" });
    }

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


