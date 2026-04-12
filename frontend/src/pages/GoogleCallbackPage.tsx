/**
 * Google OAuth2 callback page.
 * This page is loaded inside the popup window after Google redirects back.
 * The parent window polls popup.location.href to extract the access token from the hash.
 * No rendering needed — this page just needs to exist so the cross-origin check doesn't block it.
 */
export default function GoogleCallbackPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      gap: '10px',
    }}>
      <svg style={{ animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
        <path style={{ opacity: 0.75 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Completing sign-in...
    </div>
  );
}
