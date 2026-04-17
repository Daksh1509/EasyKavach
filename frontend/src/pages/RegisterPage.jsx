import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { policyService, workerService } from '../services/api';
import { formatCurrency, formatNumber } from '../utils/formatters';

const ORG_OPTIONS = ['Blinkit', 'Zepto', 'Uber Eats'];
const DEFAULT_SHIFTS = ['evening'];

const emptyForm = {
  name: '',
  phone: '',
  pancard: '',
  aadhaar: '',
  email: '',
  zone_id: '',
  area_type: 'commercial',
  warehouse_distance_km: 1.0,
  platform_type: 'Blinkit',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerWorker, session } = useAuth();
  const [zones, setZones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await workerService.listZones();
        const nextZones = Array.isArray(res.data) ? res.data : [];
        setZones(nextZones);
        if (!formData.zone_id && nextZones[0]?.id) {
          setFormData((current) => ({ ...current, zone_id: nextZones[0].id }));
        }
      } catch (err) {
        setError('Could not load delivery zones right now. Please try again.');
      }
    };

    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (session?.type === 'worker') {
      navigate('/profile', { replace: true });
    }
    if (session?.type === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate, session]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const selectedZone = zones.find((zone) => zone.id === formData.zone_id);
    if (!selectedZone) {
      return;
    }

    setFormData((current) => {
      const nextAreaType = selectedZone.default_area_type || current.area_type;
      const nextWarehouseDistance =
        selectedZone.default_warehouse_distance_km ?? current.warehouse_distance_km;

      if (
        current.area_type === nextAreaType &&
        current.warehouse_distance_km === nextWarehouseDistance
      ) {
        return current;
      }

      return {
        ...current,
        area_type: nextAreaType,
        warehouse_distance_km: nextWarehouseDistance,
      };
    });
  }, [formData.zone_id, zones]);

  useEffect(() => {
    if (!formData.zone_id) {
      setQuote(null);
      return undefined;
    }

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsQuoteLoading(true);
      try {
        const res = await policyService.quote({
          zone_id: formData.zone_id,
          platform_type: formData.platform_type,
          shifts: DEFAULT_SHIFTS,
        });

        if (isMounted) {
          setQuote(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setQuote(null);
        }
      } finally {
        if (isMounted) {
          setIsQuoteLoading(false);
        }
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [formData.platform_type, formData.zone_id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const nextSession = await registerWorker({
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        pancard: formData.pancard.trim().toUpperCase(),
        aadhaar: formData.aadhaar.trim(),
        email: formData.email.trim(),
        upi_id: '',
        shifts: DEFAULT_SHIFTS,
      });

      navigate(nextSession?.worker?.id ? '/profile' : '/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedZone = zones.find((zone) => zone.id === formData.zone_id);
  const primaryShiftForecast = quote?.shift_forecasts?.[0] || null;

  return (
    <main className="ek-page-shell ek-section-stack">
      <section className="ek-auth-layout">
        <div className="ek-panel ek-panel--feature">
          <span className="ek-kicker">Create your profile</span>
          <h1 className="ek-page-title">Register with only the details needed to start cover.</h1>
          <p className="ek-page-copy">
            Enter your identity and contact details, choose your organisation and work zone, and
            preview your first weekly estimate.
          </p>

          <div className="ek-inline-list">
            <span>Simple registration</span>
            <span>Work zone based</span>
            <span>Weekly estimate</span>
          </div>

          <div className="ek-summary-grid ek-summary-grid--three">
            <div className="ek-summary-card">
              <span className="ek-label">Identity</span>
              <strong>Basic verification</strong>
              <p>Name, PAN card, Aadhaar, and email stay together in one section.</p>
            </div>
            <div className="ek-summary-card">
              <span className="ek-label">Organisation</span>
              <strong>Choose your platform</strong>
              <p>Pick Blinkit, Zepto, or Uber Eats for your registration.</p>
            </div>
            <div className="ek-summary-card">
              <span className="ek-label">First estimate</span>
              <strong>See your first week</strong>
              <p>Preview the starting premium and hourly support level before you continue.</p>
            </div>
          </div>
        </div>

        <div className="ek-auth-aside">
          <form className="ek-panel ek-form" onSubmit={handleSubmit}>
            <div className="ek-card-head">
              <span className="ek-status-pill">
                <ShieldCheck size={14} />
                Secure registration
              </span>
              <span className="ek-inline-note">Worker registration</span>
            </div>

            {error ? <div className="ek-form-alert">{error}</div> : null}

            <label className="ek-field">
              <span className="ek-label">
                <UserRound size={14} />
                Driver name
              </span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ravi Kumar"
              />
            </label>

            <div className="ek-field-grid">
              <label className="ek-field">
                <span className="ek-label">
                  <Phone size={14} />
                  Phone number
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label className="ek-field">
                <span className="ek-label">
                  <Mail size={14} />
                  Email ID
                </span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="ravi@example.com"
                />
              </label>
            </div>

            <div className="ek-field-grid">
              <label className="ek-field">
                <span className="ek-label">
                  <CreditCard size={14} />
                  PAN card
                </span>
                <input
                  type="text"
                  value={formData.pancard}
                  onChange={(event) => updateField('pancard', event.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                />
              </label>

              <label className="ek-field">
                <span className="ek-label">
                  <ShieldCheck size={14} />
                  Aadhaar
                </span>
                <input
                  type="text"
                  value={formData.aadhaar}
                  onChange={(event) => updateField('aadhaar', event.target.value)}
                  placeholder="1234 5678 9012"
                />
              </label>
            </div>

            <div className="ek-field-grid">
              <label className="ek-field">
                <span className="ek-label">
                  <Building2 size={14} />
                  Organisation
                </span>
                <select
                  value={formData.platform_type}
                  onChange={(event) => updateField('platform_type', event.target.value)}
                >
                  {ORG_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ek-field">
                <span className="ek-label">
                  <MapPin size={14} />
                  Work zone
                </span>
                <select
                  value={formData.zone_id}
                  onChange={(event) => updateField('zone_id', event.target.value)}
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} · {zone.city}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="ek-button ek-button--primary ek-button--full"
              disabled={
                isLoading ||
                !formData.name ||
                !formData.phone ||
                !formData.pancard ||
                !formData.aadhaar ||
                !formData.email ||
                !formData.zone_id ||
                !formData.platform_type
              }
            >
              {isLoading ? <Loader2 size={16} className="clean-spin" /> : <Sparkles size={16} />}
              Create driver profile
              <ArrowRight size={16} />
            </button>

            <p className="ek-support-note">
              Already registered? <Link to="/login">Sign in here</Link>.
            </p>
          </form>

          <aside className="ek-panel ek-panel--soft">
            <span className="ek-kicker">Estimated first week</span>
            <h2 className="ek-side-title">{formData.name || 'New driver profile'}</h2>
            <p className="ek-support-note">
              {selectedZone
                ? `${selectedZone.name}, ${selectedZone.city}`
                : 'Choose a work zone to preview the first estimate.'}
            </p>

            <div className="ek-preview-grid">
              <div>
                <span className="ek-label">Organisation</span>
                <strong>{formData.platform_type}</strong>
              </div>
              <div>
                <span className="ek-label">Weekly premium</span>
                <strong>
                  {quote ? formatCurrency(quote.premium_amount) : isQuoteLoading ? 'Updating...' : 'Select a zone'}
                </strong>
              </div>
              <div>
                <span className="ek-label">Hourly support</span>
                <strong>{quote ? formatCurrency(quote.hourly_income_floor) : 'N/A'}</strong>
              </div>
              <div>
                <span className="ek-label">Zone score</span>
                <strong>
                  {quote
                    ? `${formatNumber((quote.risk_score || 0) * 100, 0)} / 100`
                    : selectedZone?.base_risk_score?.toFixed?.(1) || '0.0'}
                </strong>
              </div>
            </div>

            <div className="ek-detail-list">
              <div className="ek-detail-row">
                <strong>Estimate type</strong>
                <span>{primaryShiftForecast ? 'Standard shift estimate' : 'Waiting for a work zone'}</span>
              </div>
              <div className="ek-detail-row">
                <strong>Expected daily income</strong>
                <span>{quote ? formatCurrency(quote.expected_daily_earning) : 'N/A'}</span>
              </div>
              <div className="ek-detail-row">
                <strong>Expected weekly support</strong>
                <span>{quote ? formatCurrency(quote.expected_weekly_loss) : 'N/A'}</span>
              </div>
              <div className="ek-detail-row">
                <strong>Estimate shift</strong>
                <span>Evening</span>
              </div>
            </div>

            <p className="ek-support-note">
              {isQuoteLoading
                ? 'Refreshing your estimate...'
                : quote
                  ? 'The estimate updates when the organisation or work zone changes.'
                  : 'We will prepare the first estimate once a work zone is selected.'}
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
