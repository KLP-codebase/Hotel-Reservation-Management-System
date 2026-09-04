# SkyNest Hotels — Reservation and Guest Services Management System (HRGSMS)
## Relational Database Design — Full Academic & Implementation Report

---

## 1. Overview

SkyNest Hotels operates three branches (Colombo, Kandy, Galle). The database must support multi-branch room inventory, guest bookings with accompanying guest verification, chargeable service tracking per room stay, automated invoice generation with Sri Lankan tax cascades, partial payment support, management reporting, and a full audit/change log.

The design adopts a **simplified, implementation-ready schema** that meets 3NF throughout and provides clear module ownership across the five development team members. Loyalty and membership features are deferred (out of scope for the initial implementation).

---

## 2. Business Rules Extracted

| # | Rule | DB Design Implication |
|---|------|------------------------|
| B1 | Multiple branches, each with its own rooms | ooms.branch_id FK → ranches |
| B2 | Room has a type, each type has a base daily rate | oom_types.base_daily_rate; rate stored on type, not on individual room |
| B3 | A room is assigned at physical check-in, not at booking | ooking_rooms.room_id is nullable at booking time |
| B4 | One booking can contain multiple room reservations | ookings (header) 1—N ooking_rooms (line items) |
| B5 | Each room in a booking has its own primary guest | ooking_rooms.primary_guest_id FK → guests |
| B6 | Additional guests per room must be verified at check-in | ccompanying_guests table with is_verified flag |
| B7 | Meal plan choice is per room reservation, not per booking | ooking_rooms.plan_id FK → meal_plans |
| B8 | Rate at time of booking must be frozen (historical integrity) | ooking_rooms.rate_at_booking — snapshot at booking time |
| B9 | Chargeable services are tracked per room stay | service_usage.booking_room_id FK → ooking_rooms |
| B10 | Service catalogue price can change; historical usage price must be frozen | service_usage.price_at_usage — immutable snapshot |
| B11 | One invoice per room stay; invoice stores pre-computed tax amounts | invoices 1:1 with ooking_rooms; tax fields frozen at generation time |
| B12 | Multiple partial payments per invoice | payments N:1 invoices |
| B13 | Tax rates come from a versioned, per-tax configuration table | 	ax_configurations with effective_from/effective_to |
| B14 | Staff operate under role-based access | staff.role column; role determines permission level |
| B15 | Either a guest or a staff member may initiate a booking | ookings.booked_by_guest_id and ookings.booked_by_staff_id — one is nullable |
| B16 | System must log all data changes for audit compliance | change_log table with old/new JSON snapshots |
| B17 | Management reports are pre-generated and cached as snapshots | eport_snapshots table with JSONB payload |

---

## 3. Entities Identified

| Entity | Why it is needed |
|---|---|
| **branches** | Physical hotel location; scopes rooms and staff |
| **guests** | Any person who makes or is assigned to a booking; universal party table |
| **staff** | Hotel employee record, branch-scoped, role-bearing |
| **user_accounts** | Login credentials for either a guest or a staff member; kept apart from HR/guest data |
| **room_types** | Category definition (Suite with Mountain View, etc.) with base rate and capacity |
| **rooms** | Physical bookable unit; belongs to a branch and a type |
| **meal_plans** | Available meal plan options (e.g., Bed & Breakfast, Half Board) |
| **service_catalogue** | Chargeable extras (spa, laundry, room service) with current price |
| **tax_configurations** | One row per tax type (VAT, Service Charge, SSC, etc.) — versioned |
| **bookings** | Master booking header: who booked, which branch, when, current status |
| **booking_rooms** | Line item: one room reservation within a booking; holds the frozen rate |
| **accompanying_guests** | Additional guests per room stay, verified by staff at check-in |
| **service_usage** | One row per chargeable service consumed during a room stay |
| **invoices** | Finalized bill per room stay; stores frozen tax snapshot amounts |
| **payments** | One row per payment attempt against an invoice |
| **report_snapshots** | Pre-generated management reports stored as JSONB for fast retrieval |
| **change_log** | Audit trail: table name, record ID, old/new JSON for every data mutation |

