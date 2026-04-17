import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  CloudRain,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  SunMedium,
  Wind,
} from 'lucide-react';
import apiClient, {
  analyticsService,
  claimService,
  payoutService,
  workerService,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime, formatLabel, formatNumber } from '../utils/formatters';

const SHIFT_DURATION_HOURS = 5;

const FACTOR_CONFIG = {
  heavy_rain: {
    label: 'Rain',
    multiplier: 1.0,
    icon: CloudRain,
    inactiveCopy: 'No heavy rainfall signal in the registered zone.',
  },
  extreme_heat: {
    label: 'Heat',
    multiplier: 0.8,
    icon: SunMedium,
    inactiveCopy: 'No extreme heat signal in the registered zone.',
  },
  hazardous_aqi: {
    label: 'AQI',
    multiplier: 0.7,
    icon: Wind,
    inactiveCopy: 'Air quality is currently within normal range.',
  },
  flood: {
    label: 'Flood',
    multiplier: 1.3,
    icon: ShieldAlert,
    inactiveCopy: 'No flood or severe road block signal is active.',
  },
  civic_disruption: {
    label: 'Civic',
    multiplier: 1.5,
    icon: ShieldCheck,
    inactiveCopy: 'No curfew, bandh, or civic restriction is active.',
  },
};

