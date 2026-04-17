import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  analyticsService,
  claimService,
  payoutService,
  triggerService,
  workerService,
} from '../services/api';
import {
  formatCurrency,
  formatDateTime,
  formatLabel,
  formatNumber,
  formatPercent,
} from '../utils/formatters';

function MetricCard({ label, value, note }) {
  return (
    <div className="ek-metric-card">
      <span className="ek-metric-label">{label}</span>
      <strong className="ek-metric-value">{value}</strong>
      {note ? <p className="ek-metric-note">{note}</p> : null}
    </div>
  );
}

function ListRow({ title, note, value, badge }) {
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

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [overview, setOverview] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const fetchAdminData = async () => {
      setIsRefreshing(true);
      setError('');

      try {
        const [overviewRes, workersRes, claimsRes, payoutsRes, triggersRes] = await Promise.all([
          analyticsService.getInsurerOverview(),
          workerService.listWorkers(),
          claimService.list(),
          payoutService.list(),
          triggerService.listEvents(),
        ]);

        setOverview(overviewRes.data?.insurer_overview || null);
        setWorkers(Array.isArray(workersRes.data) ? workersRes.data : []);
        setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
        setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
        setTriggers(Array.isArray(triggersRes.data) ? triggersRes.data : []);
      } catch (err) {
        setError('Could not load the portfolio overview right now.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchAdminData();
    const timer = window.setInterval(fetchAdminData, 30000);

    return () => window.clearInterval(timer);
  }, [isAdmin]);

  useEffect(() => {
    document.title = 'EasyKavach | Portfolio';
  }, []);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="ek-page-shell">
        <div className="ek-loading-state">
          <Loader2 className="clean-spin" size={18} />
          Loading the portfolio overview...
        </div>
      </main>
    );
  }

  const heatmaps = overview?.zone_heatmaps || [];
  const topWorkers = workers.slice(0, 6);
  const recentClaims = claims.slice(0, 6);
  const recentPayouts = payouts.slice(0, 6);
  const activeTriggers = triggers.slice(0, 5);

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-content-grid ek-content-grid--hero">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">Portfolio overview</span>
          <h1 className="ek-page-title">Cover, alerts, claims, and payouts in one place.</h1>
          <p className="ek-page-copy">
            Use this view to track workers, active alerts, claims, and payouts across the portfolio.
          </p>

          <div className="ek-inline-list">
            <span>{formatNumber(overview?.total_workers ?? workers.length)} members</span>
            <span>{formatNumber(overview?.active_policies_count ?? 0)} active covers</span>
            <span>{isRefreshing ? 'Refreshing now' : 'Live portfolio view'}</span>
          </div>
        </div>

        <aside className="ek-panel">
          <div className="ek-card-head">
            <span className="ek-status-pill">
              <ShieldCheck size={14} />
              Team access
            </span>
            <span className="ek-inline-note">
              Loss ratio {formatPercent((overview?.loss_ratio || 0) * 100, 1)}
            </span>
          </div>

          <div className="ek-detail-list">
            <div className="ek-detail-row">
              <strong>Members covered</strong>
              <span>{formatNumber(overview?.total_workers ?? workers.length)}</span>
            </div>
            <div className="ek-detail-row">
              <strong>Active covers</strong>
              <span>{formatNumber(overview?.active_policies_count ?? 0)}</span>
            </div>
            <div className="ek-detail-row">
              <strong>Support paid</strong>
              <span>{formatCurrency(overview?.total_payouts_amount)}</span>
            </div>
            <div className="ek-detail-row">
              <strong>Alerts right now</strong>
              <span>{formatNumber(activeTriggers.length)}</span>
            </div>
          </div>
        </aside>
      </section>

      {error ? <div className="ek-form-alert">{error}</div> : null}

      <section className="ek-metrics-grid">
        <MetricCard
          label="Members covered"
          value={formatNumber(overview?.total_workers ?? workers.length)}
          note="Total members currently visible in the portfolio."
        />
        <MetricCard
          label="Claims handled"
          value={formatNumber(claims.length)}
          note="All claims currently loaded in this view."
        />
        <MetricCard
          label="Payouts sent"
          value={formatNumber(payouts.length)}
          note="Support transfers already created."
        />
        <MetricCard
          label="Zones tracked"
          value={formatNumber(heatmaps.length)}
          note="Zones with live portfolio visibility."
        />
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Zone activity</span>
              <h2>Where the portfolio is most active</h2>
              <p>Disruption intensity and claim volume across tracked zones.</p>
            </div>
          </div>

          <div className="ek-zone-grid">
            {heatmaps.slice(0, 6).map((zone) => {
              const riskLevel = Math.max(0, Math.min(1, Number(zone.risk_score || 0)));

              return (
                <div className="ek-zone-card" key={zone.zone_id}>
                  <div className="ek-zone-head">
                    <strong>{zone.zone_name}</strong>
                    <span>{formatPercent(riskLevel * 100, 0)}</span>
                  </div>
                  <div className="ek-zone-bar">
                    <div className="ek-zone-fill" style={{ width: `${riskLevel * 100}%` }} />
                  </div>
                  <div className="ek-zone-meta">
                    <span>{formatNumber(zone.active_disruptions_count)} active disruptions</span>
                    <span>{formatNumber(zone.total_claims_count)} claims</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="ek-panel ek-panel--soft">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Active alerts</span>
              <h2>What needs attention right now</h2>
              <p>Current disruption alerts are grouped in one place for faster scanning.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {activeTriggers.length ? (
              activeTriggers.map((trigger) => (
                <ListRow
                  key={trigger.id}
                  title={formatLabel(trigger.trigger_type)}
                  note={`${formatLabel(trigger.zone_id || 'Unknown zone')} / ${formatDateTime(trigger.created_at)}`}
                  value={formatLabel(trigger.status || 'Active')}
                  badge={formatLabel(trigger.severity || 'High')}
                />
              ))
            ) : (
              <p className="ek-empty-state">No active alerts right now.</p>
            )}
          </div>
        </article>
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Member activity</span>
              <h2>Recently active members</h2>
              <p>See who is online, where they work, and their selected shifts.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {topWorkers.length ? (
              topWorkers.map((worker) => (
                <ListRow
                  key={worker.id}
                  title={worker.name}
                  note={`${formatLabel(worker.zone_id)} / ${formatLabel(worker.platform_type)}`}
                  value={worker.is_online ? 'Online' : 'Offline'}
                  badge={
                    Array.isArray(worker.shifts) && worker.shifts.length
                      ? worker.shifts.map((shift) => formatLabel(shift)).join(', ')
                      : 'No shifts'
                  }
                />
              ))
            ) : (
              <p className="ek-empty-state">No member activity to show yet.</p>
            )}
          </div>
        </article>

        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Recent payouts</span>
              <h2>Latest support transfers</h2>
              <p>The newest payouts remain visible here with amount, channel, and current status.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {recentPayouts.length ? (
              recentPayouts.map((payout) => (
                <ListRow
                  key={payout.id}
                  title={formatCurrency(payout.amount)}
                  note={formatDateTime(payout.created_at)}
                  value={formatLabel(payout.channel || 'UPI')}
                  badge={formatLabel(payout.status || 'Settled')}
                />
              ))
            ) : (
              <p className="ek-empty-state">No payouts to show yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Recent claims</span>
              <h2>Latest claim records</h2>
              <p>Latest claims across the portfolio.</p>
            </div>
          </div>

          <div className="ek-list-stack">
            {recentClaims.length ? (
              recentClaims.map((claim) => (
                <ListRow
                  key={claim.id}
                  title={formatLabel(claim.disruption_type)}
                  note={formatDateTime(claim.created_at)}
                  value={formatCurrency(claim.adjusted_payout)}
                  badge={formatLabel(claim.status)}
                />
              ))
            ) : (
              <p className="ek-empty-state">No claims have been created yet.</p>
            )}
          </div>
        </article>

        <article className="ek-panel ek-panel--soft">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Claim mix</span>
              <h2>How claims are distributed</h2>
              <p>Main disruption types currently recorded across the portfolio.</p>
            </div>
          </div>

          <div className="ek-partner-list">
            {Object.entries(overview?.claims_by_type || {}).map(([type, count]) => (
              <span className="ek-partner-pill" key={type}>
                {formatLabel(type)} / {count}
              </span>
            ))}
            {!Object.keys(overview?.claims_by_type || {}).length ? (
              <span className="ek-empty-state">No claim mix data yet.</span>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