---

## 4. Functional Dependencies (Major Relations)

**bookings**(booking_id, branch_id, booked_by_guest_id, booked_by_staff_id, created_at, status)
- FD1: booking_id → all other attributes
- Only one determinant (booking_id) — no partial or transitive dependency possible.

**booking_rooms**(booking_room_id, booking_id, primary_guest_id, room_type_id, room_id, plan_id, check_in_date, check_out_date, rate_at_booking)
- FD1: booking_room_id → all other attributes
- ate_at_booking depends on booking_room_id (its snapshot value), not on room_type_id alone — no transitive dependency because the rate is deliberately a frozen copy, not a derivable value from room_types.

**invoices**(invoice_id, booking_room_id, room_charges, service_charges, discount_amount, vat_amount, ssc_amount, service_charge_tax, generated_at)
- FD1: invoice_id → all other attributes
- FD2: booking_room_id → all other attributes (UNIQUE — 1:1 with booking_rooms)
- Two candidate keys; both are superkeys — no BCNF violation.

**tax_configurations**(tax_id, tax_name, tax_percentage, is_active, effective_from, effective_to, external_api_reference, last_synced_at)
- FD1: tax_id → all other attributes
- Each tax type has its own versioned row — no transitive dependency.

---

## 5. Candidate Keys (Summary)

| Relation | Candidate Key(s) |
|---|---|
| branches | {branch_id}, {branch_name} |
| guests | {guest_id}, {email} |
| staff | {staff_id}, {email} |
| user_accounts | {account_id}, {username}, {staff_id}, {guest_id} |
| room_types | {room_type_id}, {type_name} |
| rooms | {room_id}, {branch_id, room_number} |
| meal_plans | {plan_id}, {plan_name} |
| service_catalogue | {service_id}, {branch_id, service_name} |
| tax_configurations | {tax_id}, {tax_name, effective_from} |
| bookings | {booking_id} |
| booking_rooms | {booking_room_id}, {booking_id, room_id, check_in_date} |
| accompanying_guests | {verification_id} |
| service_usage | {usage_id} |
| invoices | {invoice_id}, {booking_room_id} |
| payments | {payment_id} |
| report_snapshots | {snapshot_id} |
| change_log | {log_id} |

---

## 6. Normalization Analysis

**1NF** — Every relation stores only atomic, single-valued attributes. No repeating groups, no comma-separated values, no arrays. Services are stored in service_catalogue and linked to room stays via service_usage. Accompanying guests are stored in ccompanying_guests, not as columns on ooking_rooms.

**2NF** — Every relation has a single-column primary key (except no composite-key relations with non-key attributes), so partial dependencies are structurally impossible in all tables.

**3NF** — Checked per relation:
- ooking_rooms.rate_at_booking is deliberately a frozen snapshot (not derivable from oom_types.base_daily_rate) — this is an intentional historical snapshot, not a redundancy.
- service_usage.price_at_usage is similarly a frozen snapshot of service_catalogue.base_price.
- invoices stores frozen tax amounts — these depend on invoice_id, not transitively on 	ax_configurations rows, because they are snapshots at generation time.
- All other non-key attributes in every relation depend on the whole key and only on the key.

**BCNF** — All relations satisfy BCNF. Every determinant in every relation is a superkey.

---

## 7. Design Decisions

### 7.1 Why ookings + ooking_rooms instead of a single table

A single Booking table mixing header and room-line data would require repeating guest and rate data for each room — a 1NF violation (repeating groups). The header/line-item pattern gives:
- ookings = immutable booking header (one per checkout session)
- ooking_rooms = one row per room-stay, with its own check-in/out dates and rate

### 7.2 Why oom_id is nullable in ooking_rooms

