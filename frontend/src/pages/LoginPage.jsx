import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MODES = {
  worker: {
    title: 'Worker sign in',
    subtitle: 'Use the phone number tied to your EasyKavach profile.',
    button: 'Open my cover',
  },
  team: {
    title: 'Team access',
    subtitle: 'Use the access code to open the team dashboard.',
    button: 'Open dashboard',
  },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWorker, loginAdmin, session } = useAuth();
  const [mode, setMode] = useState('worker');
  const [showTeamAccess, setShowTeamAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    adminCode: '',
  });

  useEffect(() => {
    if (session?.type === 'worker') {
      navigate('/profile', { replace: true });
    }

    if (session?.type === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, session]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'worker') {
        await loginWorker({ phone: formData.phone });
        navigate('/profile', { replace: true });
      } else {
        await loginAdmin(formData.adminCode);
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeMode = MODES[mode];

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-auth-layout">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">Sign in</span>
          <h1 className="ek-page-title">Sign in and get straight to your cover.</h1>
          <p className="ek-page-copy">
            Use your registered phone number to open your worker dashboard in one step.
          </p>

          <div className="ek-inline-list">
            <span>Phone number sign in</span>
            <span>Quick access</span>
            <span>Session stays on this device</span>
          </div>

          <div className="ek-summary-grid">
            <div className="ek-summary-card">
              <span className="ek-label">Personal dashboard</span>
              <strong>View your cover</strong>
              <p>Policy details, claims, payouts, and status stay together in one place.</p>
            </div>
            <div className="ek-summary-card">
              <span className="ek-label">Current status</span>
              <strong>See what is active</strong>
              <p>Check your zone, payout estimate, and recent activity at a glance.</p>
            </div>
          </div>
        </div>

        <div className="ek-auth-aside">
          <form className="ek-panel ek-form" onSubmit={handleSubmit}>
            <div className="ek-card-head">
              <span className="ek-status-pill">
                <ShieldCheck size={14} />
                {activeMode.title}
              </span>
              <span className="ek-inline-note">Secure access</span>
            </div>

            <p className="ek-form-note">{activeMode.subtitle}</p>

            {error ? <div className="ek-form-alert">{error}</div> : null}

            {mode === 'worker' ? (
              <label className="ek-field">
                <span className="ek-label">
                  <UserRound size={14} />
                  Phone number
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="+91 98765 43210"
                />
              </label>
            ) : (
              <label className="ek-field">
                <span className="ek-label">
                  <KeyRound size={14} />
                  Access code
                </span>
                <input
                  type="password"
                  value={formData.adminCode}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, adminCode: event.target.value }))
                  }
                  placeholder="Enter access code"
                />
              </label>
            )}

            <button
              type="submit"
              className="ek-button ek-button--primary ek-button--full"
              disabled={isLoading || (mode === 'worker' ? !formData.phone : !formData.adminCode)}
            >
              {isLoading ? <Loader2 size={16} className="clean-spin" /> : <ArrowRight size={16} />}
              {activeMode.button}
            </button>

            {showTeamAccess ? (
              <button
                type="button"
                className="ek-inline-toggle"
                onClick={() => setMode((current) => (current === 'worker' ? 'team' : 'worker'))}
              >
                {mode === 'worker' ? 'Use team access instead' : 'Back to worker sign in'}
              </button>
            ) : (
              <button
                type="button"
                className="ek-inline-toggle"
                onClick={() => {
                  setShowTeamAccess(true);
                  setMode('team');
                }}
              >
                Need team access?
              </button>
            )}

            <p className="ek-support-note">
              New here? <Link to="/register">Create your profile</Link>.
            </p>
          </form>

          <aside className="ek-panel ek-panel--soft">
            <span className="ek-kicker">{mode === 'worker' ? 'What opens next' : 'Team view'}</span>
            <h2 className="ek-side-title">
              {mode === 'worker' ? 'Your worker dashboard' : 'Team dashboard'}
            </h2>
            <p className="ek-support-note">
              {mode === 'worker'
                ? 'You will land on your cover page with your weekly policy, claims, and recent payouts.'
                : 'This opens the team view for workers, alerts, claims, and payouts.'}
            </p>

            <div className="ek-preview-grid">
              <div>
                <span className="ek-label">Access</span>
                <strong>{mode === 'worker' ? 'Phone number' : 'Access code'}</strong>
              </div>
              <div>
                <span className="ek-label">Destination</span>
                <strong>{mode === 'worker' ? 'My cover' : 'Dashboard'}</strong>
              </div>
              <div>
                <span className="ek-label">Device</span>
                <strong>This browser</strong>
              </div>
              <div>
                <span className="ek-label">Speed</span>
                <strong>Instant</strong>
              </div>
            </div>

            <div className="ek-inline-list">
              <span>
                <Smartphone size={14} />
                Simple access flow
              </span>
              <span>
                <ShieldCheck size={14} />
                Protected session
              </span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
