import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const links = [
    { to: '/', label: 'Home' },
    { to: '/register', label: 'Get covered' },
    session?.type === 'worker'
      ? { to: '/profile', label: 'My cover' }
      : session?.type === 'admin'
        ? { to: '/admin', label: 'Portfolio' }
        : null,
    session?.type === 'worker' ? { to: '/cash-payout', label: 'Cash payout' } : null,
  ].filter(Boolean);

  const sessionLabel =
    session?.type === 'admin' ? 'Team access' : session?.worker?.name || 'Worker access';

  return (
    <div className="ek-topbar-shell">
      <header className="ek-topbar">
        <button type="button" className="ek-brand" onClick={() => navigate('/')}>
          <span className="ek-brand-mark">
            <Shield size={18} />
          </span>
          <span className="ek-brand-copy">
            <strong>EasyKavach</strong>
            <small>Income protection when a delivery shift is disrupted</small>
          </span>
        </button>

        <nav className="ek-nav" aria-label="Primary navigation">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`ek-nav-link ${location.pathname === link.to ? 'is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ek-topbar-actions">
          {session ? (
            <>
              <span className="ek-session-chip">{sessionLabel}</span>
              <button
                type="button"
                className="ek-button ek-button--ghost"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <Link className="ek-button ek-button--primary" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}