Per business rule B3, a specific physical room is not assigned until the guest physically arrives at the front desk (check-in). At booking time only a oom_type_id is chosen. oom_id is populated when staff performs check-in. This avoids premature room lock-in for future availability.

### 7.3 Why ate_at_booking is a frozen snapshot

oom_types.base_daily_rate can be updated by management. If invoices were computed from the live rate, historical bookings would silently reprice — a financial integrity failure. Storing ate_at_booking at booking creation time isolates each booking from future price changes.

### 7.4 Why invoices stores pre-computed tax amounts

Sri Lankan tax law requires four cascading charges (VAT, SSC, Service Charge, etc.). Storing the computed amounts at invoice generation time means: (a) the invoice is legally reproducible even if tax rates change later, and (b) no re-computation is needed when displaying an invoice.

### 7.5 Why 	ax_configurations has one row per tax type

Rather than a single TaxConfig row with four columns (one per tax type), each row represents one named tax, making it easy to version individual taxes independently as laws change, and to sync rates from an external tax authority API.

### 7.6 Why change_log uses ecord_id varchar instead of an FK

A polymorphic audit log cannot have a typed FK to every table it audits. ecord_id stores the PK value as text (which covers both INT and UUID PKs). The 	able_name column identifies the target table. This is the standard pattern for application-level audit trails.

---

## 8. Final Relational Schema

### Table: branches
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| branch_id | INT | PK, AUTO_INCREMENT | |
| branch_name | VARCHAR(100) | UNIQUE, NOT NULL | |
| city | VARCHAR(100) | NOT NULL | |
| address | TEXT | NULL | |
| phone | VARCHAR(50) | NULL | |
| email | VARCHAR(255) | NULL | |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: guests
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| guest_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| email | VARCHAR(255) | UNIQUE, NULL | |
| phone | VARCHAR(50) | NULL | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: staff
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| staff_id | INT | PK, AUTO_INCREMENT | |
| branch_id | INT | FK → branches, NULL | NULL = not assigned to a branch |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| phone | VARCHAR(50) | NULL | |
| role | VARCHAR(50) | NOT NULL | RECEPTIONIST/SERVICE_STAFF/MANAGER/ADMINISTRATOR/DBA |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: user_accounts
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| account_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| username | VARCHAR(100) | UNIQUE, NOT NULL | |
| password_hash | VARCHAR(255) | NOT NULL | |
| account_type | VARCHAR(50) | NOT NULL | 'Staff' or 'Member' |
| staff_id | INT | FK → staff, NULL | Set when account_type = 'Staff' |
| guest_id | UUID | FK → guests, NULL | Set when account_type = 'Member' |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| last_login_at | TIMESTAMP | NULL | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: room_types
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| room_type_id | INT | PK, AUTO_INCREMENT | |
| type_name | VARCHAR(100) | UNIQUE, NOT NULL | e.g. "Suite with Mountain View" |
| base_daily_rate | NUMERIC(10,2) | NOT NULL, CHECK > 0 | mutable catalogue price |
| capacity | SMALLINT | NOT NULL, CHECK > 0 | max occupants |
| description | TEXT | NULL | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: rooms
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| room_id | INT | PK, AUTO_INCREMENT | |
| branch_id | INT | FK → branches, NOT NULL | |
| room_type_id | INT | FK → room_types, NOT NULL | |
| room_number | VARCHAR(20) | NOT NULL | unique within branch |
| floor | INT | NULL | |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'AVAILABLE' | AVAILABLE/OCCUPIED/MAINTENANCE/RESERVED |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |
| | | UNIQUE(branch_id, room_number) | |

### Table: meal_plans
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| plan_id | INT | PK, AUTO_INCREMENT | |
| plan_name | VARCHAR(100) | UNIQUE, NOT NULL | e.g. "Bed & Breakfast", "Half Board", "Full Board", "Room Only" |
| description | TEXT | NULL | |
| price_per_night | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | additional nightly charge |

