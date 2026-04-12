import { useEffect, useState } from 'react';
import { getToken, getUser } from '../lib/storage';
import { User } from '../lib/types';
import Login from './Login';
import Dashboard from './Dashboard';

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([getToken(), getUser()]).then(([t, u]) => {
      setToken(t ?? null);
      setUser(u ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return token && user ? (
    <Dashboard
      user={user}
      onLogout={() => { setToken(null); setUser(null); }}
    />
  ) : (
    <Login
      onLogin={(t: string, u: User) => { setToken(t); setUser(u); }}
    />
  );
}
