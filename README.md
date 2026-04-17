#  EasyKavach — AI-Powered Parametric Income Insurance for Blinkit Delivery Partners

> **Guidewire DEVTrails 2026 | Team Submission | Phase 1 | Team Name: Ninja Turtles**

---

##  Overview

EasyKavach is an AI-enabled parametric insurance platform that protects **Blinkit grocery delivery partners** from income loss caused by uncontrollable external disruptions — extreme weather, hazardous air quality, floods, curfews, and civic events.

When a disruption occurs, EasyKavach **automatically detects it, initiates a claim, validates it using AI, and credits the worker's lost income instantly** — no paperwork, no calls, no waiting.

| | |
|---|---|
| **Persona** | Blinkit Grocery / Q-Commerce Delivery Partners |
| **Coverage** | Loss of income ONLY — strictly excludes health, vehicle repair, accidents |
| **Pricing Model** | Weekly dynamic premium, personalized per worker per zone |
| **Platform** | Web Application |

---

##  The Problem

India's Blinkit delivery partners are the backbone of quick commerce. But when external disruptions hit:

- 🌧️ **Heavy rainfall, floods** → workers physically cannot ride or deliver
- ☀️ **Extreme heat (>42°C)** → outdoor work becomes physically dangerous
- 🏭 **Hazardous AQI (>300)** → unsafe air makes outdoor delivery impossible
- 🚫 **Curfews, bandhs, local strikes** → access to pickup/drop zones is completely blocked

These workers lose **20–30% of their monthly income** with zero protection and zero safety net. They bear the full financial loss with no recourse. EasyKavach changes that by insuring the **income lost** during these events — not the cost of fixing external issues.

---

##  System Architecture

<img width="1408" height="684" alt="generated-image(1)" src="https://github.com/user-attachments/assets/dc1d433c-16e2-4e63-93ee-34588d49573d" />


---

##  End-to-End System Flow

```
┌─────────────────────────────────────────────────────┐
│              WORKER ONBOARDING                      │
│   Register → Zone Selection → Risk Profiling        │
│         → Weekly Policy Creation                    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│         REAL-TIME TRIGGER MONITORING                │
│  OpenWeatherMap │ Open-Meteo │ Mock Civic API        │
│     5 Geo-Fenced Triggers Running Continuously      │
└─────────────────────┬───────────────────────────────┘
                      │ Trigger Fires
                      ▼
┌─────────────────────────────────────────────────────┐
│        ZERO-TOUCH CLAIM INITIATION ENGINE           │
│  Zone Match ✅ │ Active Policy ✅ │ Online ✅ │ No Dupe ✅ │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌───────────────────────────┐
│  MULTI-SIGNAL    │      │   FRAUD DETECTION ENGINE  │
│  VERIFICATION    │      │  Rule-Based (Ph1&2)        │
│  (Mass Claims)   │      │  Random Forest (Ph3)       │
└──────────┬───────┘      └────────────┬──────────────┘
           │                           │
           └──────────┬────────────────┘
                      │ Claim Approved
                      ▼
┌─────────────────────────────────────────────────────┐
│            INSTANT PAYOUT PROCESSING                │
│   Loss Calculated → Severity Applied → UPI Credit   │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              ANALYTICS DASHBOARD                    │
│  Worker View: Earnings Protected, Active Policy     │
│  Insurer View: Loss Ratios, Predictive Analytics    │
└─────────────────────────────────────────────────────┘
```

---

##  PILLAR 1 — AI-Powered Risk Assessment

### 1.1 Shift-Based Income Modeling Engine

The foundation of EasyKavach is a **shift-based income modeling engine**. A Blinkit worker's day is divided into flexible **4–5 hour shifts**. Workers select one or multiple shifts based on their availability.

For each shift, the system estimates the **minimum expected earning** the worker would have made if no disruption occurred. This becomes the basis for:
- Calculating loss during a disruption
- Determining the weekly insurance premium
- Processing the payout amount

