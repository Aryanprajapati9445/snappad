import React, { useState } from 'react';
import { api } from '../lib/api';
import { setToken, setUser, setRefreshToken } from '../lib/storage';

import { User } from '../lib/types';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ user: User; accessToken: string; refreshToken?: string }>('/auth/login', { email, password });
      const token = res.data?.accessToken;
      const user = res.data!.user;
      const refresh = res.data?.refreshToken;

      if (!token) throw new Error('No token received');

      await Promise.all([setToken(token), setUser(user), refresh ? setRefreshToken(refresh) : Promise.resolve()]);
      onLogin(token, user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
      {/* Header */}
      <div className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="popup-logo-text">Snappad</span>
        </div>
      </div>

      {/* Body */}
      <div className="popup-body" style={{ justifyContent: 'center', gap: '16px', padding: '24px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome back</p>
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>Sign in to save content to your vault</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}



        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: '8px' }}>
          Don't have an account? Open the{' '}
          <a
            href="http://localhost:5173/register"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#a5b4fc', textDecoration: 'none' }}
          >
            web app
          </a>{' '}
          to register.
        </p>
      </div>
    </div>
  );
}
