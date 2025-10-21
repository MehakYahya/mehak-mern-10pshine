const nodemailer = require("nodemailer");

// Create transporter for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail App Password (NOT regular password)
  },
});

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request - 10pShine Notes App",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi there,</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br>
          <a href="${resetLink}" style="color: #4CAF50;">${resetLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          <strong>This link will expire in 15 minutes.</strong>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          © 2025 10pShine Notes App. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Failed to send email");
  }
};

module.exports = { sendPasswordResetEmail };
