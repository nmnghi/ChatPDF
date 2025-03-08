import './Auth.css';
import React, { useState } from 'react';
import { auth } from '../firebase.config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { 
      await createUserWithEmailAndPassword(auth, email, password);
        alert('Sign up successfully');
        navigate('/home');
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Let's get you started</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
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
        <button type="submit">Sign Up</button>
      </form>
      <p>Have an account? <a href="/">Sign In</a></p>
    </div>
  );
};

export default SignUp; 