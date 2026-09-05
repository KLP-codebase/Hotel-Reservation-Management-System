# Database Migrations — Sky Nest Hotel System

## Run Order

Execute migrations **in order** against your PostgreSQL instance:

```bash
psql $DATABASE_URL -f database/schema.sql           # base schema first
psql $DATABASE_URL -f database/migrations/001_create_branches.sql
psql $DATABASE_URL -f database/migrations/002_create_staff_user_accounts.sql
psql $DATABASE_URL -f database/migrations/003_update_rooms_branch_fk.sql
psql $DATABASE_URL -f database/migrations/004_create_audit_logs.sql
psql $DATABASE_URL -f database/migrations/005_triggers.sql
psql $DATABASE_URL -f database/migrations/006_views.sql
psql $DATABASE_URL -f database/migrations/007_functions.sql
psql $DATABASE_URL -f database/migrations/008_indexes.sql
```

Or with Docker running:
```bash
docker exec -i skynest_postgres psql -U postgres -d skynest < database/migrations/001_create_branches.sql
```

## Roles (`account_type` enum)

| Value | Description |
|---|---|
| `GUEST` | Guest-facing portal access only |
| `RECEPTIONIST` | Front desk — check-in, check-out, bookings |
| `SERVICE_STAFF` | Housekeeping and maintenance |
| `MANAGER` | Branch manager — all branch data, staff list |
| `ADMINISTRATOR` | Cross-branch admin — staff CRUD, branch CRUD |
| `DBA` | Full system access — same as ADMINISTRATOR + schema ops |

## Seed Accounts

| Username | Role | Branch | Password |
|---|---|---|---|
| `guest` | GUEST | — | `SkyNest2025!` |
| `receptionist` | RECEPTIONIST | Colombo | `SkyNest2025!` |
| `service` | SERVICE_STAFF | Kandy | `SkyNest2025!` |
| `manager` | MANAGER | Galle | `SkyNest2025!` |
| `admin` | ADMINISTRATOR | Colombo | `SkyNest2025!` |
| `dba` | DBA | — | `SkyNest2025!` |

> **Change these passwords before deploying to any shared environment.**

## GoF Patterns in the DB Layer

| File | Pattern | How |
|---|---|---|
| `005_triggers.sql` | Observer | Triggers fire on INSERT/UPDATE/DELETE — write audit rows, sync room status |
| `006_views.sql` | Facade | Views hide multi-table JOINs behind simple virtual table names |
| `007_functions.sql` | Template Method | Stored functions define a fixed multi-step operation skeleton |
| `002_*.sql` | Decorator | CHECK constraints layer validation rules on top of table definitions |

## Reset (local dev only)

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run all migrations in order.
```