Expected shift earnings are **not uniform** — they are dynamically computed using hyperlocal delivery conditions specific to Blinkit operations:

#### Expected Shift Earning Formula (Phase 1 & 2)

```
E = B + (w1 × A) + (w2 × F) + (w3 × D) + (w4 × R) + (w5 × N)
```

| Variable | Meaning | Example Values |
|----------|---------|----------------|
| **B** | Base shift earning | Morning ₹250 \| Afternoon ₹350 \| Evening ₹500 \| Night ₹400 |
| **A** | Area type score | Commercial zone=9 \| College zone=8 \| Residential=6 \| Low-density=4 |
| **F** | Footfall score | `actual_footfall / max_footfall` — normalized 0 to 1 |
| **D** | Warehouse distance score | Inverse distance — closer Blinkit dark store = more deliveries possible |
| **R** | Road accessibility score | All open=1.0 \| Minor closure=0.7 \| Major closure=0.4 \| Flood block=0.1 |
| **N** | Live deliveries per hour | Real-time order density in the worker's active zone |
| **w1–w5** | Assigned weights | 20, 15, 25, 30, 40 |

> **Why these factors?** Blinkit operates on a dark-store model — a worker closer to a dark store in a high-footfall commercial zone during evening peak hours earns significantly more than a worker in a residential zone during morning. This formula captures that reality.

#### Hourly Wage Derivation

```
Hourly Wage (H) = Expected Shift Earning (E) ÷ Shift Duration (hours)
```

> Example: Shift earning = ₹620, Duration = 5 hours → **Hourly Wage = ₹124/hour**

---

### 1.2 Weekly Premium Calculation

```
Weekly Premium = Expected Weekly Loss × Margin Rate (10%)
```

> Example: Expected weekly loss = ₹400 → **Premium = ₹40/week**

**Premium is hyperlocal and personalized:**
- A Blinkit worker in a flood-prone zone (e.g., Velachery, Chennai) pays a higher premium
- A worker in a low-risk commercial zone with good road access pays less
- Workers who choose more shifts or operate in peak hours pay slightly more (higher income = higher loss exposure)

---

### 1.3 Risk Scoring Layer

```
Risk Score = α(Weather Risk) + β(Traffic Disruption Risk) + γ(Pollution Risk)
```

- High-risk zone workers → higher premium + higher payout multiplier in policy
- Risk score is recalculated weekly based on latest zone data
- Displayed on the insurer dashboard as a predictive heatmap

---

### 1.4  Random Forest Upgrade — Phase 3

In Phase 3, the manual weights (w1–w5) in the earning formula are **replaced by a trained Random Forest regression model**.

**Training Data (Mock Historical):**
- Past shift earnings per zone per time slot
- Historical weather events and their impact on deliveries
- Order density patterns by area and time
- Road closure history

**Why Random Forest over Neural Networks:**

| Criteria | Neural Network | Random Forest |
|----------|---------------|---------------|
| Data type suitability | Better for images/text | ✅ Best for structured/tabular data |
| Training data needed | Large dataset required | ✅ Works well on smaller mock data |
| Explainability | Black box | ✅ Feature importance charts |
| Compute required | High (GPU preferred) | ✅ Runs on CPU easily |
| Implementation effort | High | ✅ Medium |
| Judge impressiveness | Moderate | ✅ Very strong with visualizations |

> The model **learns the weights automatically** from patterns — e.g., it discovers that road accessibility matters more than footfall for Blinkit specifically, or that evening shift earnings spike more in college zones than commercial zones.

---

##  PILLAR 2 — Parametric Automation

### 2.1 Real-Time Trigger Monitoring — 5 Geo-Fenced Triggers

The system continuously monitors **5 automated disruption triggers** relevant to Blinkit delivery operations. Every trigger is **geo-fenced** — it only activates for a worker if their registered delivery zone is inside the disrupted area.

