import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../lib/types';

interface ProfileProps {
  user: User;
  onBack: () => void;
}

export default function Profile({ user, onBack }: ProfileProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
      {/* Header */}
      <div className="popup-header">
        <button
          onClick={onBack}
          className="btn btn-ghost"
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>My Profile</span>
        <div style={{ width: 56 }} /> {/* spacer to center title */}
      </div>

      {/* Body */}
      <div className="popup-body" style={{ gap: '20px', padding: '20px 20px' }}>

        {/* Avatar + info card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '14px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
        }}>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Change password */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Change Password
          </p>

          {success && (
            <div className="alert alert-success" style={{ marginBottom: '12px', fontSize: '12px' }}>
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '12px', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Current Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ fontSize: '13px' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: '4px' }}
            >
              {loading ? <span className="spinner" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
