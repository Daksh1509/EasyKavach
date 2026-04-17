import time
import sys

def print_step(title):
    print(f"\n{'-'*60}")
    print(f"\033[1m{title}\033[0m")
    print(f"{'-'*60}")

def demo_worker_registration():
    print_step("1. 🔐 Worker Registration & Onboarding")
    time.sleep(1)
    print("""Worker Profile Created:
- Worker ID: BLK_2847
- Zone: Koramangala, 560034 (Zone A — 0–1km from dark store)
- Organisation: Blinkit
- Risk Level: High (40/100 zone score)
- Weekly Premium: ₹42
- Hourly Support Rate: ₹152
- Policy Status: Inactive (pending payment)""")

def demo_income_engine():
    print_step("2. 🧠 ML-Powered Shift Income Engine")
    time.sleep(1)
    print("""Shift: Evening (4PM–9PM)
Zone: Koramangala / Commercial
Area Score: 9/10
Footfall Score: 0.82
Dark Store Distance: 0.8–1.4 km (Zone A)
Road Accessibility: 1.0 (fully open)
Live Deliveries/hr: 14
Base Earning: ₹500

Expected Shift Earning: ₹760
Hourly Wage: ₹152
Weekly Expected Loss (risk-adjusted): ₹420
Weekly Premium: ₹42""")

def demo_policy_activation():
    print_step("3. 📋 Policy Activation Dashboard")
    time.sleep(1)
    print("""Policy ID: 57dbc71d-e7b4-45e9-845b
Status: ✅ Active
Cover Period: 16 Apr 2026 – 23 Apr 2026
Weekly Premium Paid: ₹42
Expected Weekly Support: ₹378
Risk Level: 40% (Medium-High)
Platform: Blinkit
Work Zone: Koramangala Blr (560034)
Claims on Record: 0
Recent Payouts: ₹0""")

def demo_trigger_monitoring():
    print_step("4. 🌦️ Real-Time Trigger Monitoring (5 Triggers)")
    time.sleep(1)
    print("""🟢 Heavy Rainfall Monitor     — Normal (12mm/hr — threshold: 50mm)
🟢 Extreme Heat Monitor       — Normal (34°C — threshold: 42°C)
🟢 AQI Hazard Monitor         — Normal (AQI 87 — threshold: 300)
🔴 Flood / Road Block         — ALERT (Road score: 0.1 — Zone affected)
🟢 Civic Disruption Monitor   — Normal (No active curfew/bandh)

Last checked: 11:02 PM IST""")

def demo_zero_touch_claim():
    print_step("5. ⚡ Zero-Touch Claim Initiation")
    time.sleep(1)
    print("""🚨 TRIGGER FIRED: Heavy Rainfall — 58mm/hr detected
Zone: Koramangala, 560034

Eligibility Check:
✅ Zone match confirmed (worker zone = affected zone)
✅ Active policy exists (valid till 23 Apr 2026)
✅ Worker online status: Active on platform
✅ No duplicate claim for this event

Claim #1023 AUTO-INITIATED
Disruption Type: Heavy Rainfall
Severity Multiplier: 1.0x
Disruption Start: 11:04 PM IST
Status: Monitoring duration...""")

def demo_verification_engine():
    print_step("6. 📊 Multi-Signal Event Verification Engine")
    time.sleep(1)
    print("""Mass Claim Event Detected
Zone: Koramangala, 560034
Claims received in last 30 mins: 67

Verification Layer 1 — API Cross-check:
  Weather API: ✅ Confirmed (62mm/hr rainfall)
  Civic API: ✅ No conflicting event

Verification Layer 2 — Traffic Signal:
  Avg traffic speed in zone: 8 km/hr (normal: 35 km/hr) ✅

Verification Layer 3 — Crowd Verification:
  Workers polled: 24
  Confirming disruption: 21/24 (87.5%) ✅

Verification Layer 4 — Claim Density Pattern:
  Claim growth rate: Gradual ✅ (not a spike)

Event Confidence Score: 91% — HIGH ✅
Decision: AUTO-APPROVE all eligible claims""")

def demo_payout_calculation():
    print_step("7. 💸 Payout Calculation & Processing")
    time.sleep(1)
    print("""Claim #1023 — Payout Calculation

Hourly Wage: ₹152
Disruption Duration: 3 hours
Severity Multiplier: 1.0x (Heavy Rain)
Zone Risk Multiplier: 1.1x (flood-prone history)

Adjusted Payout = ₹152 × 3 × 1.0 × 1.1 = ₹502

Payment Method: UPI
UPI ID: daksh@okicici
Transaction ID: TXN_EK_20260416_1023
Status: ✅ ₹502 Credited

Worker Notification:
"₹502 credited for 3 hours of rain disruption
— Evening Shift, Koramangala | Claim #1023\"""")