| # | Trigger | API Source | Threshold | Income Impact |
|---|---------|-----------|-----------|---------------|
| 1 | **Heavy Rainfall** | OpenWeatherMap | > 50mm/hour | Cannot ride safely |
| 2 | **Extreme Heat** | Open-Meteo | > 42°C | Physical safety risk outdoors |
| 3 | **Hazardous AQI** | OpenWeatherMap Air Pollution API | AQI > 300 | Unsafe air quality for outdoor work |
| 4 | **Flood / Road Block** | Rain data + zone elevation mapping | Road score < 0.2 | Pickup/drop zones inaccessible |
| 5 | **Civic Disruption** | Self-built Mock Civic Alert API | Event flag = true | Curfew, bandh, Section 144 — zone locked |

> **Note:** Mocks and free-tier APIs are used as permitted by the use case document. Real integrations will be added in later phases.

---

### 2.2 Zero-Touch Claim Initiation

When a trigger fires, a claim is **auto-created without the worker doing anything**. The system runs 4 eligibility checks instantly:

```
CHECK 1 → Zone Match:      Worker's active zone ∈ disrupted area?
CHECK 2 → Active Policy:   Worker has a valid weekly policy right now?
CHECK 3 → Online Status:   Worker was active on platform at disruption time?
CHECK 4 → Duplicate Check: No existing claim for this event already?

All 4 PASS → Claim Auto-Initiated ✅
Any FAIL  → Claim Rejected / Flagged ❌
```

**Disruption Loss Calculation:**

```
Base Loss    = Hourly Wage (H) × Disruption Duration (hours)
Adjusted Loss = Base Loss × Severity Multiplier
```

**Severity Multipliers by Event Type:**

| Disruption Event | Severity Multiplier | Rationale |
|-----------------|-------------------|-----------|
| Heavy Rain | 1.0× | Standard income loss |
| Flood | 1.3× | Complete zone shutdown, longer recovery |
| Extreme Heat | 0.8× | Partial — some workers may still operate |
| AQI Hazard | 0.7× | Partial — affects outdoor exposure |
| Curfew / Bandh | 1.5× | Total lockdown, highest income loss |

> **Example:** Hourly wage ₹124 × 3 hours of heavy rain × 1.0 = **₹372 auto-payout**

---

### 2.3 Disruption Duration Tracking

The system doesn't just detect when a disruption **starts** — it continuously tracks how long it lasts:
- If rain starts at 6 PM and stops at 9 PM → 3 hours of disruption logged
- If a worker's shift was 4 PM–9 PM → only 3 hours of the 5-hour shift is compensated (proportional)
- Prevents over-claiming for partial disruptions

---

### 2.4 Mass Claim Handling — Multi-Signal Event Verification

When **50+ workers from the same zone** submit claims within a short window, the system identifies it as a **mass claim event** and runs layered verification before approving:

**Step 1 — API Cross-Check:**
- Environmental events: Weather/AQI APIs confirm the condition externally
- Social events: Mock civic API / news keyword signals confirm curfew or bandh

**Step 2 — Traffic Signal Analysis:**
- A sudden drop in traffic speed or road closures in the affected zone strengthens event confidence

**Step 3 — Crowd Verification:**
- Nearby workers receive a push prompt: *"Are deliveries possible in your area right now?"*
- Majority response (Yes/No) feeds directly into the confidence score

**Step 4 — Claim Density Pattern Analysis:**
- Gradual claim increase over 30–60 mins → **normal pattern**
- Sudden spike within 5 mins → **potential coordinated fraud**

**Event Confidence Score Output:**

```
🟢 HIGH CONFIDENCE   → Auto-approve all eligible individual claims
🟡 MEDIUM CONFIDENCE → Spot-verify 20% of claims before approving
🔴 LOW CONFIDENCE    → Flag all claims for manual review, no payouts
```

> Even in a high-confidence mass event, every individual claim still runs its own 4-check eligibility validation before payout.

---

##  PILLAR 3 — Intelligent Fraud Detection

