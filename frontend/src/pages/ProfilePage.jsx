import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, Power, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  analyticsService,
  claimService,
  payoutService,
  policyService,
  workerService,
} from '../services/api';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLabel,
  formatPercent,
} from '../utils/formatters';
import TiltCard from '../components/TiltCard';

function MetricCard({ label, value, note }) {
  return (
    <TiltCard className="ek-metric-card" intensity={14} glareColor="rgba(16,185,129,0.1)">
      <span className="ek-metric-label">{label}</span>
      <strong className="ek-metric-value">{value}</strong>
      {note ? <p className="ek-metric-note">{note}</p> : null}
    </TiltCard>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ek-detail-row">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function ActivityRow({ title, note, value, badge }) {
  return (
    <div className="ek-list-row">
      <div className="ek-list-row-main">
        <strong className="ek-list-title">{title}</strong>
        <p className="ek-list-copy">{note}</p>
      </div>
      <div className="ek-list-meta">
        <span className="ek-list-value">{value}</span>
        {badge ? <em className="ek-list-badge">{badge}</em> : null}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { session } = useAuth();
  const workerId = session?.worker?.id;
  const [worker, setWorker] = useState(session?.worker || null);
  const [analytics, setAnalytics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (!workerId) {
      return;
    }

    const fetchProfile = async () => {
      setError('');

      try {
        const [profileRes, analyticsRes, claimsRes, policiesRes, payoutsRes] = await Promise.all([
          workerService.getProfile(workerId),
          analyticsService.getWorkerDashboard(workerId),
          claimService.getWorkerClaims(workerId),
          policyService.getWorkerPolicies(workerId),
          payoutService.getWorkerPayouts(workerId),
        ]);

        setWorker(profileRes.data);
        setAnalytics(analyticsRes.data);
        setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
        setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
        setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
      } catch (err) {
        setError('Could not load your cover right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    const timer = window.setInterval(fetchProfile, 30000);

    return () => window.clearInterval(timer);
  }, [workerId]);

  useEffect(() => {
    document.title = 'EasyKavach | My Cover';
  }, []);

  const handleToggleStatus = async () => {
    if (!workerId || !worker) {
      return;
    }

    setIsToggling(true);
    try {
      const nextStatus = !worker.is_online;
      const res = await workerService.updateStatus(workerId, nextStatus);
      setWorker(res.data);
    } catch (err) {
      setError('Could not update your availability right now.');
    } finally {
      setIsToggling(false);
    }
  };

  if (!workerId) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !worker) {
    return (
      <main className="ek-page-shell">
        <div className="ek-loading-state">
          <Loader2 size={18} className="clean-spin" />
          Loading your cover...
        </div>
      </main>
    );
  }

  const primaryPolicy = policies[0];
  const recentClaims = claims.slice(0, 4);
  const recentPayouts = payouts.slice(0, 4);

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-content-grid ek-content-grid--hero">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">My cover</span>
          <h1 className="ek-page-title">{worker?.name || 'Your EasyKavach profile'}</h1>
          <p className="ek-page-copy">
            See your weekly cover, current status, claims, and recent payouts in one place.
          </p>

          <div className="ek-inline-list">
            <span>{formatLabel(worker?.zone_id)}</span>
            <span>{formatLabel(worker?.platform_type)}</span>
            <span>{worker?.is_online ? 'Available for shifts' : 'Currently offline'}</span>
          </div>

          <div className="ek-button-row">
            <Link to="/cash-payout" className="ek-button ek-button--primary">
              View payout details
            </Link>
          </div>
        </div>

        <aside className="ek-panel">
          <div className="ek-card-head">
            <span className="ek-status-pill">
              <ShieldCheck size={14} />
              {worker?.is_online ? 'Available for shifts' : 'Currently offline'}
            </span>
            <button type="button" className="ek-button ek-button--secondary" onClick={handleToggleStatus}>
              <Power size={14} />
              {isToggling
                ? 'Updating...'
                : worker?.is_online
                  ? 'Pause availability'
                  : 'Mark available'}
            </button>
          </div>

          <div className="ek-detail-list">
            <DetailRow label="Registered on" value={formatDate(worker?.registered_at)} />
            <DetailRow label="Last active" value={formatDateTime(worker?.last_active_at)} />
            <DetailRow
              label="Usual shifts"
              value={
                Array.isArray(worker?.shifts) && worker.shifts.length
                  ? worker.shifts.map((shift) => formatLabel(shift)).join(', ')
                  : 'N/A'
              }
            />
            <DetailRow label="Area type" value={formatLabel(worker?.area_type)} />
          </div>
        </aside>
      </section>

      {error ? <div className="ek-form-alert">{error}</div> : null}

      <section className="ek-metrics-grid">
        <MetricCard
          label="Protected so far"
          value={formatCurrency(analytics?.earnings_protected)}
          note="Total support already credited to you."
        />
        <MetricCard
          label="Typical shift income"
          value={formatCurrency(analytics?.expected_shift_earning)}
          note="A simple estimate for an active shift."
        />
        <MetricCard
          label="Hourly baseline"
          value={formatCurrency(analytics?.expected_hourly_wage)}
          note="Used to understand your regular earning pace."
        />
        <MetricCard
          label="Estimated support per hour"
          value={formatCurrency(analytics?.predicted_risk_payout_estimate)}
          note="The hourly cover used when a disruption qualifies."
        />
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">This week</span>
              <h2>Current policy</h2>
              <p>The main details for your active weekly cover.</p>
            </div>
          </div>

          <div className="ek-detail-list">
            <DetailRow label="Policy" value={primaryPolicy?.id || 'No active policy yet'} />
            <DetailRow label="Status" value={formatLabel(primaryPolicy?.status || 'Pending')} />
            <DetailRow
              label="Cover period"
              value={`${formatDate(primaryPolicy?.week_start)} to ${formatDate(primaryPolicy?.week_end)}`}
            />
            <DetailRow label="Weekly premium" value={formatCurrency(primaryPolicy?.premium_amount)} />
            <DetailRow
              label="Expected weekly support"
              value={formatCurrency(primaryPolicy?.expected_weekly_loss)}
            />
            <DetailRow
              label="Risk level"
              value={formatPercent((primaryPolicy?.risk_score || 0) * 100, 1)}
            />
          </div>
        </article>

        <article className="ek-panel ek-panel--soft">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">At a glance</span>
              <h2>Coverage summary</h2>
              <p>A quick summary of your recent activity and support history.</p>
            </div>
          </div>

          <div className="ek-detail-list">
            <DetailRow label="Work zone" value={formatLabel(worker?.zone_id)} />
            <DetailRow label="Platform" value={formatLabel(worker?.platform_type)} />
            <DetailRow label="Claims on record" value={String(analytics?.total_claims ?? 0)} />
            <DetailRow label="Recent payouts" value={String(recentPayouts.length)} />
          </div>

          <div className="ek-inline-list">
            <span>Refreshes automatically</span>
            <span>Weekly cover stays visible</span>
            <span>Payout history included</span>
          </div>
        </article>
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Recent claims</span>
              <h2>Latest claim activity</h2>
              <p>Claims created from covered disruptions appear here.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {recentClaims.length ? (
              recentClaims.map((claim) => (
                <ActivityRow
                  key={claim.id}
                  title={formatLabel(claim.disruption_type)}
                  note={formatDateTime(claim.created_at)}
                  value={formatCurrency(claim.adjusted_payout)}
                  badge={formatLabel(claim.status)}
                />
              ))
            ) : (
              <p className="ek-empty-state">No claims yet. This area will update automatically.</p>
            )}
          </div>
        </article>

        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Recent payouts</span>
              <h2>Support already sent</h2>
              <p>Completed or in-progress payouts appear here.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {recentPayouts.length ? (
              recentPayouts.map((payout) => (
                <ActivityRow
                  key={payout.id}
                  title={formatCurrency(payout.amount)}
                  note={formatDateTime(payout.created_at)}
                  value={formatLabel(payout.channel || 'UPI')}
                  badge={formatLabel(payout.status || 'Settled')}
                />
              ))
            ) : (
              <p className="ek-empty-state">No payouts are linked to this profile yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