function MetricCard({ label, value, note }) {
  return (
    <div className="ek-metric-card">
      <span className="ek-metric-label">{label}</span>
      <strong className="ek-metric-value">{value}</strong>
      {note ? <p className="ek-metric-note">{note}</p> : null}
    </div>
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

function buildFactorRows(activeTriggers) {
  return Object.entries(FACTOR_CONFIG).map(([key, config]) => {
    const trigger = activeTriggers.find((item) => item.trigger_type === key);

    return {
      key,
      label: config.label,
      multiplier: config.multiplier,
      icon: config.icon,
      active: Boolean(trigger),
      value:
        trigger?.raw_value != null
          ? formatNumber(trigger.raw_value, 0)
          : trigger?.severity
            ? formatLabel(trigger.severity)
            : 'Clear',
      copy: trigger
        ? `${config.label} factor is active for this payout window.`
        : config.inactiveCopy,
    };
  });
}

function getStrongestMultiplier(activeTriggers) {
  if (!activeTriggers.length) {
    return 1.0;
  }

  return activeTriggers.reduce((max, trigger) => {
    const multiplier = FACTOR_CONFIG[trigger.trigger_type]?.multiplier || 1.0;
    return Math.max(max, multiplier);
  }, 1.0);
}

export default function CashPayoutPage() {
  const { session } = useAuth();
  const workerId = session?.worker?.id;
  const [worker, setWorker] = useState(session?.worker || null);
  const [analytics, setAnalytics] = useState(null);
  const [claims, setClaims] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeTriggers, setActiveTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'EasyKavach | Cash Payout';
  }, []);

  useEffect(() => {
    if (!workerId) {
      return;
    }

    const loadPage = async () => {
      setError('');

      try {
        const [
          profileRes,
          analyticsRes,
          claimsRes,
          payoutsRes,
          zonesRes,
          triggersRes,
        ] = await Promise.all([
          workerService.getProfile(workerId),
          analyticsService.getWorkerDashboard(workerId),
          claimService.getWorkerClaims(workerId),
          payoutService.getWorkerPayouts(workerId),
          workerService.listZones(),
          apiClient.get('/triggers/active'),
        ]);

        const nextWorker = profileRes.data;
        const triggerList = Array.isArray(triggersRes.data) ? triggersRes.data : [];

        setWorker(nextWorker);
        setAnalytics(analyticsRes.data);
        setClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
        setPayouts(Array.isArray(payoutsRes.data) ? payoutsRes.data : []);
        setZones(Array.isArray(zonesRes.data) ? zonesRes.data : []);
        setActiveTriggers(
          triggerList.filter((trigger) => trigger.zone_id === nextWorker.zone_id),
        );
      } catch (err) {
        setError('Could not load the cash payout page right now.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
    const timer = window.setInterval(loadPage, 30000);

    return () => window.clearInterval(timer);
  }, [workerId]);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === worker?.zone_id) || null,
    [zones, worker?.zone_id],
  );
  const sortedPayouts = useMemo(
    () =>
      [...payouts].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [payouts],
  );
  const sortedClaims = useMemo(
    () =>
      [...claims].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [claims],
  );

  if (!workerId) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !worker) {
    return (
      <main className="ek-page-shell">
        <div className="ek-loading-state">
          <Loader2 size={18} className="clean-spin" />
          Loading cash payout...
        </div>
      </main>
    );
  }

  const selectedShifts = Array.isArray(worker?.shifts) && worker.shifts.length ? worker.shifts : ['evening'];
  const selectedShiftHours = selectedShifts.length * SHIFT_DURATION_HOURS;
  const strongestMultiplier = getStrongestMultiplier(activeTriggers);
  const estimatedPayout = (analytics?.expected_hourly_wage || 0) * selectedShiftHours * strongestMultiplier;
  const latestPayout = sortedPayouts[0] || null;
  const latestClaim = sortedClaims[0] || null;
  const darkStoreDistance = Number(worker?.warehouse_distance_km || 1);
  const darkStoreRange = `${Math.max(darkStoreDistance - 0.3, 0).toFixed(1)} - ${(darkStoreDistance + 0.3).toFixed(1)} km`;
  const factorRows = buildFactorRows(activeTriggers);

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-content-grid ek-content-grid--hero">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">Cash payout</span>
          <h1 className="ek-page-title">See the payout and what it is based on.</h1>
          <p className="ek-page-copy">
            Area, shift hours, dark store range, and live disruption factors all shape the amount
            shown here.
          </p>

          <div className="ek-inline-list">
            <span>{selectedZone?.name || formatLabel(worker?.zone_id)}</span>
            <span>{formatLabel(worker?.platform_type)}</span>
            <span>{selectedShiftHours} total shift hours</span>
          </div>
        </div>

        <aside className="ek-panel ek-panel--tint">
          <div className="ek-card-head">
            <span className="ek-status-pill">
              <ShieldCheck size={14} />
              {activeTriggers.length ? 'Live disruption factors' : 'No active disruption'}
            </span>
            <span className="ek-inline-note">
              Multiplier {strongestMultiplier.toFixed(1)}x
            </span>
          </div>

          <div className="ek-alert-block">
            <span className="ek-label">Current cash payout</span>
            <h2>{formatCurrency(latestPayout?.amount || estimatedPayout)}</h2>
            <p>
              {latestPayout
                ? `Latest credited payout on ${formatDateTime(latestPayout.created_at)}.`
                : 'This is a live estimate based on hourly pay, shift hours, and active factors.'}
            </p>
          </div>

          <div className="ek-mini-stat-grid">
            <MetricCard
              label="Selected shift hours"
              value={`${selectedShiftHours} hrs`}
              note={selectedShifts.map((shift) => formatLabel(shift)).join(', ')}
            />
            <MetricCard
              label="Dark store range"
              value={darkStoreRange}
              note="Approximate registered range to the dark store."
            />
          </div>
        </aside>
      </section>

      {error ? <div className="ek-form-alert">{error}</div> : null}

      <section className="ek-content-grid">
        <article className="ek-panel">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Payout basis</span>
              <h2>Inputs used for the cash support amount</h2>
              <p>These are the main inputs used to estimate support.</p>
            </div>
          </div>

          <div className="ek-detail-list">
            <DetailRow
              label="Area"
              value={`${selectedZone?.name || formatLabel(worker?.zone_id)} / ${formatLabel(worker?.area_type)}`}
            />
            <DetailRow
              label="Payout amount"
              value={formatCurrency(latestPayout?.amount || estimatedPayout)}
            />
            <DetailRow
              label="Selected shift hours"
              value={`${selectedShiftHours} hours across ${selectedShifts.length} shift${selectedShifts.length > 1 ? 's' : ''}`}
            />
            <DetailRow
              label="Center point to dark store range"
              value={darkStoreRange}
            />
            <DetailRow
              label="Hourly baseline"
              value={formatCurrency(analytics?.expected_hourly_wage)}
            />
            <DetailRow
              label="Latest claim basis"
              value={
                latestClaim
                  ? `${formatLabel(latestClaim.disruption_type)} / ${latestClaim.disruption_duration_hours?.toFixed?.(1) || '0.0'} hrs`
                  : 'Live estimate'
              }
            />
          </div>
        </article>

        <article className="ek-panel ek-panel--soft">
          <div className="ek-section-intro">
            <div>
              <span className="ek-kicker">Cash summary</span>
              <h2>Paid amount and current estimate</h2>
              <p>See the latest payout next to the current estimate.</p>
            </div>
          </div>

          <div className="ek-mini-stat-grid">
            <MetricCard
              label="Latest credited payout"
              value={formatCurrency(latestPayout?.amount)}
              note={latestPayout ? formatDateTime(latestPayout.created_at) : 'No payout credited yet'}
            />
            <MetricCard
              label="Estimated support now"
              value={formatCurrency(estimatedPayout)}
              note={`${strongestMultiplier.toFixed(1)}x severity applied to selected shift hours`}
            />
            <MetricCard
              label="Typical shift earning"
              value={formatCurrency(analytics?.expected_shift_earning)}
              note="Expected earning for one selected shift"
            />
            <MetricCard
              label="Protected so far"
              value={formatCurrency(analytics?.earnings_protected)}
              note="Total support already credited"
            />
          </div>

          <Link className="ek-button ek-button--secondary ek-button--inline" to="/profile">
            Back to my cover
            <ArrowRight size={16} />
          </Link>
        </article>
      </section>

      <section className="ek-panel">
        <div className="ek-section-intro">
          <div>
            <span className="ek-kicker">Factors</span>
            <h2>Rain and other disruption factors</h2>
            <p>Live weather and civic factors for the registered zone.</p>
          </div>
        </div>

        <div className="ek-factor-grid">
          {factorRows.map((factor) => {
            const Icon = factor.icon;

            return (
              <div className={`ek-factor-card ${factor.active ? 'is-active' : ''}`} key={factor.key}>
                <div className="ek-factor-head">
                  <span className="ek-factor-icon">
                    <Icon size={16} />
                  </span>
                  <span className="ek-list-badge">
                    {factor.active ? 'Active' : 'Clear'}
                  </span>
                </div>
                <strong className="ek-list-title">{factor.label}</strong>
                <p className="ek-list-copy">{factor.copy}</p>
                <div className="ek-factor-meta">
                  <span>Multiplier {factor.multiplier.toFixed(1)}x</span>
                  <span>Signal {factor.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
