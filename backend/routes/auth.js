
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendPasswordResetEmail, sendPasswordResetCodeEmail } = require("../utils/emailService");
const logger = require("../utils/logger");
logger.info("Imported User model: " + (User && User.modelName));

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      logger.info("Signup failed: missing fields");
      return res.status(400).json({ message: "All fields are required!" });
    }

    if (password.length < 6) {
      logger.info("Signup failed: password too short for " + email);
      return res.status(400).json({ message: "Password must be at least 6 characters!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.info("Signup failed: user already exists for " + email);
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

  const token = jwt.sign({ id: user._id, name: user.name }, "your_secret_key", { expiresIn: "1h" });
  logger.info(`User registered: ${user.email}`);
  res.status(201).json({ message: "User registered successfully!", token, name: user.name });
  } catch (error) {
  logger.error('🔥 Signup error details: ' + error.message);
  logger.error('🔥 Stack trace: ' + error.stack);
    res.status(500).json({ message: error.message || "Something went wrong!" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      logger.info("Login failed: missing email or password");
      return res.status(400).json({ message: "Email and password required!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.info("Login failed: user not found for " + email);
      return res.status(400).json({ message: "Invalid email or password!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.info("Login failed: wrong password for " + email);
      return res.status(400).json({ message: "Invalid email or password!" });
    }

  const token = jwt.sign({ id: user._id, name: user.name }, "your_secret_key", { expiresIn: "1h" });
  logger.info(`User login: ${user.email}`);
  res.status(200).json({ message: "Login successful!", token, name: user.name });
  } catch (err) {
  logger.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// In-memory store for reset codes (for dev/demo only)
const resetCodes = {};

// Forgot Password (code-based)
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      logger.info("Forgot password failed: missing email");
      return res.status(400).json({ message: "Email is required!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.info("Forgot password failed: user not found for " + email);
      return res.status(404).json({ message: "User not found!" });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    // Store code with user id (expires in 15 min)
    resetCodes[user._id] = { code, expires: Date.now() + 15 * 60 * 1000 };

    // Send code via email
    try {
      const sendResult = await sendPasswordResetCodeEmail(email, code);
      logger.info(`Password reset code sent to: ${email}`);
      const responsePayload = {
        message: "Password reset code has been sent to your email.",
        info: "Check your inbox and spam folder. Code expires in 15 minutes."
      };
      // In test environment return the code so tests can assert reset flows
       if (process.env.NODE_ENV === 'test') {
          responsePayload.testCode = code;
        }
      res.status(200).json(responsePayload);
    } catch (emailError) {
  logger.error("Code email sending failed: " + emailError);
      // Fallback: do not return the code in production; return error for now
      res.status(500).json({ message: "Failed to send reset code email. Please try again later." });
    }
  } catch (err) {
  logger.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password (code-based)
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    if (!email || !code || !newPassword) {
      logger.info("Reset password failed: missing fields");
      return res.status(400).json({ message: "Email, code, and new password are required!" });
    }

    if (newPassword.length < 6) {
      logger.info("Reset password failed: password too short for " + email);
      return res.status(400).json({ message: "Password must be at least 6 characters!" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.info("Reset password failed: user not found for " + email);
      return res.status(404).json({ message: "User not found!" });
    }

    const stored = resetCodes[user._id];
    const submittedCode = String(code).trim();
    if (!stored) {
      logger.info("Reset password failed: invalid or expired code for " + email);
      return res.status(400).json({ message: "Invalid or expired code!" });
    }

    // Check expiration first
    if (Date.now() > stored.expires) {
      // remove expired code
      delete resetCodes[user._id];
      logger.info("Reset password failed: code expired for " + email);
      return res.status(400).json({ message: "Code has expired!" });
    }

    // initialize attempts counter if missing
    stored.attempts = stored.attempts || 0;

    // If too many failed attempts, invalidate the code
    if (stored.attempts >= 5) {
      delete resetCodes[user._id];
      logger.info("Reset password failed: too many invalid attempts for " + email);
      return res.status(429).json({ message: "Too many invalid attempts. Please request a new code." });
    }

    if (stored.code !== submittedCode) {
      stored.attempts += 1;
      logger.info("Reset password failed: wrong code for " + email);
      return res.status(400).json({ message: "Invalid or expired code!" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Remove code after use
    delete resetCodes[user._id];

  logger.info(`Password reset successful for: ${email}`);
  res.status(200).json({ message: "Password reset successful!" });
  } catch (err) {
  logger.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Update profile (requires Authorization header with Bearer token)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { name, email, password, profileImage } = req.body;
    const user = await User.findById(payload.id);
    if (!user) {
      logger.info('Profile update failed: user not found');
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (typeof profileImage !== 'undefined') user.profileImage = profileImage;
    if (password) {
      const hashed = bcrypt.hashSync(password, 10);
      user.password = hashed;
    }

    await user.save();

    // Return updated name, email, profileImage, and a new token
    const newToken = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1h' }
    );
    logger.info(`Profile updated for: ${user.email}`);
    res.status(200).json({
      message: 'Profile updated successfully!',
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      token: newToken
    });
  } catch (err) {
  logger.error('Profile update error: ' + err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get profile 
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, 'your_secret_key');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

  const user = await User.findById(payload.id).select('name email profileImage');
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.status(200).json({ name: user.name, email: user.email, profileImage: user.profileImage });
  } catch (err) {
  logger.error('Profile fetch error: ' + err);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
