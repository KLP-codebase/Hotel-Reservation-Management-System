# 🏨 Hotel Reservation Management System

A full-stack hotel reservation and management platform built with **Next.js 14**, **Node.js / Express**, and **PostgreSQL** — deployed on **Cloudflare** with a **GitHub Actions CI/CD pipeline**.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  CF Pages    │   │  CF Workers  │   │   CF D1 (SQLite) │    │
│  │  (Next.js)   │──▶│  (API Proxy) │──▶│   (Edge Cache)   │    │
│  └──────────────┘   └──────────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │                   │
          ▼                   ▼
   ┌─────────────┐    ┌──────────────┐
   │  Frontend   │    │   Backend    │
   │  Next.js 14 │    │  Express 4   │
   │  React 18   │    │  Node 20     │
   └─────────────┘    └──────────────┘
                              │
                    ┌─────────────────┐
                    │   PostgreSQL     │
                    │  (Prisma ORM)   │
                    └─────────────────┘
```

## 🗂️ Project Structure

```
Hotel-Reservation-Management-System/
├── frontend/                       # Next.js 14 application (Cloudflare Pages)
│   ├── src/
│   │   ├── app/                    # App Router pages & layouts
│   │   │   ├── auth/               # Authentication pages
│   │   │   ├── dashboard/          # Admin dashboard
│   │   │   ├── bookings/           # Booking management
│   │   │   ├── rooms/              # Room management
│   │   │   ├── guests/             # Guest profiles
│   │   │   ├── billing/            # Billing & invoices
│   │   │   ├── reports/            # Analytics & reports
│   │   │   └── settings/           # System settings
│   │   ├── components/             # Reusable React components
│   │   ├── lib/                    # API client, auth helpers
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── types/                  # TypeScript type definitions
│   │   └── styles/                 # Global CSS & Tailwind
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                        # Express.js REST API
│   └── src/
│       ├── controllers/            # Request handlers
│       ├── routes/                 # Route definitions
│       ├── webhooks/               # PayHere & OTA sync (Booking.com/Agoda)
│       ├── middleware/             # Auth, validation, rate limiting
│       ├── services/               # Business logic layer
│       ├── utils/                  # Helper utilities
│       └── config/                 # DB, env, logger config
│
├── database/
│   ├── prisma/                     # Prisma schema & client
│   ├── functions/                  # PL/pgSQL functions
│   │   └── function_Check_Room_Availability.sql
│   ├── procedures/                 # Stored procedures
│   │   ├── sp_CreateBooking.sql
│   │   └── sp_Generate_Final_Bill.sql
│   ├── triggers/                   # Trigger bindings
│   │   ├── trigger_Prevent_Double_Booking.sql
│   │   └── trigger_Auto_Update_Loyalty_Tier.sql
│   └── seeds/                      # Seed data
│
├── infrastructure/
│   ├── cloudflare/                 # Cloudflare config
│   │   ├── workers/                # Worker scripts & wrangler.toml
│   │   ├── pages/                  # Pages config
│   │   └── d1/                     # D1 schema (edge cache)
│   ├── terraform/                  # IaC (optional VPS/DB provisioning)
│   └── docker/                     # Docker Compose for local dev
│
├── .github/
│   └── workflows/                  # GitHub Actions CI/CD pipelines
│       ├── ci.yml                  # Lint, test, build
│       ├── deploy-frontend.yml     # Deploy to Cloudflare Pages
│       └── deploy-backend.yml      # Deploy backend
│
├── docs/api/                       # OpenAPI / Swagger docs
├── scripts/                        # DB migration & seeding scripts
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- PostgreSQL 15+
- Cloudflare account
- `wrangler` CLI: `npm install -g wrangler`

### Local Development

```bash
# 1. Clone the repo
git clone <repo-url>
cd Hotel-Reservation-Management-System

# 2. Install all dependencies
npm run install:all

# 3. Set up environment variables
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 4. Run database migrations
npm run db:migrate

# 5. Seed the database
npm run db:seed

# 6. Start development servers
npm run dev
```

## 🌐 Deployment (Cloudflare)

Frontend is deployed to **Cloudflare Pages**, and the API worker runs on **Cloudflare Workers**.

```bash
# Deploy frontend
cd frontend && npx wrangler pages deploy .next

# Deploy worker
cd infrastructure/cloudflare/workers && wrangler deploy
```

The CI/CD pipeline (`.github/workflows/`) handles automated deployment on push to `main`.

## 💳 Payment Integration

- **PayHere** webhook endpoint: `POST /webhooks/payhere/notify`
- **OTA Sync** (Booking.com / Agoda): `POST /webhooks/ota/sync`

## 🛢️ Database

PostgreSQL with Prisma ORM. Custom PL/pgSQL logic for:
- `function_Check_Room_Availability` — prevents double-booking
- `sp_CreateBooking` — atomic booking creation with lock
- `sp_Generate_Final_Bill` — calculates taxes, loyalty discounts
- `trigger_Prevent_Double_Booking` — DB-level concurrency guard
- `trigger_Auto_Update_Loyalty_Tier` — updates guest tier on checkout

## 📄 License

MIT
