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

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: "Email is required!" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found!" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "your_secret_key", { expiresIn: "15m" });
    
    // Send email with reset link
    try {
      await sendPasswordResetEmail(email, resetToken);
      res.status(200).json({ 
        message: "Password reset link has been sent to your email!",
        info: "Check your inbox and spam folder"
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      res.status(200).json({ 
        message: "Email service unavailable. Here's your reset token for testing:", 
        resetToken,
        info: "Configure EMAIL_USER and EMAIL_PASS in .env to enable email"
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword } = req.body;
  try {
    if (!resetToken || !newPassword)
      return res.status(400).json({ message: "Reset token and new password are required!" });

    if (newPassword.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters!" });

    const decoded = jwt.verify(resetToken, "your_secret_key");
    
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found!" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired!" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid reset token!" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;