### Table: service_catalogue
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| service_id | INT | PK, AUTO_INCREMENT | |
| branch_id | INT | FK → branches, NOT NULL | branch-scoped catalogue |
| service_name | VARCHAR(100) | NOT NULL | |
| category | VARCHAR(50) | NULL | e.g. "Spa", "F&B", "Laundry" |
| base_price | NUMERIC(10,2) | NOT NULL, CHECK >= 0 | mutable; usage freezes price at consumption |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| | | UNIQUE(branch_id, service_name) | |

### Table: tax_configurations
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| tax_id | INT | PK, AUTO_INCREMENT | |
| tax_name | VARCHAR(100) | NOT NULL | e.g. "VAT", "Service Charge", "SSC" |
| tax_percentage | NUMERIC(5,4) | NOT NULL, CHECK >= 0 | e.g. 0.1800 for 18% VAT |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| effective_from | DATE | NOT NULL | |
| effective_to | DATE | NULL | NULL = currently effective |
| external_api_reference | VARCHAR(255) | NULL | for future external tax authority sync |
| last_synced_at | TIMESTAMP | NULL | |

### Table: bookings
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| booking_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| branch_id | INT | FK → branches, NOT NULL | which hotel branch |
| booked_by_guest_id | UUID | FK → guests, NULL | set if self-service/online |
| booked_by_staff_id | INT | FK → staff, NULL | set if phone/walk-in via staff |
| created_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'PENDING' | PENDING/CONFIRMED/PARTIALLY_CHECKED_IN/CHECKED_OUT/CANCELLED |
| notes | TEXT | NULL | |

CHECK constraint: (booked_by_guest_id IS NOT NULL OR booked_by_staff_id IS NOT NULL)

### Table: booking_rooms
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| booking_room_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| booking_id | UUID | FK → bookings, NOT NULL | |
| primary_guest_id | UUID | FK → guests, NOT NULL | main occupant of this room |
| room_type_id | INT | FK → room_types, NOT NULL | type chosen at booking |
| room_id | INT | FK → rooms, NULL | assigned at physical check-in |
| plan_id | INT | FK → meal_plans, NOT NULL | meal plan for this room stay |
| check_in_date | DATE | NOT NULL | |
| check_out_date | DATE | NOT NULL, CHECK > check_in_date | |
| rate_at_booking | NUMERIC(10,2) | NOT NULL | **frozen** snapshot of base_daily_rate at time of booking |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'PENDING' | PENDING/CHECKED_IN/CHECKED_OUT/CANCELLED |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | |

### Table: accompanying_guests
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| verification_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| booking_room_id | UUID | FK → booking_rooms, NOT NULL | |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| id_passport_no | VARCHAR(100) | NOT NULL | NIC or passport number |
| is_verified | BOOLEAN | NOT NULL, DEFAULT FALSE | set to TRUE by staff at check-in |
| verified_by_staff_id | INT | FK → staff, NULL | staff who verified the ID |

### Table: service_usage
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| usage_id | INT | PK, AUTO_INCREMENT | |
| booking_room_id | UUID | FK → booking_rooms, NOT NULL | the room stay that consumed this service |
| service_id | INT | FK → service_catalogue, NOT NULL | |
| quantity | SMALLINT | NOT NULL, CHECK > 0 | |
| price_at_usage | NUMERIC(10,2) | NOT NULL | **frozen** snapshot of base_price at time of consumption |
| recorded_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| recorded_by_staff_id | INT | FK → staff, NULL | |

### Table: invoices
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| invoice_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| booking_room_id | UUID | FK → booking_rooms, UNIQUE, NOT NULL | one finalized invoice per room stay |
| room_charges | NUMERIC(12,2) | NOT NULL | rate_at_booking × nights |
| service_charges | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | sum of service_usage lines |
| discount_amount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | |
| service_charge_tax | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | frozen snapshot |
| ssc_amount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | frozen snapshot |
| vat_amount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | frozen snapshot |
| total_amount | NUMERIC(12,2) | NOT NULL | final amount due |
| generated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'OPEN' | OPEN/PARTIALLY_PAID/PAID/CANCELLED |

