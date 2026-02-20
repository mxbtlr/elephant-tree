import React, { useState } from 'react';
import api from '../services/supabaseApi';
import './SetPasswordForm.css';

function SetPasswordForm({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.updatePassword(password);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname || '/');
      }
      onDone();
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        <h1>TreeFlow</h1>
        <h2 className="set-password-title">Set new password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="form-input"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="form-input"
            required
            minLength={6}
            autoComplete="new-password"
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span><span className="spinner"></span> Updating…</span> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetPasswordForm;
