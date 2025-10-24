import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";

// ForgotPassword
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    if (!email) {
      setMessage("Email is required!");
      setIsError(true);
      return;
    }
    setLoading(true);
    try {
      const clientCode = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem("resetCode", clientCode);
      console.log(`DEV: Generated reset code for ${email}: ${clientCode}`);

      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: clientCode }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || "Password reset code has been sent to your email.");
        setStep(2);
        setIsError(false);
      } else {
        setMessage(data.message || "Failed to send code");
        setIsError(true);
      }
    } catch {
      setMessage("Something went wrong! Please try again.");
      setIsError(true);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    if (!code || !newPassword) {
      setMessage("Code and new password are required!");
      setIsError(true);
      return;
    }
    setLoading(true);
    const savedCode = sessionStorage.getItem("resetCode");
    if (savedCode) {
      if (savedCode !== code) {
        setMessage("Code incorrect. Please check the code sent to your email.");
        setIsError(true);
        setLoading(false);
        return;
      }
      
      sessionStorage.removeItem("resetCode");
      setMessage("Password reset successful (dev). You can now log in.");
      setIsError(false);
      setStep(3);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || "Password reset successful!");
        setIsError(false);
        setStep(3);
      } else {
        setMessage(data.message || "Reset failed");
        setIsError(true);
      }
    } catch {
      setMessage("Something went wrong! Please try again.");
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div className="forgot-password-container">
      <h2>Forgot Password</h2>

      {step === 1 && (
        <>
          <p>Enter your email to receive a reset code.</p>
          <form onSubmit={handleSendCode}>
            <label htmlFor="fp-email" className="sr-only">Email</label>
            <input id="fp-email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" disabled={loading} className="forgot-btn">{loading ? "Sending..." : "Send"}</button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <p>Enter the code and your new password.</p>
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="reset-code">Code</label>
              <input
                id="reset-code"
                name="resetCode"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">Password</label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="forgot-btn">
              {loading ? "Resetting..." : "Reset"}
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="success">
          <p>{message}</p>
          <Link to="/login">Back to Login</Link>
        </div>
      )}

      {message && step !== 3 && <div className={isError ? "error" : "success"}>{message}</div>}

      <p className="back-to-login-link">
        Remember your password? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