### Table: payments
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| payment_id | UUID | PK, DEFAULT uuid_generate_v4() | |
| invoice_id | UUID | FK → invoices, NOT NULL | |
| amount | NUMERIC(12,2) | NOT NULL, CHECK > 0 | |
| payment_date | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| payment_method | VARCHAR(50) | NOT NULL | CASH/CARD/BANK_TRANSFER/ONLINE |
| reference_number | VARCHAR(100) | NULL | for card/bank transactions |
| recorded_by_staff_id | INT | FK → staff, NULL | |

### Table: report_snapshots
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| snapshot_id | INT | PK, AUTO_INCREMENT | |
| report_type | VARCHAR(100) | NOT NULL | e.g. "OccupancyReport", "RevenueReport" |
| report_period_start | DATE | NOT NULL | |
| report_period_end | DATE | NOT NULL | |
| branch_id | INT | FK → branches, NULL | NULL = all branches |
| report_data | JSONB | NOT NULL | pre-computed report payload |
| generated_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| generated_by_staff_id | INT | FK → staff, NULL | |

### Table: change_log
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| log_id | BIGINT | PK, AUTO_INCREMENT | |
| table_name | VARCHAR(100) | NOT NULL | which table was mutated |
| record_id | VARCHAR(100) | NOT NULL | PK of the mutated row (as text — covers UUID and INT PKs) |
| action | VARCHAR(20) | NOT NULL | INSERT / UPDATE / DELETE |
| old_data | JSONB | NULL | NULL on INSERT |
| new_data | JSONB | NULL | NULL on DELETE |
| changed_by_account_id | UUID | NULL | user_accounts.account_id — NULL for system jobs |
| changed_at | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

---

## 9. ER Diagram

