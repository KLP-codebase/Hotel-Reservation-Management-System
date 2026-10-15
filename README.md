<div align="center">

# ✦ Sky Nest HRGSMS

**Hotel Reservation & Guest Services Management System**

A production-grade, multi-branch hotel management platform built for **SkyNest Hotels (Pvt) Ltd** — deployed live at **[skynest.me](https://skynest.me)**.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-4.19-green?logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Azure](https://img.shields.io/badge/Deployed_on-Azure_VM-0078D4?logo=microsoftazure)](https://azure.microsoft.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

> 📖 **Definitive Reference:** [`Resources/ARCHITECTURE.md`](Resources/ARCHITECTURE.md) — complete engineering specification, 17-relation relational model, two-tier concurrency control, 4-tier Sri Lankan statutory tax engine, and full REST contract.

</div>
## 🏨 About

Sky Nest HRGSMS replaces legacy fragmented software and manual ledgers across three luxury Sri Lankan properties with a single unified platform:

| Branch | Location | Type |
|---|---|---|
| **Colombo Sky Tower** | Colombo | Flagship urban luxury high-rise |
| **Kandy Misty Peak** | Kandy | Hill-country wellness retreat |
| **Galle Coastal Villa** | Galle | Colonial seaside heritage resort |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CLIENT / CONSUMER TIER                           │
│   Guest (Public)       Registered Guest (Portal)     Receptionist / Mgr  │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ HTTPS  (skynest.me via Cloudflare DNS)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│       REVERSE PROXY — Caddy 2 (Azure VM, India South Central)            │
│  TLS termination · /api/v1/* → backend · /* → frontend                  │
└──────────┬──────────────────────────────────────────┬────────────────────┘
           │ :3000                                    │ :4000
           ▼                                          ▼
┌──────────────────────────┐             ┌────────────────────────────────┐
│  PRESENTATION TIER       │             │  APPLICATION TIER              │
│  Next.js 16 (React 19)   │             │  Express 4 (Node 20)           │
│  Tailwind CSS v4         │             │  JWT · Zod · RBAC              │
│  GSAP 3 + ScrollTrigger  │◄────REST────│  Repository Pattern            │
└──────────────────────────┘             └──────────────┬─────────────────┘
                                                        │ pg Pool (raw SQL)
                                                        ▼
                                         ┌──────────────────────────────────┐
                                         │  PERSISTENCE TIER                │
                                         │  PostgreSQL 15 (Docker, Azure VM)│
                                         │  18 tables · 26 migrations        │
                                         │  PL/pgSQL triggers & procedures   │
                                         └──────────────────────────────────┘
```

### Five Architectural Tenets

1. **Database-First Integrity (Zero ORM)** — PostgreSQL is the single source of truth. All queries use raw parameterized SQL via the `pg` driver. No Prisma, no Sequelize.
2. **Strict 3NF / BCNF Normalization with Historical Snapshots** — `rate_at_booking`, `price_at_usage`, and frozen invoice line items preserve financial integrity against future tariff changes.
3. **Clean N-Tier Decoupling** — Presentation ↔ Application ↔ Persistence are fully separated processes.
4. **Single Authoritative REST Backend** — Express on port 4000 is the exclusive API surface. Next.js has no duplicate route handlers.
5. **Editorial Luxury Design System** — Cinzel serif + Plus Jakarta Sans, GSAP orchestration, and a bespoke Tailwind v4 token layer.

---

## 🚀 Live Demo

| Surface | URL |
|---|---|
| **Public Website & Booking** | [https://skynest.me](https://skynest.me) |
| **Staff Dashboard** | [https://skynest.me/dashboard](https://skynest.me/dashboard) |
| **API Health Check** | `GET https://skynest.me/health` |

---

## 🗂️ Project Structure

```
Hotel-Reservation-Management-System/
├── src/                              # Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── (auth)/                   # /login, /register, /verify-email
│   │   ├── dashboard/                # Hub + (management)/ sub-pages
│   │   │   └── (management)/
│   │   │       ├── bookings/         # Booking list + detail view
│   │   │       ├── branches/         # Branch management (admin)
│   │   │       ├── rooms/            # Room inventory
│   │   │       ├── staff/            # Staff CRUD (admin)
│   │   │       ├── billing/          # Invoice & payment centre
│   │   │       ├── catalogue/        # Room-type catalogue editor
│   │   │       ├── reports/          # Executive analytics
│   │   │       └── activity/         # Audit log viewer
│   │   ├── book/                     # Public availability search + confirm
│   │   ├── contact/                  # Contact page
│   │   └── rates/                    # Public rate sheet
│   ├── components/
│   │   ├── SkyNestHomePage.tsx       # GSAP marketing homepage
│   │   ├── ui/                       # SkyNestConcierge chatbot, shared UI
│   │   └── dashboard/                # Role-specific dashboard widgets
│   ├── lib/
│   │   ├── api-client.ts             # apiFetch() façade + toNum() decimal guard
│   │   └── auth.ts                   # JWT session helpers
│   └── styles/
│       └── globals.css               # Tailwind v4 @theme tokens + keyframes
│
├── backend/                          # Express 4 REST API (Port 4000)
│   └── src/
│       ├── app.ts                    # App factory + route mounting
│       ├── server.ts                 # HTTP server entry point
│       ├── config/
│       │   ├── db.ts                 # DatabasePool singleton + DbAdapter
│       │   └── env.ts                # Validated environment config
│       ├── routes/                   # Express route controllers
│       │   ├── auth.routes.ts        # Register, login, JWT refresh, email verify
│       │   ├── bookings.routes.ts    # Full booking lifecycle (CRUD + checkout)
│       │   ├── invoices.routes.ts    # 4-tier tax cascade + invoice upsert
│       │   ├── services.routes.ts    # Ancillary service usage folio
│       │   ├── dashboard.routes.ts   # KPI aggregates (occupancy, revenue, ADR)
│       │   ├── availability.routes.ts# Real-time room availability check
│       │   ├── tax.routes.ts         # Tax configuration management (admin)
│       │   ├── chat.routes.ts        # AI Concierge (Gemini) endpoint
│       │   ├── contact.routes.ts     # Contact form + email notification
│       │   ├── rooms.routes.ts       # Room inventory CRUD
│       │   ├── branches.routes.ts    # Branch management
│       │   ├── staff.routes.ts       # Staff accounts + roles
│       │   ├── guests.routes.ts      # Guest profile management
│       │   ├── audit.routes.ts       # Audit log access
│       │   └── reports.routes.ts     # Snapshot reporting
│       ├── repositories/             # Raw SQL data access layer
│       ├── services/
│       │   ├── concierge.service.ts  # Gemini AI Concierge with DB grounding
│       │   ├── email.service.ts      # Nodemailer transactional emails
│       │   ├── auth.service.ts       # JWT + bcrypt auth logic
│       │   └── staff.service.ts      # Staff invitation workflow
│       └── middleware/
│           ├── auth.middleware.ts    # JWT verification
│           ├── rbac.middleware.ts    # Role-Based Access Control
│           └── validate.middleware.ts# Zod schema validation
│
├── database/
│   ├── schema.sql                    # PostgreSQL DDL (enums, tables, constraints)
│   ├── migrations/                   # 26 numbered migration files (001 → 026)
│   ├── procedures/
│   │   └── sp_Generate_Final_Bill.sql# 4-tier tax engine stored procedure
│   └── seeds/                        # Reference & demo data
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml        # Local PostgreSQL container
│   │   └── init.sql                  # Schema source of truth (synced w/ migrations)
│   └── terraform/                    # IaC (optional provisioning)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, build
│       └── deploy.yml                # Deploy to Railway on push to main
│
├── Resources/                        # Technical documentation
│   ├── ARCHITECTURE.md               # Full engineering specification
│   ├── SkyNest_HRGSMS_SRS_IEEE.md   # IEEE Std 830 SRS
│   ├── SkyNest_HRGSMS_Database_Design.md
│   └── SkyNest_Site_Map_and_Content_Copy.md
│
└── scripts/                          # DB migration & seeding utilities
```

---

## ✨ Key Features

### 🏠 Guest-Facing
- **Public booking flow** — real-time availability search, room selection with live pricing in LKR, and booking confirmation
- **Email confirmations** — transactional HTML emails with booking reference via Nodemailer
- **AI Virtual Concierge** — floating chat widget powered by Google Gemini, grounded with live room and branch data from the database
- **Public room catalogue & rate sheet** — curated room tier listings

### 🖥️ Front Desk / Receptionist
- **Booking management** — full lifecycle: pending → confirmed → checked-in → checked-out
- **Live invoice generation** — real-time 4-tier Sri Lankan statutory tax cascade breakdown
- **Service usage folio** — add ancillary charges (dining, spa, laundry) to a guest's bill
- **Payment recording** — mark invoices as paid with payment method tracking

### 👔 Management & Admin
- **KPI dashboard** — live occupancy rate, ADR, total revenue, and reservation counts
- **Branch management** — multi-property admin across Colombo, Kandy, Galle
- **Staff management** — CRUD for staff accounts with role assignment
- **Tax configuration** — manage active statutory tax rates with effective-date versioning
- **Room & room-type editor** — amenity-level room catalogue with hierarchy (jacuzzi, bathtub, etc.)
- **Executive reports** — financial report snapshots with date-range filters
- **Audit log viewer** — immutable change log across all critical entities

---

## 🧮 Sri Lankan Statutory Tax Engine

All bills are computed via a mandatory 4-tier cascade (in order):

```
Base Room Charge  (LKR)
    │
    ├─► Service Charge (SC)      = Base × 10%
    │
    ├─► Tourism Development Levy = (Base + SC) × 1%
    │       (TDL)
    │
    ├─► Social Security Contribution = (Base + SC) × 2.5%
    │       Levy (SSCL)
    │
    └─► VAT                      = (Base + TDL + SSCL) × 18%

Grand Total = Base + SC + TDL + SSCL + VAT
```

Tax rates are **versioned** — `effective_from` / `effective_to` date ranges prevent retroactive recalculation on historical invoices. Frozen in `rate_at_booking` and `price_at_usage` columns per Rules B8/B10/B13.

Implemented in:
- [`database/procedures/sp_Generate_Final_Bill.sql`](database/procedures/sp_Generate_Final_Bill.sql) — PL/pgSQL stored procedure
- [`backend/src/routes/invoices.routes.ts`](backend/src/routes/invoices.routes.ts) — `computeTaxCascade()` application-layer mirror

---

## 🛢️ Database

**PostgreSQL 15** — Zero ORM, 100% raw parameterized SQL.

### PL/pgSQL Objects

| Type | Name | Purpose |
|---|---|---|
| **Stored Procedure** | `sp_Generate_Final_Bill` | 4-tier tax cascade + invoice upsert |
| **Stored Procedure** | `sp_CreateBooking` | Atomic booking creation with advisory lock |
| **Function** | `fn_check_room_availability` | Date-exclusion constraint check |
| **Function** | `fn_auto_bill_on_checkout` | Trigger function for auto-billing |
| **Trigger** | `trg_auto_bill_on_checkout` | GoF Observer — fires `sp_Generate_Final_Bill` on checkout status change |
| **Trigger** | `trg_change_log_invoices` | Immutable audit trail for invoice mutations |
| **Trigger** | `trg_change_log_service_usage` | Audit trail for folio entries |
| **Trigger** | `trigger_Prevent_Double_Booking` | DB-level concurrency guard via `tsrange` exclusion |
| **Trigger** | `trigger_Auto_Update_Loyalty_Tier` | Upgrades guest loyalty tier on checkout |

### Performance Indexes

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_tax_active_dates` | `tax_configurations(tax_type, effective_from)` | Fast current-rate lookup |
| `idx_invoices_b_room` | `invoices(booking_id, room_id)` | Billing query acceleration |
| `idx_service_usage_room` | `service_usage(booking_id, room_id)` | Folio grouping |
| `idx_payments_invoice` | `payments(invoice_id)` | Payment reconciliation |

### Schema (18 live tables)

`branches` · `rooms` · `room_types` · `room_amenities` · `guests` · `user_accounts` · `bookings` · `booking_rooms` · `room_holds` · `service_catalogue` · `service_usage` · `invoices` · `invoice_line_items` · `payments` · `tax_configurations` · `audit_logs` · `change_log` · `report_snapshots`

---

## 🤖 AI Virtual Concierge

Powered by **Google Gemini** with live database grounding:

```
POST /api/v1/chat
```

- At every request, the concierge service executes SQL to inject the **live room catalogue** and **branch portfolio** into the Gemini system prompt
- Prevents hallucinations about pricing, availability, or amenities
- Multi-model fallback: `gemini-2.5-flash` → `gemini-2.0-flash-lite` → `gemini-1.5-flash`
- Sri Lankan hospitality persona with contextual knowledge of local culture and services

---

## 🔐 Authentication & Authorization

- **Stateless JWT** (`jsonwebtoken` + `bcryptjs`) with short-lived access tokens
- **Email verification** flow with time-limited tokens
- **RBAC** — four roles enforced at middleware level:

| Role | Access |
|---|---|
| `ADMINISTRATOR` | Full system access, staff/branch management |
| `MANAGER` | Dashboard, reports, bookings, tax config |
| `RECEPTIONIST` | Booking lifecycle, invoicing, check-in/out |
| `GUEST` | Personal profile and booking history |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL 15+ (or Docker)
- Railway CLI (optional): `npm install -g @railway/cli`

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/KLP-codebase/Hotel-Reservation-Management-System.git
cd Hotel-Reservation-Management-System

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit both .env files with your DB credentials and API keys

# 5. Start local PostgreSQL container
npm run docker:up

# 6. Start backend (port 4000)
cd backend && npm run dev

# 7. Start frontend (port 3000) — in a new terminal
npm run dev
```

### Docker Commands

```bash
npm run docker:up      # Start PostgreSQL container
npm run docker:stop    # Stop container (preserve data)
npm run docker:down    # Stop + remove container
npm run docker:logs    # Stream PostgreSQL logs
npm run docker:reset   # Wipe volume and restart fresh
```

---

## 🌐 Deployment (Azure VM)

The production stack runs on a **Microsoft Azure VM** (India South Central region) using **Docker Compose** with **Caddy** as the reverse proxy:

| Component | Host |
|---|---|
| **Frontend** (Next.js) | Docker container on Azure VM |
| **Backend** (Express) | Docker container on Azure VM |
| **Database** (PostgreSQL 15) | Docker container on Azure VM |
| **Reverse Proxy** | Caddy 2 (auto TLS, port 80/443) |
| **DNS / CDN** | Cloudflare (pointing to Azure VM IP) |
| **Container Registry** | GitHub Container Registry (GHCR) |

The CI/CD pipeline (`.github/workflows/deploy.yml`) on every push to `main`:
1. Builds Docker images for frontend and backend → pushes to GHCR
2. SSH into the Azure VM at `/opt/skynest/`
3. Runs pending SQL migrations automatically
4. Pulls new images and does a zero-downtime `docker compose up -d`
5. Reloads Caddy config and runs a smoke test against `https://skynest.me/health`

```bash
# Trigger a manual deploy (GitHub Actions)
gh workflow run deploy.yml
```

> ⚠️ **Database Note:** The live schema has drifted from `init.sql`. Always query the live DB to verify column types before writing joins. See [`Resources/RAILWAY_SETUP_GUIDE.md`](Resources/RAILWAY_SETUP_GUIDE.md).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 16.3 (App Router) + React 19.2 |
| **CSS / Design** | Tailwind CSS v4.3 (`@import "tailwindcss"` + `@theme`) |
| **Animation** | GSAP 3.15 + ScrollTrigger, Lenis smooth scroll |
| **UI Components** | Radix UI primitives, Lucide React icons |
| **Data Fetching** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |
| **PDF Export** | jsPDF + html2canvas-pro |
| **Backend** | Node.js 20 + Express 4.19 + TypeScript 5 |
| **Database** | PostgreSQL 15 via `pg` (raw SQL, Zero ORM) |
| **Auth** | Stateless JWT (`jsonwebtoken` + `bcryptjs`) |
| **AI** | Google Gemini API |
| **Email** | Nodemailer |
| **Validation** | Zod (shared schema) |
| **Deployment** | Azure VM (Docker Compose + Caddy) |
| **CI/CD** | GitHub Actions |

---

## 👥 Team — Group 40

| Name | Role |
|---|---|
| **Kenul Perera** | Auth System & Staff Management |
| **Nimeth Sandive** | Tax Engine, Billing & Invoicing Subsystem |
| **Ashinthya** | Frontend design, Booking Flow & Room Management |
| **Harivishnu** | Reports, pdf creation |
| **Manodya Teshan** | Reports, Analytics & Dashboard |

---

## 📚 Documentation

| Document | Description |
|---|---|
| [`Resources/ARCHITECTURE.md`](Resources/ARCHITECTURE.md) | Full engineering spec — relations, API contracts, GoF patterns |
| [`Resources/SkyNest_HRGSMS_SRS_IEEE.md`](Resources/SkyNest_HRGSMS_SRS_IEEE.md) | IEEE Std 830-1998 Software Requirements Specification |
| [`Resources/SkyNest_HRGSMS_Database_Design.md`](Resources/SkyNest_HRGSMS_Database_Design.md) | Relational model, ER diagram, normalization proof |
| [`Resources/SkyNest_Site_Map_and_Content_Copy.md`](Resources/SkyNest_Site_Map_and_Content_Copy.md) | UI screen inventory, copy, and form specifications |
| [`Resources/RAILWAY_SETUP_GUIDE.md`](Resources/RAILWAY_SETUP_GUIDE.md) | Production deployment and live schema notes |
| [`database/migrations/README.md`](database/migrations/README.md) | Migration history and application order |
| [`CODEBASE_AUDIT.md`](CODEBASE_AUDIT.md) | Code quality audit and technical debt log |

---

## 📄 License

MIT — University 3rd Semester Database Systems Project, Group 40.