### 3.1 Phase 1 & 2 — Rule-Based Fraud Engine

The system monitors the following fraud signals at the individual claim level:

| Fraud Signal | Detection Method | Action |
|-------------|-----------------|--------|
| Worker goes online **seconds before** trigger fires | Pre-trigger time gap check | Flag as suspicious pattern |
| Worker's GPS doesn't match registered delivery zone | Location validation at claim time | Reject — location spoofing |
| Claims for two overlapping events in the same shift window | Timestamp overlap check | Reject — duplicate claim |
| Claim rate **disproportionately high** vs. peers in same zone | Percentile anomaly check | Flag for manual review |
| Sudden activation of dormant accounts during disruptions | Account activity history check | Flag — suspicious activation |

And at the mass event level:
- Abnormal claim spike within 5 minutes (not gradual) → coordinated fraud pattern flagged
- Workers with zero prior activity history all going online simultaneously → suspicious mass activation

---

### 3.2 Phase 3 —  Random Forest Fraud Classifier

A **Random Forest binary classifier** trained on labeled claim data (legitimate vs. fraudulent):

**Input Features:**
```
- online_to_trigger_gap      (seconds between worker going online and trigger)
- gps_zone_match_score       (0–1 confidence of location authenticity)
- historical_claim_frequency (ratio vs. zone average)
- claim_density_rank         (worker's rank in mass event)
- shift_consistency_score    (does claimed shift match historical patterns?)
- duplicate_flag             (binary)
- account_age_days           (newer accounts get higher scrutiny)
```

**Output:**
```json
{
  "fraud_probability": 0.82,
  "decision": "FLAG_FOR_REVIEW",
  "top_signals": ["pre_trigger_online", "new_account", "high_claim_frequency"]
}
```

Auto-approve if fraud_probability < 0.2 | Flag if 0.2–0.6 | Reject if > 0.6

---

##  PILLAR 4 — Instant Payout Processing

### Payout Flow

```
1. Claim Approved (auto or manual review)
         ↓
2. Payout Amount Calculated:
   Adjusted Loss = Hourly Wage × Disruption Hours × Severity Multiplier
         ↓
3. Zone-Risk Multiplier Applied
   (flood-prone zones get higher payout ceiling per policy terms)
         ↓
4. Payment dispatched via Razorpay Test Mode / UPI Simulator
         ↓
5. Worker Push Notification:
   "₹372 credited to your UPI for 3hrs rain — Evening Shift, Koramangala ✅"
         ↓
6. Worker Dashboard Updated:
   "Earnings Protected This Week: ₹372"
```

### Payment Channels (Mock/Sandbox)
- **Razorpay Test Mode** — simulates UPI and bank transfer payouts
- **Stripe Sandbox** — alternative digital wallet simulation
- **Custom UPI Simulator** — self-built UI showing transaction ID and credit confirmation

---

##  Sample Full System Output

```json
{
  "worker_id": "BLK_2847",
  "worker_name": "Ravi Kumar",
  "shift": "Evening (4PM–9PM)",
  "shift_duration_hours": 5,
  "zone": "Koramangala, Bengaluru",
  "area_type": "Commercial",
  "warehouse_distance_km": 1.2,
  "footfall_score": 0.85,
  "road_accessibility": 1.0,
  "deliveries_per_hour": 4,
  "expected_shift_earning": "₹620",
  "hourly_wage": "₹124",
  "disruption_type": "Heavy Rainfall",
  "disruption_duration_hours": 3,
  "severity_multiplier": 1.0,
  "base_loss": "₹372",
  "adjusted_payout": "₹372",
  "weekly_premium": "₹42",
  "risk_score": "High",
  "fraud_check": "Passed",
  "fraud_probability": 0.04,
  "claim_status": "Auto-Approved",
  "payout_channel": "UPI",
  "payout_status": "₹372 Credited",
  "transaction_id": "TXN_SHK_20260319_8472"
}
```

