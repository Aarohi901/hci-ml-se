# IIIT Pune BusMate — Campus Shuttle Booking & Allocation System

An auditable, explainable, and accessible transit booking and seat allocation platform developed specifically for the **Indian Institute of Information Technology (IIIT) Pune Campus Shuttle Service**.

Built in strict compliance with the Part 1 specification: deterministic rule-based priority resolution, 3-level transparent explainability, emergency held-back seat quotas, and an authenticated student history portal.

---

## 🌟 Key Architecture & Features

### 1. Deterministic Rule-Based Allocation Policy (Zero ML Contamination)
Per Section 5.3 & 6.4 of the specification, all seat and standing allocations are **100% deterministic, transparent, and auditable**:
- **Rule 1 — Accessibility Need**: Front-row priority seating reserved for commuters with declared reduced mobility or medical needs.
- **Rule 2 — Travel Reason Hierarchy**:
  - `Medical` (Tier 1 Priority — Emergency Quota Eligible)
  - `Train Connection` (Tier 2 Priority — Talegaon suburban rail connections)
  - `Exam / Academic Deadline` (Tier 3 Priority)
  - `Shopping / Personal / Other` (General Commuter Tiers)
- **Rule 3 — Carry-Over Credits**: Automatically prioritizes students with unserved/waitlisted requests from the past 14 days ($C \in \{0, 1, 2, 3\}$).
- **Rule 4 — Weekly Booking Balancing**: Fair distribution preventing single commuters from monopolizing daily peak services.
- **Rule 5 — Deterministic Timestamp Order**: Submissions sorted by exact millisecond timestamp as the final tie-breaker.

### 2. Emergency Held-Back Seat Quota (Section 6.2)
- **52-Seater Shuttles (Tata Starbus EV / Ashok Leyland)**:
  - 52 Seats (60 Total Capacity with 8 Standing Places).
  - **3 Seats Held Back** (`1A`, `1B`, `2A`) for medical emergencies and staff priority.
  - General commuters allocate from the remaining **49 seats**.
- **32-Seater Shuttles (Eicher Skyline Compact)**:
  - 32 Seats (37 Total Capacity with 5 Standing Places).
  - **2 Seats Held Back** (`1A`, `1B`).
  - General commuters allocate from the remaining **30 seats**.
- **Emergency Priority Override ("Mixed Condition")**:
  - Verified medical or accessibility requests automatically unlock and allocate from the emergency quota when all general seats are exhausted.
  - Generates faithful Level 2 explanation: *"Allocated from Emergency Reserve Quota due to verified medical need / accessibility priority."*

### 3. 3-Level Deterministic Explainability & Counterfactual Audit
- **Level 1 — Outcome Chip**: Instant status (`Confirmed Seat`, `Standing Place`, or `Waitlisted Rank #X`) without empty tags.
- **Level 2 — Plain-Language Reason**: Faithful 1–2 sentence explanation articulating the exact policy rule applied.
- **Level 3 — Policy Decision Trace & Exact Counterfactual**:
  - Full 5-rule audit breakdown (Rules 1 to 5) with zero arbitrary point scores.
  - Computed actionable counterfactual answering: *"What would change this decision?"* (e.g., cancellations required, alternative window options).
  - Clean constraint failure card for infeasible requests (e.g. Direction Mismatch) with zero `NaN` metrics.
- **Stage B Alternative Suggestions**: One-click shuttle switching within $\pm 30$ min or $\pm 60$ min flexible windows.

### 4. Dedicated "My History" Student Screen (`/history`)
- **Summary Stats Header**: Live tracking of Total Requested, Confirmed & Travelled, Waitlisted, Cancelled Trips, and Active Carry-Over Credits ($X/3$).
- **Filterable Tabs**: `[ All Trips ]`, `[ Active / Upcoming ]`, `[ Completed ]`, and `[ Waitlisted / Cancelled ]`.
- **Interactive Modals**:
  - *View Explanation & Audit Trace*: Accesses the complete 3-level audit trace for past and current decisions.
  - *Cancel Request*: Releases upcoming bookings before cutoff, instantly reallocating places to waitlisted students.
  - *Download E-Ticket*: Printable **IIIT Pune Campus Shuttle E-Pass** with QR code token.

### 5. Campus Corridor & Timetable
- **Corridor**: IIIT Pune Main Gate ⇄ Talegaon Railway Station (14.2 km).
- **8 Official Stops**:
  1. IIIT Pune Campus (Main Gate)
  2. L&T Circle
  3. Restaurant Chain
  4. Medical Store
  5. Godavari Boys Hostel (Off-Campus Terminus)
  6. Hospital
  7. Laptop Service Centre
  8. Talegaon Station
- **10-Trip Daily Timetable (T1 to T10)**: 08:00 to 22:15 departures spanning morning classes, post-lunch runs, evening study returns, and late night transit.

### 6. Full Accessibility Engine & Multi-Language Support
- **Accessibility Suite (`Ctrl + F2`)**: 14+ assistive modes (High Contrast, Dyslexia Typography, ADHD Reading Mask, Text Scaling, Big Cursor, Left-Hand Mode).
- **Tri-Lingual Localization**: Seamless client-side i18n switching across **English**, **हिन्दी (Hindi)**, and **मराठी (Marathi)**.

---

## 🛠️ Technology Stack
- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React
- **Deterministic Engine**: Pure JavaScript OR/Queue Formulation (`src/utils/allocationEngine.js`)
- **Backend / API**: Node.js, Express, Prisma ORM
- **Testing**: Deterministic verification suite (`scripts/test_verification.mjs`)

---

## 🚀 Quickstart & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Aarohi901/hci-ml-se.git
cd hci-ml-se
npm install
```

### 2. Run Deterministic Test Verification
```bash
node scripts/test_verification.mjs
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 4. Production Build
```bash
npm run build
```

---

## 📄 License
Academic Research & Educational Project — Developed for Human-Computer Interaction & Software Engineering Evaluation at IIIT Pune.
