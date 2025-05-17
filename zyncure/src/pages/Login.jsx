import React, { useState } from "react";
import { supabase } from "../client";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Login({ setToken }) {
  let navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  async function handleSubmit(event) {
    // Prevent default form submission behavior
    event.preventDefault();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      
      // Set token using the provided setToken function
      setToken(data);
      
      // Redirect to the page they were trying to access, or to home if none
      const from = location.state?.from?.pathname || '/home';
      console.log("Login successful, redirecting to:", from);
      navigate(from);
    } catch (error) {
      alert(error.message || error);
    }
  }

  function handleChange(event) {
    const value = event.target.value;
    setFormData({ ...formData, [event.target.name]: value });
  }

  return (
    <>
      <div>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            name="email"
            onChange={handleChange}
            value={formData.email}
          />
          <input
            placeholder="Password"
            type="password"
            name="password"
            onChange={handleChange}
            value={formData.password}
          />

          <button type="submit">Submit</button>
        </form>
        Don't have an account?<Link to="/">Register</Link>
      </div>
    </>
  );
}