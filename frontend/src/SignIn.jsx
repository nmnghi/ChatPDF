import './Auth.css';
import React, { useState } from 'react';
import { auth } from '../firebase.config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setShowPassword(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Đăng nhập thành công');
      navigate('/home');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome back to ChatPDF</h2>
      {!showPassword ? (
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Continue</button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
        </form>
      )}
      <p>Don't have an account? <a href="/signup">Sign Up</a></p>
    </div>
  );
};

export default SignIn;