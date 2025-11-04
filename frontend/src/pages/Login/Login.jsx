
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showForgot, setShowForgot] = React.useState(false);
  const [forgotEmail, setForgotEmail] = React.useState("");
  const [showReset, setShowReset] = React.useState(false);
  const [resetCode, setResetCode] = React.useState("");
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetConfirm, setResetConfirm] = React.useState("");
  const [resetLoading, setResetLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (response.ok) {
        alert("Login successful!");
        localStorage.setItem("token", result.token);
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        alert(result.message || "Invalid credentials");
      }
    } catch (error) {
  alert("Server connection failed!");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
  // removed forgotMsg and forgotError
    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || "Password reset link sent!");
        setShowReset(true);
      } else {
        alert(result.message || "Failed to send reset link");
      }
    } catch (error) {
  alert("Server connection failed!");
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
  // removed resetMsg and resetError
    if (resetPassword !== resetConfirm) {
      alert("Passwords do not match");
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword: resetPassword }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || "Password reset successful. Redirecting to login...");
        setTimeout(() => {
          setShowReset(false);
          setShowForgot(false);
        }, 1500);
      } else {
        alert(result.message || "Failed to reset password");
      }
    } catch (error) {
  alert("Server connection failed!");
    }
    setResetLoading(false);
  };

  return (
    <div className="auth-form-wrapper">
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Hello, Welcome!</h2>
          <p>Don't have an account?</p>
          <button className="auth-register-btn" onClick={() => navigate('/signup')}>Register</button>
        </div>
      </div>
      <div className="auth-right">
        {!showForgot && !showReset && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <h1>Login</h1>
            <input
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
            <div className="auth-forgot" style={{marginTop: '10px'}}>
              <button type="button" style={{background: 'none', border: 'none', color: '#2979ff', cursor: 'pointer', padding: 0}} onClick={() => setShowForgot(true)}>
                Forgot Password?
              </button>
            </div>
            {/* message removed, now using alert() */}
          </form>
        )}
        {showForgot && !showReset && (
          <form className="auth-form" onSubmit={handleForgot}>
            <h1>Forgot Password</h1>
            {/* forgotMsg removed, now using alert() */}
            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
            <button type="submit">Send Reset Link</button>
            {/* forgotMsg now shown above */}
            <div className="auth-forgot">
              <button type="button" style={{background: 'none', border: 'none', color: '#2979ff', cursor: 'pointer', padding: 0}} onClick={() => setShowForgot(false)}>
                Back to Login
              </button>
            </div>
          </form>
        )}
        {showReset && (
          <form className="auth-form" onSubmit={handleReset}>
            <h1>Reset Password</h1>
            {/* resetMsg removed, now using alert() */}
            <input
              type="text"
              placeholder="Enter code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              required
            />
            <button type="submit" disabled={resetLoading}>Reset Password</button>
            {/* resetMsg now shown above */}
            <div className="auth-forgot">
              <button type="button" style={{background: 'none', border: 'none', color: '#2979ff', cursor: 'pointer', padding: 0}} onClick={() => { setShowReset(false); setShowForgot(false); }}>
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
