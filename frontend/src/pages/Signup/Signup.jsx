import React, { useState } from "react";
import "../Auth/AuthUnified.css";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate(); 

  const validateForm = () => {
    const { name, email, password } = formData;

    if (!name || name.length < 3) {
      alert("Name must be at least 3 characters long");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return false;
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (!password || password.length < 6 || !passwordRegex.test(password)) {
      alert("Password must be at least 6 characters and include a number & special character");
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
        alert(result.message || "Signup successful!");
        setFormData({ name: "", email: "", password: "" });
        localStorage.setItem("token", result.token);
        setTimeout(() => navigate("/login"), 1000);
      } else {
        alert(result.message || "Signup failed!");
      }
    } catch (error) {
      console.error("Error:", error);
  alert("Error connecting to backend!");
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Welcome!</h2>
          <p>Already have an account?</p>
          <button className="auth-register-btn" onClick={() => navigate('/login')}>Login</button>
        </div>
      </div>
      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Sign Up</h1>
          {}
          <input
            type="text"
            placeholder="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Sign Up</button>
          {/* message now shown above */}
        </form>
      </div>
    </div>
  );
}

export default Signup;
