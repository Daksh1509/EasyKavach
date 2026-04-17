import React, { startTransition, useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient, { analyticsService } from '../services/api';
import { formatCurrency, formatLabel } from '../utils/formatters';
import TiltCard from '../components/TiltCard';

const FEATURE_STEPS = [
  {
    step: '01',
    title: 'Create your profile',
    copy: 'Add your details, choose the zone you work in, and preview your first week of cover.',
  },
  {
    step: '02',
    title: 'We keep watch',
    copy: 'Weather, air quality, and civic signals are monitored for the registered zone.',
  },
  {
    step: '03',
    title: 'Support arrives fast',
    copy: 'If a covered disruption stops work, support is calculated and paid automatically.',
  },
];

const COVERAGE_POINTS = [
  {
    title: 'Weather interruptions',
    copy: 'Heavy rain, flooding, and extreme heat that pause normal delivery work.',
  },
  {
    title: 'Air quality spikes',
    copy: 'Unsafe AQI periods that make an outdoor shift unreasonable.',
  },
  {
    title: 'Civic disruption',
    copy: 'Bandhs, curfews, or local restrictions that block normal movement.',
  },
];

const PARTNERS = ['Blinkit', 'OpenWeather', 'Open-Meteo', 'Razorpay'];

const FALLBACK_DASHBOARD = {
  isLive: false,
  workerName: 'Ravi Kumar',
  zone: 'Koramangala, Bengaluru',
  platform: 'Blinkit',
  protectedEarnings: 8450,
  expectedShiftEarning: 1320,
  hourlyCover: 240,
  alert: {
    active: true,
    title: 'Heavy rain watch in Koramangala, Bengaluru',
    copy: 'Current weather conditions may interrupt active delivery shifts in this zone.',
  },
  signals: [
    { label: 'Weather', value: '81 mm/h', status: 'Active' },
    { label: 'Air quality', value: '302 AQI', status: 'Elevated' },
    { label: 'Civic access', value: 'No restrictions', status: 'Clear' },
  ],
};

function formatTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatZone(zone = '') {
  return zone ? formatLabel(zone) : FALLBACK_DASHBOARD.zone;
}

function formatPlatform(platform = '') {
  return platform ? formatLabel(platform) : FALLBACK_DASHBOARD.platform;
}

function humanizeTrigger(triggerType = '') {
  const trigger = String(triggerType).toLowerCase();

  if (trigger.includes('rain') || trigger.includes('flood')) {
    return 'Heavy rain watch';
  }

  if (trigger.includes('aqi')) {
    return 'Air quality alert';
  }

  if (trigger.includes('heat')) {
    return 'Heat alert';
  }

  if (trigger.includes('civic') || trigger.includes('curfew') || trigger.includes('bandh')) {
    return 'Local disruption alert';
  }

  return 'Zone alert';
}

function buildSignals(activeTriggers, analytics) {
  const weatherTrigger = activeTriggers.find(
    (trigger) => trigger.trigger_type?.includes('rain') || trigger.trigger_type?.includes('heat'),
  );
  const aqiTrigger = activeTriggers.find((trigger) => trigger.trigger_type?.includes('aqi'));
  const civicTrigger = activeTriggers.find(
    (trigger) =>
      trigger.trigger_type?.includes('civic') ||
      trigger.trigger_type?.includes('bandh') ||
      trigger.trigger_type?.includes('curfew'),
  );

  return [
    {
      label: 'Weather',
      value: weatherTrigger?.raw_value ? `${Math.round(weatherTrigger.raw_value)} mm/h` : 'Normal',
      status: weatherTrigger ? 'Active' : 'Clear',
    },
    {
      label: 'Air quality',
      value: aqiTrigger?.raw_value ? `${Math.round(aqiTrigger.raw_value)} AQI` : 'Within range',
      status: aqiTrigger ? 'Elevated' : 'Clear',
    },
    {
      label: 'Civic access',
      value: civicTrigger ? 'Restricted' : 'No restrictions',
      status: civicTrigger ? 'Watch' : 'Clear',
    },
    {
      label: 'Support buffer',
      value: formatCurrency(
        analytics?.predicted_risk_payout_estimate || FALLBACK_DASHBOARD.hourlyCover,
      ),
      status: activeTriggers.length ? 'Ready' : 'On standby',
    },
  ];
}

function buildAlert(primaryTrigger, zone, signals) {
  if (!primaryTrigger) {
    return FALLBACK_DASHBOARD.alert;
  }

  return {
    active: true,
    title: `${humanizeTrigger(primaryTrigger.trigger_type)} in ${zone}`,
    copy: `${signals[0].label}: ${signals[0].value}. ${signals[1].label}: ${signals[1].value}. ${signals[2].value}.`,
  };
}

function buildDashboardSnapshot({ featuredWorker, workerAnalytics, activeTriggers, overview, isLive }) {
  const primaryTrigger = activeTriggers[0];
  const zone = formatZone(primaryTrigger?.zone_id || featuredWorker?.zone_id || FALLBACK_DASHBOARD.zone);
  const signals = buildSignals(activeTriggers, workerAnalytics);

  return {
    isLive,
    workerName: featuredWorker?.name || FALLBACK_DASHBOARD.workerName,
    zone,
    platform: formatPlatform(featuredWorker?.platform_type || FALLBACK_DASHBOARD.platform),
    protectedEarnings:
      workerAnalytics?.earnings_protected ||
      overview?.total_payouts_amount ||
      FALLBACK_DASHBOARD.protectedEarnings,
    expectedShiftEarning:
      workerAnalytics?.expected_shift_earning || FALLBACK_DASHBOARD.expectedShiftEarning,
    hourlyCover:
      workerAnalytics?.predicted_risk_payout_estimate || FALLBACK_DASHBOARD.hourlyCover,
    alert: buildAlert(primaryTrigger, zone, signals),
    signals,
  };
}

function SectionIntro({ eyebrow, title, copy, meta }) {
  return (
    <div className="ek-section-intro">
      <div>
        <span className="ek-kicker">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {meta ? <div className="ek-section-meta">{meta}</div> : null}
    </div>
  );
}

export default function EasyKavachDashboard() {
  const [dashboard, setDashboard] = useState(FALLBACK_DASHBOARD);
  const [clock, setClock] = useState(() => formatTime(new Date()));

  useEffect(() => {
    document.title = 'EasyKavach | Home';
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatTime(new Date()));
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [workersRes, insurerRes, triggersRes] = await Promise.allSettled([
        apiClient.get('/workers'),
        analyticsService.getInsurerOverview(),
        apiClient.get('/triggers/active'),
      ]);

      const featuredWorker =
        workersRes.status === 'fulfilled' && Array.isArray(workersRes.value.data)
          ? workersRes.value.data[0]
          : null;

      let workerAnalytics = null;
      if (featuredWorker?.id) {
        try {
          const analyticsRes = await analyticsService.getWorkerDashboard(featuredWorker.id);
          workerAnalytics = analyticsRes.data;
        } catch (error) {
          workerAnalytics = null;
        }
      }

      const overview =
        insurerRes.status === 'fulfilled' ? insurerRes.value.data?.insurer_overview : null;
      const activeTriggers =
        triggersRes.status === 'fulfilled' && Array.isArray(triggersRes.value.data)
          ? triggersRes.value.data
          : [];
      const isLive =
        workersRes.status === 'fulfilled' ||
        insurerRes.status === 'fulfilled' ||
        triggersRes.status === 'fulfilled';

      const nextDashboard = buildDashboardSnapshot({
        featuredWorker,
        workerAnalytics,
        activeTriggers,
        overview,
        isLive,
      });

      if (!isMounted) {
        return;
      }

      startTransition(() => {
        setDashboard(nextDashboard);
      });
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 45000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-hero">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">Income protection for delivery partners</span>
          <h1 className="ek-hero-title">Cover lost income when work has to stop.</h1>
          <p className="ek-hero-text">
            EasyKavach helps delivery partners recover income when weather, air quality, or local
            disruption makes the shift impossible.
          </p>
          <p className="ek-page-copy">
            Get clear cover details, live status, and fast support when a shift is interrupted.
          </p>

          <div className="ek-button-row">
            <Link to="/register" className="ek-button ek-button--primary">
              Create profile
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="ek-button ek-button--secondary">
              Sign in
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="ek-inline-list">
            <span>Income loss only</span>
            <span>Weekly cover</span>
            <span>Fast payout</span>
          </div>
        </div>

        <TiltCard className="ek-panel ek-panel--tint" intensity={8} glareColor="rgba(16,185,129,0.12)">
          <div className="ek-card-head">
            <span className="ek-status-pill">
              <ShieldCheck size={14} />
              {dashboard.isLive ? 'Live data' : 'Sample preview'}
            </span>
            <span className="ek-inline-note">{clock}</span>
          </div>

          <div className="ek-alert-block">
            <span className="ek-label">Current watch</span>
            <h2>{dashboard.alert.title}</h2>
            <p>{dashboard.alert.copy}</p>
          </div>

          <div className="ek-metrics-grid ek-metrics-grid--compact">
            <TiltCard className="ek-metric-card" intensity={15} glareColor="rgba(16,185,129,0.1)">
              <span className="ek-metric-label">Current zone</span>
              <strong className="ek-metric-value">{dashboard.zone}</strong>
              <p className="ek-metric-note">Latest registered zone in view.</p>
            </TiltCard>
            <TiltCard className="ek-metric-card" intensity={15} glareColor="rgba(16,185,129,0.1)">
              <span className="ek-metric-label">Typical shift income</span>
              <strong className="ek-metric-value">
                {formatCurrency(dashboard.expectedShiftEarning)}
              </strong>
              <p className="ek-metric-note">Estimated for one shift.</p>
            </TiltCard>
            <TiltCard className="ek-metric-card" intensity={15} glareColor="rgba(16,185,129,0.1)">
              <span className="ek-metric-label">Support per hour</span>
              <strong className="ek-metric-value">{formatCurrency(dashboard.hourlyCover)}</strong>
              <p className="ek-metric-note">Available when a covered event interrupts work.</p>
            </TiltCard>
            <TiltCard className="ek-metric-card" intensity={15} glareColor="rgba(234,88,12,0.1)">
              <span className="ek-metric-label">Protected so far</span>
              <strong className="ek-metric-value">
                {formatCurrency(dashboard.protectedEarnings)}
              </strong>
              <p className="ek-metric-note">Support already paid through EasyKavach.</p>
            </TiltCard>
          </div>
        </TiltCard>
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <SectionIntro
            eyebrow="How it works"
            title="Three simple steps from signup to payout"
            copy="Sign up once, stay covered, and get paid automatically when a covered event interrupts work."
          />

          <div className="ek-steps-grid">
            {FEATURE_STEPS.map((item) => (
              <TiltCard className="ek-step-card" key={item.step} intensity={14} glareColor="rgba(16,185,129,0.08)">
                <span className="ek-step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </TiltCard>
            ))}
          </div>
        </article>

        <article className="ek-panel">
          <SectionIntro
            eyebrow="Coverage watch"
            title="Key signals in one clear panel"
            copy="See the current weather, air quality, access, and support status for the active zone."
            meta={<span className="ek-section-chip">{dashboard.platform}</span>}
          />

          <div className="ek-signal-list">
            {dashboard.signals.map((signal) => (
              <TiltCard className="ek-signal-row" key={signal.label} intensity={10} glareColor="rgba(255,255,255,0.05)">
                <div>
                  <span className="ek-label">{signal.label}</span>
                  <strong className="ek-list-title">{signal.value}</strong>
                </div>
                <span className="ek-list-badge">{signal.status}</span>
              </TiltCard>
            ))}
          </div>
        </article>
      </section>

      <section className="ek-content-grid">
        <article className="ek-panel">
          <SectionIntro
            eyebrow="What is covered"
            title="Focused only on the situations that stop work"
            copy="EasyKavach is designed around practical interruptions that delivery partners actually face."
          />

          <div className="ek-features-grid">
            {COVERAGE_POINTS.map((point) => (
              <TiltCard className="ek-feature-card" key={point.title} intensity={14} glareColor="rgba(234,88,12,0.08)">
                <h3>{point.title}</h3>
                <p>{point.copy}</p>
              </TiltCard>
            ))}
          </div>
        </article>

        <article className="ek-panel ek-panel--soft">
          <SectionIntro
            eyebrow="Partners"
            title="Services behind the cover"
            copy="Weather data, zone monitoring, and payout services help keep the cover running."
          />

          <div className="ek-partner-list" aria-label="Data and payout partners">
            {PARTNERS.map((partner) => (
              <span className="ek-partner-pill" key={partner}>
                {partner}
              </span>
            ))}
          </div>

          <p className="ek-support-note">
            These services support monitoring and payout processing.
          </p>
        </article>
      </section>
    </main>
  );
}
