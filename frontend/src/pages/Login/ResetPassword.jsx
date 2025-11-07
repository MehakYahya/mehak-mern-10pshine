import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import "./ResetPassword.css";

//ResetPassword
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [tokenState, setTokenState] = useState(searchParams.get("token") || null);

  const [email] = useState(location.state?.email || "");

  const [code, setCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (email && !tokenState) {
      setCodeMessage("Password reset code has been sent to your email.");
      setCodeError(false);
    }
 
  }, [email, tokenState]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async (e) => {
    e && e.preventDefault();
    setCodeMessage("");
    setCodeError(false);

    if (!email) {
      setCodeMessage("No email available. Please request a reset link again from Forgot Password.");
      setCodeError(true);
      return;
    }

    if (!code || code.trim().length < 4) {
      setCodeMessage("Please enter the verification code sent to your email.");
      setCodeError(true);
      return;
    }

    // Try local/dev verification first (sessionStorage) to make testing easier
    const savedCode = sessionStorage.getItem("resetCode");
    if (savedCode) {
      setCodeLoading(true);
      if (savedCode === code.trim()) {
        sessionStorage.removeItem("resetCode");
        setTokenState("verified");
        setCodeMessage("Code verified (dev). You can set a new password now.");
        setCodeError(false);
      } else {
        setCodeMessage("Code incorrect. Please check the code sent to your email.");
        setCodeError(true);
      }
      setCodeLoading(false);
      return;
    }

    // Fallback to server verification
    setCodeLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const token = data?.token;
        setTokenState(token || "verified");
        setCodeMessage(data.message || "Code verified. You can set a new password now.");
        setCodeError(false);
      } else {
        setCodeMessage(data.message || "Code incorrect. Please check the code sent to your email.");
        setCodeError(true);
      }
    } catch (err) {
      setCodeMessage("Unable to contact server. Try again later.");
      setCodeError(true);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsError(true);
      return;
    }

    if (!tokenState) {
      setMessage("Please verify the code first.");
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenState, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMessage(data.message || "Password reset successful. Redirecting to login...");
        setIsError(false);
        setTimeout(() => navigate("/login"), 1200);
      } else {
        setMessage(data.message || "Failed to reset password.");
        setIsError(true);
      }
    } catch (err) {
      setMessage("Unable to contact server. Try again later.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h2>Forgot Password</h2>

        {}
        {!tokenState && (
          <form onSubmit={handleVerifyCode}>
            <p>Enter the code and your new password.</p>
            {codeMessage && (
              <div className={`reset-message ${codeError ? "error" : "success"}`}>{codeMessage}</div>
            )}

            <div className="form-group">
              <label htmlFor="code">Code</label>
              <input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="reset-btn" disabled={codeLoading || loading}>
              {codeLoading || loading ? "Resetting..." : "Reset"}
            </button>

            <div className="links">
              <Link to="/login">Remember your password? Login</Link>
            </div>
          </form>
        )}

        {}
        {tokenState && (
          <form onSubmit={handleSubmit}>
            {message && (
              <div className={`reset-message ${isError ? "error" : "success"}`}>{message}</div>
            )}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="New password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="reset-btn" disabled={loading}>
              {loading ? "Resetting..." : "Reset"}
            </button>
            <div className="links">
              <Link to="/login">Remember your password? Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;