`mermaid
erDiagram
    BRANCHES ||--o{ ROOMS : "has"
    BRANCHES ||--o{ STAFF : "employs"
    BRANCHES ||--o{ SERVICE_CATALOGUE : "offers"
    BRANCHES ||--o{ BOOKINGS : "hosts"
    BRANCHES ||--o{ REPORT_SNAPSHOTS : "for"

    GUESTS ||--o| USER_ACCOUNTS : "may have"
    STAFF ||--o| USER_ACCOUNTS : "logs in via"
    GUESTS ||--o{ BOOKINGS : "makes"
    STAFF ||--o{ BOOKINGS : "handles"

    ROOM_TYPES ||--o{ ROOMS : "categorizes"
    ROOM_TYPES ||--o{ BOOKING_ROOMS : "reserved as"

    MEAL_PLANS ||--o{ BOOKING_ROOMS : "selected in"

    BOOKINGS ||--|{ BOOKING_ROOMS : "contains"

    GUESTS ||--o{ BOOKING_ROOMS : "is primary guest of"
    ROOMS ||--o{ BOOKING_ROOMS : "assigned to"

    BOOKING_ROOMS ||--o{ ACCOMPANYING_GUESTS : "has"
    BOOKING_ROOMS ||--o{ SERVICE_USAGE : "incurs"
    BOOKING_ROOMS ||--o| INVOICES : "billed via"

    SERVICE_CATALOGUE ||--o{ SERVICE_USAGE : "consumed as"

    INVOICES ||--o{ PAYMENTS : "settled by"

    STAFF ||--o{ ACCOMPANYING_GUESTS : "verifies"
    STAFF ||--o{ SERVICE_USAGE : "records"
    STAFF ||--o{ PAYMENTS : "records"
    STAFF ||--o{ REPORT_SNAPSHOTS : "generates"

    BRANCHES {
        int branch_id PK
        varchar branch_name UK
        varchar city
    }
    GUESTS {
        uuid guest_id PK
        varchar first_name
        varchar last_name
        varchar email UK
    }
    STAFF {
        int staff_id PK
        int branch_id FK
        varchar email UK
        varchar role
    }
    USER_ACCOUNTS {
        uuid account_id PK
        varchar username UK
        int staff_id FK
        uuid guest_id FK
        varchar account_type
    }
    ROOM_TYPES {
        int room_type_id PK
        varchar type_name UK
        numeric base_daily_rate
        smallint capacity
    }
    ROOMS {
        int room_id PK
        int branch_id FK
        int room_type_id FK
        varchar room_number
        varchar status
    }
    MEAL_PLANS {
        int plan_id PK
        varchar plan_name UK
        numeric price_per_night
    }
    SERVICE_CATALOGUE {
        int service_id PK
        int branch_id FK
        varchar service_name
        numeric base_price
    }
    TAX_CONFIGURATIONS {
        int tax_id PK
        varchar tax_name
        numeric tax_percentage
        date effective_from
        date effective_to
    }
    BOOKINGS {
        uuid booking_id PK
        int branch_id FK
        uuid booked_by_guest_id FK
        int booked_by_staff_id FK
        varchar status
    }
    BOOKING_ROOMS {
        uuid booking_room_id PK
        uuid booking_id FK
        uuid primary_guest_id FK
        int room_type_id FK
        int room_id FK
        int plan_id FK
        date check_in_date
        date check_out_date
        numeric rate_at_booking
    }
    ACCOMPANYING_GUESTS {
        uuid verification_id PK
        uuid booking_room_id FK
        varchar id_passport_no
        boolean is_verified
        int verified_by_staff_id FK
    }
    SERVICE_USAGE {
        int usage_id PK
        uuid booking_room_id FK
        int service_id FK
        smallint quantity
        numeric price_at_usage
    }
    INVOICES {
        uuid invoice_id PK
        uuid booking_room_id FK,UK
        numeric room_charges
        numeric vat_amount
        numeric total_amount
        varchar status
    }
    PAYMENTS {
        uuid payment_id PK
        uuid invoice_id FK
        numeric amount
        varchar payment_method
    }
    REPORT_SNAPSHOTS {
        int snapshot_id PK
        varchar report_type
        date report_period_start
        date report_period_end
        jsonb report_data
    }
    CHANGE_LOG {
        bigint log_id PK
        varchar table_name
        varchar record_id
        varchar action
        jsonb old_data
        jsonb new_data
    }
`

---

## 10. Module Ownership

| Team Member | Module | Tables Owned |
|---|---|---|
| Member 1 | Auth & Staff | user_accounts, guests, staff |
| Member 2 | Room & Branch Management | ranches, oom_types, ooms, meal_plans, service_catalogue, 	ax_configurations |
| Member 3 | Reservation & Booking Engine | ookings, ooking_rooms, ccompanying_guests |
| Member 4 | Billing & Payments | service_usage, invoices, payments |
| Member 5 | Reports & Audit | eport_snapshots, change_log |

---

## 11. Design Pattern Mapping (GoF Patterns at Database Level)

| Pattern | Implementation |
|---|---|
| **Observer** | change_log table — triggers on mutation events write to the log (PostgreSQL-level Observer) |
| **Facade** | Database views (e.g., _booking_summary) — hide multi-table JOIN complexity behind a single SELECT |
| **Template Method** | Stored procedures/functions enforce fixed billing calculation steps: room charges → service charges → tax cascade → discount → total |
| **Singleton** | UNIQUE constraint on user_accounts for the ADMINISTRATOR role — at most one admin account exists |
| **Decorator** | CHECK constraints layered on tables — add validation behaviour on top of base table definitions |

---

## 12. Implementation Technology

| Component | Technology |
|---|---|
| Database Engine | PostgreSQL 15 (via Docker container) |
| Primary Keys | UUID (via uuid-ossp extension) for user-facing entities; INT AUTO_INCREMENT for lookup/config tables |
| ORM | None — raw SQL via pg npm package |
| Deployment | Docker Compose (local); Railway (cloud) |
| Migrations | Ordered SQL files ( 01_ →  0N_) run via init.sql on first container start |
