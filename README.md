# 🏨 Hotel Reservation Management System

A full-stack hotel reservation and management platform built with **Next.js 16**, **Node.js / Express**, and **PostgreSQL** — deployed on **Railway** with a **GitHub Actions CI/CD pipeline**.

> 📖 **Definitive System Architecture:** See [Resources/ARCHITECTURE.md](Resources/ARCHITECTURE.md) for the complete engineering specification, relational data models (17 tables), two-tier concurrency control, 4-tier Sri Lankan statutory tax engine, and REST contracts.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Railway Cloud                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  Frontend    │   │  Backend     │   │   PostgreSQL 15  │    │
│  │  (Next.js)   │──▶│  (Express 4) │──▶│  (Raw SQL / pg)  │    │
│  │  (React 19)  │   │  (Node 20)   │   │  (Managed / DB)  │    │
│  └──────────────┘   └──────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                   │
          ▼                   ▼
   ┌─────────────┐    ┌──────────────┐
   │  Frontend   │    │   Backend    │
   │  Next.js 16 │    │  Express 4   │
   │  React 19   │    │  Node 20     │
   └─────────────┘    └──────────────┘
                              │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │  (Raw SQL / pg) │
                    └─────────────────┘
```

## 🗂️ Project Structure

```
Hotel-Reservation-Management-System/
├── src/                            # Next.js 16 application (App Router, Tailwind v4)
│   ├── app/                        # App Router pages & layouts
│   │   ├── (auth)/                 # Authentication pages
│   │   ├── (dashboard)/            # Admin & receptionist dashboards
│   │   ├── book/                   # Public guest booking flows
│   │   └── api/                    # API routes / proxies
│   ├── components/                 # Reusable React components & GSAP marketing UI
│   ├── lib/                        # DB adapter, auth helpers
│   ├── types/                      # TypeScript type definitions
│   └── styles/                     # Global CSS & Tailwind design tokens
│
├── backend/                        # Express.js REST API (Port 4000)
│   └── src/
│       ├── controllers/            # Request handlers
│       ├── routes/                 # Route definitions
│       ├── repositories/           # Raw SQL database queries (Repository pattern)
│       ├── middleware/             # Auth, Zod validation, error handling
│       ├── services/               # Business logic layer
│       ├── lib/                    # Domain errors & utilities
│       └── config/                 # DB adapter, env config
│
├── database/
│   ├── schema.sql                  # PostgreSQL DDL schema & enums
│   ├── functions/                  # PL/pgSQL functions
│   │   └── function_Check_Room_Availability.sql
│   ├── procedures/                 # Stored procedures
│   │   ├── sp_CreateBooking.sql
│   │   └── sp_Generate_Final_Bill.sql
│   └── triggers/                   # Trigger bindings
│
├── infrastructure/
│   ├── docker/                     # Docker Compose & init.sql for local dev
│   └── terraform/                  # IaC (optional provisioning)
│
├── .github/
│   └── workflows/                  # GitHub Actions CI/CD pipelines
│       ├── ci.yml                  # Lint, test, build
│       └── deploy.yml              # Deploy to Railway
│
├── scripts/                        # DB migration & seeding scripts
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL 15+
- Docker & Docker Compose
- Railway account & CLI (optional): `npm install -g @railway/cli`

### Local Development

```bash
# 1. Clone the repo
git clone <repo-url>
cd Hotel-Reservation-Management-System

# 2. Start PostgreSQL container
npm run docker:up

# 3. Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Start backend (port 4000)
cd backend && npm run dev

# 5. Start frontend (port 3000)
npm run dev
```

## 🌐 Deployment (Railway)

Frontend and Backend services are deployed on **Railway** with a managed PostgreSQL 15 database instance:

```bash
# Deploy with Railway CLI
railway link
railway up
```

The CI/CD pipeline (`.github/workflows/`) handles automated deployment on push to `main`.

## 💳 Payment Integration

- **PayHere** webhook endpoint: `POST /webhooks/payhere/notify`
- **OTA Sync** (Booking.com / Agoda): `POST /webhooks/ota/sync`

## 🛢️ Database

PostgreSQL with Raw SQL (`pg` connection pool). Custom PL/pgSQL logic for:
- `function_Check_Room_Availability` — prevents double-booking
- `sp_CreateBooking` — atomic booking creation with lock
- `sp_Generate_Final_Bill` — calculates taxes, loyalty discounts
- `trigger_Prevent_Double_Booking` — DB-level concurrency guard
- `trigger_Auto_Update_Loyalty_Tier` — updates guest tier on checkout

## 📄 License

MIT
