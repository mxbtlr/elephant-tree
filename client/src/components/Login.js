import React, { useState } from 'react';
import api from '../services/supabaseApi';
import './Login.css';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const result = await api.register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        
        // For self-hosted instances, wait a moment for profile creation
        if (result.user) {
          // Try to get user with profile, but don't wait forever
          const getUserPromise = (async () => {
            // Wait for profile to be created by trigger
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get user with profile after registration
            const userData = await api.getCurrentUser();
            if (userData) {
              return userData;
            }
            
            // Profile might not exist yet, try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryUserData = await api.getCurrentUser();
            return retryUserData;
          })();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          try {
            const userData = await Promise.race([getUserPromise, timeoutPromise]);
            if (userData) {
              onLogin(userData);
            } else {
              setError('Registration successful, but profile not created. Please try logging in.');
            }
          } catch (timeoutError) {
            // If timeout, still try to proceed with basic user
            if (result.user) {
              onLogin(result.user);
            } else {
              setError('Registration successful, but could not load profile. Please try logging in.');
            }
          }
        } else {
          setError('Registration failed. Please try again.');
        }
      } else {
        // Login with timeout wrapper
        const loginPromise = api.login({
          email: formData.email,
          password: formData.password
        });
        
        // Add a timeout for user feedback (longer to account for slow connections)
        const userTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Login is taking longer than expected. Please wait or check your connection.')), 120000)
        );
        
        try {
          const loginResult = await Promise.race([loginPromise, userTimeout]);
          
          if (loginResult && loginResult.user) {
            onLogin(loginResult.user);
          } else {
            setError('Login successful but could not load user data. Please refresh the page.');
            setLoading(false);
          }
        } catch (timeoutError) {
          // If timeout, show error but don't set loading to false yet
          // The actual login might still be processing
          if (timeoutError.message?.includes('timeout') || timeoutError.message?.includes('too long')) {
            setError('Login is taking longer than expected. Please wait or check your connection.');
            // Still wait for the actual login to complete
            try {
              const loginResult = await loginPromise;
              if (loginResult && loginResult.user) {
                onLogin(loginResult.user);
                return; // Success, exit early
              }
            } catch (actualError) {
              // Actual error from login
              throw actualError;
            }
          } else {
            throw timeoutError;
          }
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>TreeFlow</h1>
        <div className="auth-tabs">
          <button
            className={!isRegister ? 'active' : ''}
            onClick={() => setIsRegister(false)}
          >
            Login
          </button>
          <button
            className={isRegister ? 'active' : ''}
            onClick={() => setIsRegister(true)}
          >
            Register
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="form-input"
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
            minLength={6}
          />
          {isRegister && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="form-input"
              minLength={6}
            />
          )}
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span>
                <span className="spinner"></span> {isRegister ? 'Registering...' : 'Logging in...'}
              </span>
            ) : (
              isRegister ? 'Register' : 'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;




