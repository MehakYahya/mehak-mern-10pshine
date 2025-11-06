import React, { useState } from "react";
import "./Login.css";
import { Link, useNavigate } from "react-router-dom"; // ✅ added useNavigate

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
    const navigate = useNavigate(); // ✅ initialize navigate here


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("Login successful!");
        setIsError(false);
        localStorage.setItem("token", result.token);
setTimeout(() => navigate("/dashboard"), 2000);     
 } else {
        setMessage(result.message || "Invalid credentials");
        setIsError(true);
      }
    } catch (error) {
      setMessage("Server connection failed!");
      setIsError(true);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>

      {message && (
        <p className={`login-message ${isError ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <div className="login-links">
        <div className="forgot-right">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <div className="signup-center">
          Don’t have an account? <Link to="/signup">Signup</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
