# TripSplit — Modern Travel Expense Sharing App

**TripSplit** is a modern, mobile-first travel expense-sharing application built with **React**, **Node.js**, **Express**, **MongoDB**, and **Mongoose**. It empowers friends traveling together to effortlessly record expenses, understand their true personal spending, track multi-currency obligations with frozen conversion snapshots, and settle group debts to zero without confusion.

---

## 🌟 Key Features & Vertical Slice Delivered

- **Deterministic Accounting Engine**: Integer minor units arithmetic with zero floating-point drift. Preserves exact sum totals on equal, exact, percentage, and weighted splits (e.g., 100 split 3 ways yields 33.34, 33.33, 33.33).
- **Group Net Balance Invariant**: $\sum \text{net\_balances} \equiv 0$ strictly enforced. Net Balance = Payer contributions − Personal shares + Repayments sent − Repayments received.
- **Simplified Debt Settlements**: Greedy minimum-cash-flow transfer suggestions that preserve net balances while minimizing the number of transactions needed to settle a trip to zero.
- **Multi-Currency Support**: Variable minor unit currencies (e.g. JPY=0, USD/EUR/INR=2, BHD/KWD=3). Freezes manual or exchange rates into immutable conversion snapshots ($1\text{ original unit} = \text{rate units of base currency}$).
- **Guest Participants & Identity Claiming**: Add friends as guests immediately without requiring accounts. Guests can later claim their membership using scoped, single-use invitation tokens without altering financial records.
- **Rich Analytics & Visual Charts**:
  - **Spending by Friend**: Grouped horizontal bars comparing *Amount Paid* vs *Personal Share* with toggleable accessible table.
  - **Spending by Category**: Interactive SVG Donut chart with center totals, percentages, and click-to-filter capability.
- **Explain Balance**: Deep mathematical breakdown per member detailing contributing expenses and repayment transfers.
- **Reversible Repayments**: Auditable transfer records with full reversal history (repayments never inflate spending charts).
- **CSV Ledger Export**: Complete expense export ready for spreadsheets or archiving.
- **Private Attachment Storage**: Authorized member-only access to receipt photos and documents.

---

## 🏗️ Project Architecture

```text
TripSplit/
├── client/                     # Frontend (React 18, TypeScript, Vite)
│   ├── src/
│   │   ├── app/                # Layout and core navigation
│   │   ├── components/         # Reusable UI (Avatar, Badge, Modal, Charts)
│   │   ├── context/            # AuthContext with token persistence
│   │   ├── features/           # Feature slices:
│   │   │   ├── auth/           # Login & Registration modal
│   │   │   ├── groups/         # Trip list & Create trip modal
│   │   │   ├── expenses/       # Add expense modal, list, and detail view
│   │   │   ├── balances/       # Net balances, explain formula, settle dialog
│   │   │   ├── members/        # Member cards, guest creation, invite generator
│   │   │   ├── activity/       # Audit trail of mutations
│   │   │   └── overview/       # Stat cards, dual MVP charts, recent list
│   │   ├── lib/                # API client & currency formatting
│   │   └── index.css           # Vanilla CSS design system
├── server/                     # Backend API (Node.js, Express, TypeScript)
│   ├── src/
│   │   ├── domain/             # Pure accounting domain modules
│   │   │   ├── currencies.ts   # Minor unit definitions & formatting
│   │   │   ├── money.ts        # Decimal-safe conversions & frozen snapshots
│   │   │   ├── splitting.ts    # Equal, Exact, Percentage, and Shares splits
│   │   │   ├── balances.ts     # Authoritative group balances & explanation engine
│   │   │   └── settlements.ts  # Greedy min-cash-flow transfer suggestions
│   │   ├── models/             # Mongoose schemas (User, Group, Membership, Expense, Settlement, Activity, Invitation)
│   │   ├── controllers/        # Request/Response handlers
│   │   ├── middleware/         # Auth (JWT) & Group permission verification
│   │   ├── adapters/           # Private file storage adapter
│   │   ├── routes/             # REST endpoints (/api/v1/...)
│   │   ├── tests/              # Jest unit & integration test suites
│   │   ├── db.ts               # Mongoose connection with embedded MongoMemoryServer fallback
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entrypoint
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Install Dependencies
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Run Locally (Development)
You can start both server and client dev servers concurrently from the root directory:
```bash
npm run dev
```
Or start them individually:
- **Backend API**: `npm run server` (runs on `http://localhost:5000`)
- **Frontend App**: `npm run client` (runs on `http://localhost:3000`)

*Note: The server automatically connects to `process.env.MONGODB_URI` if provided. If not provided or unavailable, it transparently initializes an embedded in-memory MongoDB instance with zero configuration required.*

---

## 🧪 Running Automated Verification Tests

TripSplit includes a comprehensive Jest test suite that verifies all 15 scenarios from the Blueprint:
```bash
npm --prefix server test
```

### Verified Scenarios:
1. **INR 100 split three ways**: Preserves exact total (33.34, 33.33, 33.33) with deterministic rounding.
2. **Payer excluded from participants**: Payer contribution recorded; personal share is 0.
3. **Multi-payer expenses**: Multi-payer contributions validated to strictly match bill total.
4. **Exact & Percentage mismatch validation**: Rejected with clear field-level guidance.
5. **Non-2-decimal currencies**: JPY (0 decimals) and BHD (3 decimals) formatted and rounded with currency-specific precision.
6. **Multi-currency conversions**: Frozen exchange rates and rate directions persisted immutably.
7. **Greedy settlement simplification**: Debt transfer suggestions settle sample trips to zero.
8. **Partial repayments**: Debt decreases by exact paid base amount with updated remaining balance.
9. **Voided & edited expenses**: Recalculates balances and updates charts with visible history.
10. **Full End-to-End API Suite**: Covers registration, login, trip group creation, guest members, equal splits, non-creator payers, balance derivation, greedy settlement suggestions, partial repayments, explain balance ledger, CSV exports, and security checks.
