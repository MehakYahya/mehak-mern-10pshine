import React, { useState } from "react";
import "./Signup.css";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState(""); 
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate(); // ✅ Initialize navigate

  const validateForm = () => {
    const { name, email, password } = formData;

    if (!name || name.length < 3) {
      setMessage("Name must be at least 3 characters long");
      setIsError(true);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      setIsError(true);
      return false;
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!password || password.length < 6 || !passwordRegex.test(password)) {
      setMessage("Password must be at least 6 characters and include a number & special character");
      setIsError(true);
      return false;
    }

    return true;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setIsError(false);
        setFormData({ name: "", email: "", password: "" });
        localStorage.setItem("token", result.token);
         setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(result.message || "Signup failed!");
        setIsError(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error connecting to backend!");
      setIsError(true);
    }
  };

  return (
    <div className="signup-container">
      <h2 className="signup-title">Signup</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Enter your name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Enter your email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Enter your password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Sign Up</button>
      </form>

      {message && (
        <p className={`signup-message ${isError ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <p className="login-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default Signup;
