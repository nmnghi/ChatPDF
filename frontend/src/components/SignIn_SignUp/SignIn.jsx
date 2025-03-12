import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../firebase.config';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import bg from '../../assets/bg.png'
import './Auth.css';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successfully');
      navigate('/home');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image-container">
        <img src={bg} className="auth-image" alt="background" />
      </div>

      <div className="auth-form-container">
        <h1 className="auth-title">ChatPDF</h1>

        <form onSubmit={handleSubmit}>
          <div className="w-full flex flex-col mb-2">
            <p className="auth-subtext">Welcome back! Please enter your details</p>
          </div>

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
          </div>

          <div className="auth-button-container">
            <button type="submit" className="auth-button">Sign In</button>
          </div>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Don't have an account? <a href="/signup">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
