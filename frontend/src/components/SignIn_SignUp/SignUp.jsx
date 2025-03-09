import './Auth.css';
import React, { useState } from 'react';
import { auth } from '../../../firebase.config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import bg from '../../assets/bg.png';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try { 
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Sign up successfully');
      navigate('/home');
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image-container">
        <img src={bg} className="auth-image" alt="background" />
      </div>

      <div className="auth-form-container">
        <h1 className="auth-title">Create Account</h1>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="auth-subtext">Join us today! Enter your details below.</p>

          <div className="w-full flex flex-col">
            <input 
              type="email" 
              placeholder="Email" 
              className="auth-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />

            <input 
              type="password"
              placeholder="Password"
              className="auth-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />

            <input 
              type="password"
              placeholder="Re-enter Password"
              className="auth-input" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />

            {error && <p className="auth-error">{error}</p>}
          </div>

          <div className="auth-button-container">
            <button type="submit" className="auth-button">Sign Up</button>
          </div>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Already have an account? <a href="/signin" className="auth-link">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
