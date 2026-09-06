# 🚀 Railway Database Setup Guide — Sky Nest Team

> **Date:** 2026-09-06  
> **Author:** Project Lead  
> **Purpose:** Connect your local development environment to our shared Railway PostgreSQL database.

---

## 📋 What Changed

We migrated our database from **local Docker PostgreSQL** to a **shared Railway cloud PostgreSQL** instance. This means:

- ❌ You **no longer need Docker** running for the database
- ✅ Everyone on the team shares **one database** — no more "works on my machine"
- ✅ Schema, seed data, and migrations are **always in sync**
- ⚠️ You **need internet** to connect to the database

---

## Step 1 — Update Your `backend/.env`

Open `backend/.env` and replace the `DATABASE_URL` line:

```diff
# PostgreSQL connection string
- DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest
+ DATABASE_URL=postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway
```

> ⚠️ **Important:** The file to edit is `backend/.env`, NOT the root `.env`. The backend reads its own `.env` file.

Your full `backend/.env` should look like:

```env
# ── Backend Environment Variables ─────────────────────────────────────────────

# 🚀 ACTIVE: Railway shared dev DB
DATABASE_URL=postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway

# 💻 LOCAL: Uncomment to use local Docker DB instead
# DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest

# JWT
JWT_SECRET=skynest-dev-secret-change-before-any-shared-env
JWT_EXPIRES_IN=8h

# Server
PORT=4000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Step 2 — Verify Connection

Run this in PowerShell from the project root:

```powershell
psql "postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway" -c "SELECT COUNT(*) FROM rooms;"
```

**Expected output:**
```
 count
-------
     8
(1 row)
```

If you get a `command not found` error, install `psql` via [PostgreSQL downloads](https://www.postgresql.org/download/) or use the Railway Console tab in the browser.

---

## Step 3 — Start the Backend

```powershell
cd backend
npm run dev
```

You should see:
```
🏨  Sky Nest API running on http://localhost:4000
    Environment : development
    CORS origins: http://localhost:3000
```

> ⚠️ If you see `⚠️ PostgreSQL port 5432 offline. Activated in-memory resilient database fallback.` — your `backend/.env` is still pointing to `localhost`. Double-check Step 1.

---

## Step 4 — Start the Frontend

In a separate terminal:

```powershell
npm run dev
```

Visit `http://localhost:3000/book` → select a branch, room type, and dates → you should see rooms from Railway.

---

## 🗄️ Railway Database Details

| Property | Value |
|----------|-------|
| **Provider** | Railway (Managed PostgreSQL 18) |
| **Host (Public)** | `hayabusa.proxy.rlwy.net` |
| **Port** | `16058` |
| **Database** | `railway` |
| **User** | `postgres` |
| **Password** | `iqHUiUItgCcDYexnejhZyjzVZrdaPvjB` |
| **Public URL** | `postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway` |
| **Railway Dashboard** | [railway.app](https://railway.app) (ask team lead for access) |

---

## 🏢 Branch UUIDs (Railway DB)

The branches no longer use integer IDs. They use UUIDs:

| Branch Name | UUID |
|-------------|------|
| Sky Nest Colombo | `953fd827-751c-47eb-a201-e0aac4bc444a` |
| Sky Nest Kandy | `af0167cd-c9eb-4ac5-ba22-cfd65cdc87a5` |
| Sky Nest Galle | `30a7b55d-9440-45c2-a990-08821af210ba` |

---

## 🔄 Schema Column Name Changes

The `rooms` table columns have been updated. If you're writing any SQL or repository code, use the correct column names:

### `rooms` Table

| ❌ Old Column | ✅ New Column | Type | Notes |
|--------------|--------------|------|-------|
| `room_id` | `id` | `VARCHAR(36)` | UUID string, primary key |
| `room_number` | `number` | `VARCHAR(20)` | Room number like `'101'` |
| `room_type_id` | `type` | `room_type` ENUM | `'STANDARD'`, `'DELUXE'`, `'SUITE'`, `'PRESIDENTIAL'` |
| `branch_id` (int) | `branch_id` | `UUID` | References `branches(branch_id)` |
| — | `price_per_night` | `DECIMAL(10,2)` | e.g. `120.00` |
| — | `max_guests` | `INT` | e.g. `2` |
| — | `amenities` | `TEXT[]` | Array of strings |
| — | `status` | `room_status` ENUM | `'AVAILABLE'`, `'OCCUPIED'`, `'MAINTENANCE'`, `'RESERVED'` |

### `bookings` Table (replaces old `booking_rooms`)

| ❌ Old Column | ✅ New Column |
|--------------|--------------|
| `booking_rooms` table | `bookings` table |
| `br.check_in_date` | `b.check_in` |
| `br.check_out_date` | `b.check_out` |
| `br.room_id` | `b.room_id` |

### Room Type — ENUM Not Integer FK

Room types are **no longer a separate table with integer IDs**. Instead, they're an ENUM directly on the `rooms.type` column:

```sql
-- ❌ OLD (integer FK)
WHERE r.room_type_id = 2

-- ✅ NEW (ENUM string)
WHERE r.type = 'DELUXE'::room_type
```

Valid values: `STANDARD`, `DELUXE`, `SUITE`, `PRESIDENTIAL`

### Branch ID — UUID Not Integer

```sql
-- ❌ OLD
WHERE r.branch_id = 1

-- ✅ NEW
WHERE r.branch_id = '953fd827-751c-47eb-a201-e0aac4bc444a'::uuid
```

---

## 📝 Example: Correct Room Query

```sql
-- Get all available standard rooms in Colombo
SELECT r.id, r.number, r.type, r.floor, r.price_per_night,
       r.max_guests, r.amenities, r.description, r.status
FROM rooms r
WHERE r.branch_id = '953fd827-751c-47eb-a201-e0aac4bc444a'::uuid
  AND r.type      = 'STANDARD'::room_type
  AND r.status    = 'AVAILABLE'
ORDER BY r.floor, r.number;
```

---

## 🔧 How to Apply New Migrations

When someone creates a new migration (e.g., `database/migrations/010_something.sql`):

```powershell
$DB = "postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway"
psql $DB -f "database/migrations/010_something.sql"
```

> ⚠️ **Rule:** Only ONE person applies each migration to Railway. Coordinate on Discord/WhatsApp before running migration scripts.

---

## 🔀 Switching Between Railway and Local DB

To switch back to your local Docker DB temporarily:

```env
# In backend/.env:

# Comment out Railway:
# DATABASE_URL=postgresql://postgres:iqHUiUItgCcDYexnejhZyjzVZrdaPvjB@hayabusa.proxy.rlwy.net:16058/railway

# Uncomment local:
DATABASE_URL=postgresql://postgres:skynest_dev@localhost:5432/skynest
```

Then restart the backend (`npm run dev`).

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` or `in-memory fallback` warning | Check `backend/.env` points to Railway, not `localhost` |
| `could not translate host name "postgres.railway.internal"` | You're using the **internal** URL. Use the **public** URL with `hayabusa.proxy.rlwy.net` |
| `relation "room_types" does not exist` | Room types are now an ENUM on `rooms.type`, not a separate table |
| `column "room_type_id" does not exist` | Use `type` instead of `room_type_id` (see column changes above) |
| `invalid input value for enum room_type` | Valid values: `STANDARD`, `DELUXE`, `SUITE`, `PRESIDENTIAL` (case-sensitive, uppercase) |
| UI says "Something went wrong" | Check the backend terminal for the actual SQL error |
| `psql: command not found` | Install PostgreSQL client tools, or use Railway Console in browser |