---

##  ML Evolution Roadmap

| Phase | Dates | ML Approach | Purpose |
|-------|-------|-------------|---------|
| **Phase 1** | Mar 4–20 | Weighted formula (manual w1–w5) | Expected earnings + weekly premium |
| **Phase 2** | Mar 21–Apr 4 | Rule-based fraud engine | Individual claim fraud detection |
| **Phase 3** | Apr 5–17 | Random Forest × 2 | Earnings prediction (replaces weights) + fraud probability classifier |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js | Worker and insurer dashboards |
| **Backend** | FastAPI (Python) | REST APIs, trigger engine, claim processor |
| **ML — Phase 1&2** | Python (NumPy, Pandas) | Weighted formula + rule-based fraud |
| **ML — Phase 3** | scikit-learn (Random Forest) | Earnings prediction + fraud classifier |
| **Weather API** | OpenWeatherMap (free tier) | Rain, temperature triggers |
| **Weather API 2** | Open-Meteo (free, no key) | Heat, extended forecasts |
| **AQI API** | OpenWeatherMap Air Pollution API | AQI > 300 trigger |
| **Civic Trigger** | Self-built Mock Civic Alert API | Curfew, bandh simulation |
| **Mock Platform API** | Custom built | Simulated worker online/offline status |
| **Payment** | Razorpay Test Mode / UPI Simulator | Instant mock payouts |
| **Database** | PostgreSQL / Firebase | Worker profiles, policies, claims |
| **Deployment** | Docker + Cloud | Containerized services |

---

##  6-Week Development Timeline

### Phase 1 — Seed (March 4–20): Ideate & Know Your Delivery Worker
- [x] Define persona: Blinkit Delivery Partners
- [x] Design full system architecture
- [x] Define parametric triggers (5 triggers)
- [x] Design shift-based income model + weekly premium formula
- [x] Plan ML roadmap (weighted → Random Forest)
- [x] Define fraud detection strategy
- [x] Write README (this document)
- [x] Record 2-minute strategy + prototype video *(link below)*

### Phase 2 — Scale (March 21–April 4): Protect Your Worker
- [ ] Worker registration & onboarding flow
- [ ] Weekly policy creation with dynamic premium
- [ ] Live trigger monitoring (5 triggers running)
- [ ] Zero-touch claim initiation engine
- [ ] Rule-based fraud detection
- [ ] Basic worker dashboard

### Phase 3 — Soar (April 5–17): Perfect for Your Worker
- [ ] Random Forest earnings prediction model (replaces weighted formula)
- [ ] Random Forest fraud classifier
- [ ] Instant payout via Razorpay sandbox
- [ ] Full analytics dashboard (worker + insurer views)
- [ ] Mass claim handling + Event Confidence Score
- [ ] 5-minute demo video + final pitch deck

---

## 📋 Deliverables Checklist

### Phase 1 ✅
- [x] Idea document (this README)
- [x] System architecture diagram
- [x] GitHub repository
- [x] Persona defined: Blinkit Delivery Partners
- [x] Weekly premium model explained
- [x] Parametric triggers defined (5 triggers)
- [x] AI/ML integration plan documented
- [x] Tech stack outlined
- [x] 2-minute strategy video → *(add link here)*

---

##  Team

| Name | Role |
|------|------|
| *Daksh Gupta* | *Team Lead* |
| *Pratyaksh Soni* | *Team Member* |
| *Akshita Singh Tyagi* | *Team Member* |
| *Saahas Singh* | *Team Member* |
| *Abhivandan Tandon* | *Team Member* |

---

##  Links

| Resource | Link |
|----------|------|
| GitHub Repository | *https://github.com/Daksh1509/EasyKavach.git* |
| Phase 1 Demo Video | *https://youtu.be/jErzdyGHV2s?si=LqyW7mtdBG8sKh3T* |
| Prototype link | *https://attached-assets--guptadaksh1509.replit.app* |

---

