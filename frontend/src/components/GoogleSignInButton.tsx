import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { ApiResponse, User } from '../types';

interface AuthData {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  label?: string;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// Extend Window to include the google GSI namespace
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              shape?: string;
              width?: number;
              text?: string;
              logo_alignment?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

/**
 * Loads the Google GSI script once and resolves when it's ready.
 * GSI (Google Sign-In for Web) uses postMessage — NO redirect URI needed.
 */
function loadGSI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ label = 'Continue with Google' }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;

    loadGSI().then(() => {
      window.google!.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        cancel_on_tap_outside: true,
      });
      setGsiReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gsiReady || !buttonRef.current) return;
    // Render the native Google-branded button (guaranteed to work, no redirect URI)
    window.google!.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      width: buttonRef.current.offsetWidth || 360,
      text: 'continue_with',
      logo_alignment: 'left',
    });
  }, [gsiReady]);

  const handleCredential = async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      // Send the Google ID token to the backend's /auth/google endpoint
      const res = await api.post<ApiResponse<AuthData>>('/auth/google', {
        credential: response.credential,
      });
      const data = res.data.data!;
      window.dispatchEvent(new CustomEvent('google-auth-success', { detail: data }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg);
      window.dispatchEvent(new CustomEvent('google-auth-error', { detail: msg }));
    } finally {
      setLoading(false);
    }
  };

  if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return null;
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Google renders its own button here via GSI — correct branding, no redirect URI */}
      <div
        ref={buttonRef}
        style={{
          width: '100%',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          overflow: 'hidden',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      />
      {/* Fallback hand-crafted button while GSI loads */}
      {!gsiReady && (
        <button
          type="button"
          disabled
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'not-allowed',
            opacity: 0.6,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Loading...
        </button>
      )}
      {error && (
        <p style={{ marginTop: '6px', fontSize: '12px', color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
