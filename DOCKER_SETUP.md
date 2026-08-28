# 🐳 Sky Nest — Local Development Setup

> **For all teammates.** Follow this once to set up, then use the daily workflow every time you work.

---

## Prerequisites — Install these once

| Tool | Download | Why |
|---|---|---|
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ | Runs the PostgreSQL database |
| **Node.js 20 LTS** | https://nodejs.org/ | Runs the frontend and backend |
| **Git** | Already installed | Clones the repo |

---

## First-Time Setup (Do this once on your machine)

### Step 1 — Clone the repo
```bash
git clone <repo-url>
cd Hotel-Reservation-Management-System
(Dont do this again if you already done this)
```

### Step 2 — Create your `.env` file
```bash
# Copy the example file
copy .env.example .env
```

The `.env.example` already has the correct local dev values. Your `.env` should look like this:

```env
# Database — 'localhost' because backend runs locally with npm run dev
DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest

# Auth
JWT_SECRET=skynest-local-dev-secret

# App
NODE_ENV=development
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000
```

> ⚠️ **Never commit `.env` to Git.** It's in `.gitignore`. The `.env.example` file IS committed — it's just the template with no real secrets.

> **Note on DATABASE_URL hostname:**
> - `localhost` → use this when running `npm run dev` (backend outside Docker)
> - `postgres` → use this only when backend runs inside a Docker container

### Step 3 — Install dependencies
```bash
# Root (frontend)
npm install

# Backend
cd backend
npm install
cd ..
```

### Step 4 — Open Docker Desktop
Open Docker Desktop from your Start Menu and wait until you see **"Docker Desktop is running"** in the bottom left. This takes about 30 seconds.

### Step 5 — Start the database for the first time
```bash
npm run docker:up
```

**What happens automatically:**
- PostgreSQL 15 downloads itself (first time only, ~50MB)
- Creates the `skynest` database
- Runs `infrastructure/docker/init.sql`
- Creates all 17 tables
- Seeds 3 hotel branches (Colombo, Kandy, Galle)
- Seeds Sri Lankan tax rates (VAT, Service Charge, SSC)

You only need to wait for the download on your very first run. After that it's instant.

---

## Daily Workflow

Every day when you sit down to work:

```bash
# 1. Open Docker Desktop and wait for it to say "Running"

# 2. Start the database
npm run docker:up

# 3. Start the frontend
npm run dev

# 4. Start the backend (in a separate terminal)
cd backend && npm run dev
```

When you're done for the day:
```bash
npm run docker:stop
```

---

## NPM Shortcut Commands

| Command | What it does |
|---|---|
| `npm run docker:up` | Start the database in the background |
| `npm run docker:stop` | Pause the database (data is saved) |
| `npm run docker:logs` | Watch live database logs |
| `npm run docker:reset` | ⚠️ Wipe and rebuild database from scratch |

---

## Connecting to the Database

### Option A — Terminal (quick check)
```bash
docker exec -it docker-postgres-1 psql -U postgres -d skynest
```

Once inside, useful commands:
```sql
\dt                         -- list all 17 tables
SELECT * FROM branches;     -- see the 3 hotel branches
SELECT * FROM tax_configurations;  -- see the tax rates
\q                          -- exit
```

### Option B — GUI Tool (recommended for daily use)

Use **DBeaver** (free) or **TablePlus** or **pgAdmin** with these settings:

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `skynest` |
| Username | `postgres` |
| Password | `skynest_dev` |

---

## Understanding `stop` vs `down` vs `down -v`

| Command | What it does | Your data? |
|---|---|---|
| `npm run docker:stop` | Pauses the container | ✅ Safe — data survives |
| `docker compose ... down` | Removes the container | ✅ Safe — data survives |
| `npm run docker:reset` | Removes container + storage | ❌ **All data wiped** |

> **Rule:** Use `docker:stop` every day. Only use `docker:reset` if you need to rebuild the database from scratch (e.g. `init.sql` was updated by a teammate).

---

## When a Teammate Changes `init.sql`

If someone updates `init.sql` and pushes to Git (new tables, seed data, etc.):

```bash
git pull
npm run docker:reset
```

This wipes your local database and rebuilds it fresh with the latest `init.sql`. **You will lose any local test data** — that's expected.

---

## Database Structure (17 Tables)

```
Auth & Access          → user_accounts, guests, staff
Room Management        → branches, room_types, rooms, meal_plans
Services & Tax         → service_catalogue, tax_configurations
──── Reservation Module (Group member 3) ────
Booking Engine         → bookings, booking_rooms, accompanying_guests
Billing                → service_usage, invoices, payments
Audit & Reports        → report_snapshots, change_log
```

---

## Troubleshooting

**"Docker daemon not running"**
→ Open Docker Desktop and wait for it to fully start

**"Port 5432 already in use"**
→ You have another PostgreSQL running locally. Stop it via Services or uninstall it.

**"Cannot connect to database"**
→ Run `npm run docker:up` first. The database must be running before the backend.

**"My data is missing / tables don't exist"**
→ Someone ran `down -v` or you reset accidentally. Run `npm run docker:reset` to rebuild.

**"init.sql changes aren't showing up"**
→ The database already exists. Run `npm run docker:reset` to apply new changes.

---

## Architecture

```
Your Machine
│
├── Docker Desktop
│   └── postgres:15-alpine container
│       ├── PostgreSQL 15 server → port 5432
│       └── Data stored in: docker volume (postgres_data)
│
├── Backend (Node.js/Express) → port 4000
│   └── Connects to localhost:5432 via DATABASE_URL
│
└── Frontend (Next.js) → port 3000
    └── Calls backend API at localhost:4000
```

---

*Setup guide maintained by Group 40 — Sky Nest Hotels HRGSMS*
