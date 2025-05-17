import React, { useState } from "react";
import { supabase } from "../client";
import { Link } from "react-router-dom";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  async function handleSubmit(event) {
    // Prevent default form submission behavior
    event.preventDefault();

    try {
      // Keep both data and error, ignore the linting warning
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // You can use data here if needed
      console.log("Signup successful:", data);
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