def demo_fraud_detection():
    print_step("8. 🔍 Fraud Detection Engine")
    time.sleep(1)
    print("""Fraud Check — Claim #1023

Individual Signals:
✅ GPS location matches registered zone
✅ Online-to-trigger time gap: 47 mins (normal)
✅ No duplicate claim for this event
✅ Claim rate vs peers: Normal (2 claims / 8 weeks)

Mass Event Signals:
✅ Claim density pattern: Gradual (not coordinated spike)
✅ Worker activation pattern: Normal

Fraud Probability Score: 0.04 (Low Risk)
Decision: ✅ AUTO-APPROVED""")

def demo_concurrent_disruption():
    print_step("9. 🗂️ Concurrent Disruption Handler (Edge Case)")
    time.sleep(1)
    print("""⚠️ Concurrent Disruption Detected

Active Triggers:
  1. Heavy Rainfall — Multiplier: 1.0x
  2. Civic Disruption (Curfew) — Multiplier: 1.5x

Conflict Resolution Policy: Highest Severity Wins
Selected Multiplier: 1.5x (Curfew)
Supplemental Bonus: +0.1x (secondary trigger)
Final Applied Multiplier: 1.6x

Payout = ₹152 × 3 hrs × 1.6 = ₹729.60""")

def demo_worker_dashboard():
    print_step("10. 👤 Worker Dashboard (My Cover)")
    time.sleep(1)
    print("""My Cover — Abhivandan Tandon

Active Policy: ✅
Cover Period: 02 Apr – 09 Apr 2026
Weekly Premium: ₹38
Expected Weekly Support: ₹378
Risk Level: 40%

This Week:
Protected So Far: ₹8,450
Claims on Record: 2
Recent Payout: ₹502 (16 Apr, Rain — Koramangala)

Cash Payout Breakdown:
Area: Koramangala / Commercial
Shift Hours: 5 hrs (Evening)
Dark Store Range: 0.8–1.4 km
Severity: 1.0x
Estimated Support: ₹760""")

def demo_insurer_analytics():
    print_step("11. 📈 Insurer Analytics Dashboard")
    time.sleep(1)
    print("""Insurer Dashboard — Easy Kavach

Active Policies: 1,247
Total Premium Collected This Week: ₹52,374
Total Claims This Week: 83
Total Payouts This Week: ₹41,200
Loss Ratio: 78.7% (healthy range: 60–85%)

Zone Risk Heatmap:
🔴 Velachery, Chennai — Flood Risk: High
🟡 Koramangala, Bengaluru — Rain Risk: Medium
🟢 Indiranagar, Bengaluru — Risk: Low

Top Trigger This Week: Heavy Rainfall (61%)
Fraud Claims Blocked: 7
Avg Claim Processing Time: 18 seconds""")

def demo_random_forest():
    print_step("12. 🌲 Random Forest Upgrade (Phase 3 ML)")
    time.sleep(1)
    print("""Random Forest Model — Feature Importance

Training Data: 5,000 synthetic shift records
Model Accuracy: 91.3% (R² score)

Feature Importance:
  Live Deliveries/hr:     32.4%
  Dark Store Distance:    24.1%
  Shift Time (Evening):   18.7%
  Area Type Score:        14.2%
  Road Accessibility:      7.3%
  Footfall Score:          3.3%

Prediction for Worker BLK_2847 (Evening, Koramangala):
  Manual Formula Output: ₹760
  Random Forest Output:  ₹784
  Difference: +₹24 (model found higher demand pattern)""")

if __name__ == "__main__":
    print("\n🚀 STARTING EASYKAVACH END-TO-END DEMONSTRATION 🚀")
    
    demo_worker_registration()
    demo_income_engine()
    demo_policy_activation()
    demo_trigger_monitoring()
    demo_zero_touch_claim()
    demo_verification_engine()
    demo_payout_calculation()
    demo_fraud_detection()
    demo_concurrent_disruption()
    demo_worker_dashboard()
    demo_insurer_analytics()
    demo_random_forest()
    
    print("\n✅ EasyKavach End-To-End Simulation Complete ✅\n")
