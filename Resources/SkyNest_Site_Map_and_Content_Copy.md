# SkyNest HRGSMS — Page Inventory & Content Copy Specification

> **Document Type:** Production Screen Inventory, Design Token Mapping & Exact Copy Specification  
> **Source Origin:** Claude Architecture & UX Review  
> **Target Application:** SkyNest Hotel Reservation & Guest Services Management System (Next.js 16 + React 19)  
> **Design System Compliance:** `.gemini/skills/sky-nest-design.md` (`font-cinzel`, `font-jakarta`, `#D9722C`, `#0B2540`, `#FDFCFA`)  
> **Relational Backend:** PostgreSQL 15 (17 normalized tables via Express REST API port 4000)  

---

## 1. Executive Summary & Page Count

The SkyNest system defines **17 total application routes/screens**. Two initial screens (the public landing page `/` and staff authentication `/login`) have already been built. The remaining **15 functional pages/screens** are catalogued below with exact editorial copy, form labels, empty states, error triggers, design token mappings, and Group 40 team member responsibilities.

### Page Inventory Summary Table

| Section | Route | Page Name | Primary Actor | Assigned Member |
|---|---|---|---|---|
| **Public / Guest** | `/` | Luxury Marketing Landing Page | Public / Unregistered Guest | Member 3 *(Built)* |
| **Public / Guest** | `/book` | Room Search & Live Availability | Unregistered / Registered Guest | **Member 3** |
| **Public / Guest** | `/book/[roomTypeId]` | Room Detail & Multi-Step Booking Flow | Unregistered / Registered Guest | **Member 3** |
| **Public / Guest** | `/book/confirmation/[bookingId]` | Booking Confirmation Screen | Unregistered / Registered Guest | **Member 3** |
| **Public / Guest** | `/register` | Guest Account Registration | Unregistered Guest | Member 1 |
| **Public / Guest** | `/account` | Guest Profile & Booking History | Registered Guest | **Member 3** |
| **Staff Dashboard** | `/login` | Staff Authentication Portal | All Staff Classes | Member 1 *(Built)* |
| **Staff Dashboard** | `/dashboard` | Operations Overview & Quick Stats | Receptionist, Manager, Admin | Shared / Reception |
| **Staff Dashboard** | `/dashboard/bookings` | Bookings Management Master Table | Receptionist, Manager | **Member 3** |
| **Staff Dashboard** | `/dashboard/bookings/new` | Front-Desk Walk-in Booking Engine | Receptionist | **Member 3** |
| **Staff Dashboard** | `/dashboard/bookings/[id]` | Stay Lifecycle, Check-in/out & Room Assign | Receptionist | **Member 3** |
| **Staff Dashboard** | `/dashboard/branches` | Branch Properties Configuration | System Administrator | Member 2 |
| **Staff Dashboard** | `/dashboard/staff` | Staff User Accounts & RBAC | System Administrator | Member 1 |
| **Staff Dashboard** | `/dashboard/rooms` | Physical Rooms & Room Types CRUD | Hotel Manager | Member 2 |
| **Staff Dashboard** | `/dashboard/catalogue` | Services Catalogue & Tax Configurations | Hotel Manager, Accountant | Member 2 & 4 |
| **Staff Dashboard** | `/dashboard/reports` | Management Reports & Analytics | Hotel Manager, Accountant | Member 5 |
| **Staff Dashboard** | `/dashboard/billing` | Invoices, Tax Breakdown & Payments | Accountant, Receptionist | Member 4 |

---

## 2. Global Design System & Component Tokens

To ensure absolute visual consistency with the SkyNest editorial aesthetic:
- **Headings & Titles:** `font-cinzel italic text-ink` (Cinzel serif, Google Fonts)
- **Wordmarks & Large Display:** `font-cinzel font-normal uppercase tracking-widest`
- **Body Text & Form Inputs:** `font-jakarta text-ink text-[17px] leading-relaxed` (Plus Jakarta Sans)
- **Subheadings & Meta:** `font-jakarta text-ink-faded text-sm`
- **Primary Interactive / CTA Fill:** `bg-skynest-accent hover:bg-[#c46322] text-white font-jakarta font-medium transition-all` (`#D9722C`)
- **Secondary / Ghost Actions:** `border border-skynest-hairline hover:border-ink text-ink font-jakarta`
- **Surface & Cards:** `bg-paper border border-skynest-hairline rounded-none shadow-sm`
- **Spacing Scale:** Strict multiples of 4px (`p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`, `gap-8`)

---

## 3. Guest-Facing (Public) Pages — Complete Content Copy

### Page 1: Search & Availability — `/book`
*Owner: Member 3 · Public Self-Service*

- **Headline (H1):** *Find Your Sanctuary in the Clouds* (`font-cinzel italic text-3xl md:text-5xl text-ink`)
- **Subhead:** *Select your destination property and travel dates. We present real-time room availability across our Colombo, Kandy, and Galle sanctuaries.* (`font-jakarta text-ink-faded text-lg`)
- **Filter Bar Labels:**
  - `Destination Property` (`dropdown: Colombo Sky Tower, Kandy Misty Peak, Galle Coastal Villa`)
  - `Check-in Date` (`date-picker`)
  - `Check-out Date` (`date-picker`)
  - `Room Type` (`dropdown: All Room Types, Superior Deluxe, Executive Cloud Suite, Presidential Penthouse`)
  - `Guests` (`counter: 1 to 6 Guests`)
- **Primary CTA:** `Search Real-Time Availability` (`bg-skynest-accent text-white`)
- **Results Header:** *Available Suites for [Check-in] to [Check-out] at [Branch]*
- **Room Card Elements:**
  - `Title`: *[Room Type Name]* (`font-cinzel text-xl text-ink`)
  - `Price Label`: *From LKR [base_daily_rate] / night* (`font-jakarta font-semibold text-skynest-accent`)
  - `Occupancy Meta`: *Up to [capacity] Guests · [size_sqft] sq ft · King Bed*
  - `Description`: *[Room Type Description]*
  - `Card CTA`: `Reserve This Room`
- **Empty State Notice:**
  - Headline: *No Suites Available for Selected Dates*
  - Body: *All luxury rooms at our [Branch] sanctuary are currently reserved for the requested dates. Consider adjusting your stay dates or exploring our other scenic branches in Kandy or Galle.*
  - Action Button: `Explore Alternative Branches`
- **Loading State:** *Consulting live room registries across branches...*

---

### Page 2: Room Type Detail & Booking Flow — `/book/[roomTypeId]`
*Owner: Member 3 · Multi-Step Interactive Checkout*

#### Step 1 — Guest Identification
- **Step Indicator:** `Step 01 / 04 — Guest Profile`
- **Headline (H2):** *Who Will Be Staying with Us?* (`font-cinzel italic text-2xl text-ink`)
- **Profile Toggle:** `I am a Returning SkyNest Guest` / `First-Time Guest Reservation`
- **Returning Guest Search:**
  - Input Placeholder: `Enter your email address or NIC/Passport number`
  - Action Button: `Retrieve Profile`
  - Success Feedback: *Welcome back, [First Name]. Your reservation details have been linked.*
- **New Guest Registration Fields:**
  - `First Name` (Required)
  - `Last Name` (Required)
  - `Email Address` (Required — booking confirmation will be dispatched here)
  - `Contact Phone Number` (Required with country code)
  - `NIC / Passport Number` (Optional at booking; mandatory at check-in per Rule B6)
- **Navigation Action:** `Proceed to Meal Selection →`

#### Step 2 — Meal Plan Selection
- **Step Indicator:** `Step 02 / 04 — Curated Dining`
- **Headline (H2):** *Select Your Culinary Experience* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Tailor your culinary preferences per suite for the entire duration of your stay.*
- **Meal Plan Option Cards (B7 Mapping):**
  - **Room Only (RO):**  
    *Subtitle:* *Pure Accommodation*  
    *Description:* *Enjoy full flexibility to explore regional Sri Lankan delicacies and local dining at your own pace.*  
    *Rate:* *Included in Base Tariff*
  - **Bed & Breakfast (BB):**  
    *Subtitle:* *Morning Artisan Buffet*  
    *Description:* *Wake up to panoramic views and a gourmet tropical breakfast buffet curated daily by our executive chefs.*  
    *Rate:* *+ LKR 4,500 / night per guest*
  - **Half Board (HB):**  
    *Subtitle:* *Breakfast & Curated Dinner*  
    *Description:* *Start with an artisan breakfast and conclude your evening with our five-course chef's dinner table.*  
    *Rate:* *+ LKR 9,800 / night per guest*
  - **Full Board (FB):**  
    *Subtitle:* *All-Inclusive Gourmet Dining*  
    *Description:* *Complete culinary immersion covering breakfast, lunch, and dinner throughout your residency.*  
    *Rate:* *+ LKR 15,200 / night per guest*
- **Navigation Actions:** `← Back to Profile` | `Continue to Reservation Review →`

#### Step 3 — Reservation Review & Snapshot Freezing
- **Step Indicator:** `Step 03 / 04 — Reservation Summary`
- **Headline (H2):** *Review Your Stay Details* (`font-cinzel italic text-2xl text-ink`)
- **Summary Ledger Card:**
  - `Property:` *SkyNest [Branch Name]*
  - `Room Category:` *[Room Type Name] (Physical suite allocated at check-in)*
  - `Duration:` *[N] Nights ([Check-in Date] to [Check-out Date])*
  - `Daily Room Tariff:` *LKR [rate_at_booking] per night (Frozen Rate)*
  - `Selected Meal Plan:` *[Meal Plan Name]*
  - `Estimated Base Charges:` *LKR [v_room_charges]*
- **Statutory Notice & Footnote:**  
  *All rates are frozen upon reservation placement. Final invoice generated at check-out will incorporate Sri Lankan statutory levies: 10% Service Charge, 1% Tourism Development Levy (TDL), 2.5% Social Security Contribution Levy (SSCL), and 18% Value Added Tax (VAT), alongside any bespoke room services utilized during residency.*
- **Special Requests Input:** `Special instructions (e.g. high floor, late arrival, dietary requirements)`
- **Primary Submission CTA:** `Confirm Reservation & Place Booking` (`bg-skynest-accent`)

#### Step 4 — Booking Confirmed
- **Headline (H1):** *Your Sanctuary Awaits* (`font-cinzel italic text-3xl md:text-4xl text-ink`)
- **Subhead:** *Your reservation has been confirmed and registered in the central SkyNest registry.*
- **Reference Display:** `BOOKING REFERENCE: [reference_number]` (`font-mono text-xl font-bold tracking-widest text-skynest-accent`)
- **Confirmation Details:**
  - *A confirmation receipt has been dispatched to [guest_email].*
  - *Check-in commences at 14:00. Please present your NIC or Passport at the front desk for physical suite key assignment.*
- **Action Buttons:** `View Reservation Details` | `Return to Home Page`

---

### Page 3: Standalone Confirmation Screen — `/book/confirmation/[bookingId]`
*Owner: Member 3 · Public / Email Link Destination*

- **Headline (H1):** *We Look Forward to Welcoming You* (`font-cinzel italic text-3xl text-ink`)
- **Subhead:** *Reference: [reference_number] · Placed on [created_at]*
- **Voucher Cards:**
  - `Branch Contact:` *[branch_name] · [address], Sri Lanka · Phone: [phone]*
  - `Reservation Holder:` *[primary_guest_name] ([email])*
  - `Stay Schedule:` *Check-in: [check_in_date] (from 14:00) · Check-out: [check_out_date] (by 11:00)*
  - `Allocated Category:` *[room_type_name] · [nights] Nights · Meal Plan: [meal_plan]*
  - `Current Stay Status:` `CONFIRMED` (`badge-emerald`)
- **Secondary Actions:** `Add to Google Calendar` | `Download PDF Voucher` | `Modify Contact Details`

---

### Page 4: Guest Registration — `/register`
*Owner: Member 1 · Identity & Guest Accounts*

- **Headline (H1):** *Join the SkyNest Circle* (`font-cinzel italic text-3xl text-ink`)
- **Subhead:** *Create your guest profile to manage upcoming reservations, accelerate check-in, and access exclusive residency privileges.*
- **Form Inputs:**
  - `First Name`
  - `Last Name`
  - `Email Address`
  - `Contact Phone`
  - `NIC or Passport Number`
  - `Password` (`min. 8 characters with numbers & symbols`)
  - `Confirm Password`
- **Primary CTA:** `Create Guest Account`
- **Fine Print:** *By creating an account, you acknowledge SkyNest's privacy charter and agree to receive transactional stay updates via email.*
- **Alternate Link:** *Already a member? Sign in to your account.*

---

### Page 5: Guest Profile & Booking History — `/account`
*Owner: Member 3 · Guest Self-Service Portal*

- **Headline (H1):** *Your Residencies & Account* (`font-cinzel italic text-3xl text-ink`)
- **Profile Header:** *Welcome, [First Name] [Last Name] · Member since [Year]*
- **Navigation Tabs:**
  - `Upcoming Stays ([count])`
  - `Past Residencies ([count])`
  - `Profile Preferences`
- **Upcoming Reservation Card:**
  - `Reference:` *[reference_number]*
  - `Branch:` *SkyNest [Branch Name]*
  - `Dates:` *[check_in_date] — [check_out_date] ([nights] nights)*
  - `Suite Type:` *[room_type_name]*
  - `Status Badge:` `CONFIRMED` / `CHECKED_IN`
  - `Actions:` `View Stay Voucher` | `Request Reservation Cancellation`
- **Empty State (Upcoming):**
  - *No upcoming residencies scheduled. Ready to experience your next retreat?*
  - Action Button: `Explore Suites & Book Now`
- **Past Reservation Table:**
  - Columns: `Reference`, `Branch`, `Dates`, `Room Category`, `Final Total`, `Invoice Status`

---

## 4. Staff Dashboard Pages — Complete Content Copy

### Page 6: Dashboard Home — `/dashboard`
*Owner: Shared / Receptionist & Manager Hub*

- **Greeting Header:** *Good [morning/afternoon], [Staff Name].* (`font-cinzel italic text-2xl text-ink`)
- **Operational Branch Badge:** `Current Branch: [Branch Name] — Colombo Sky Tower`
- **Real-Time Metric Cards:**
  - `Today's Scheduled Check-ins:` *[count] Stays*
  - `Today's Scheduled Check-outs:` *[count] Stays*
  - `Active Room Occupancy:` *[occupancy_pct]% ([occupied_rooms] / [total_rooms])*
  - `Pending Arrival Verifications:` *[count] Guests*
- **Front-Desk Quick Action Buttons:**
  - `+ New Walk-in Booking` (`bg-skynest-accent text-white`)
  - `Check In Guest`
  - `Record Service Usage`
  - `Generate Final Bill`
- **Feed Section:** `Recent Front Desk Activity & Stay Events`

---

### Page 7: Bookings Management Master Table — `/dashboard/bookings`
*Owner: Member 3 · Core Operations Grid*

- **Headline (H1):** *Reservation Ledger* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Centralized reservation directory across all SkyNest properties with live status tracking.*
- **Top Control Bar:**
  - Search Input: `Search by Guest Name, Reference, Email, or NIC`
  - Branch Filter: `All Branches` | `Colombo` | `Kandy` | `Galle`
  - Status Filter: `All Statuses` | `PENDING` | `CONFIRMED` | `CHECKED_IN` | `CHECKED_OUT` | `CANCELLED`
  - Date Range Picker: `Select Arrival Date Range`
  - Primary Action (Right): `+ New Front Desk Booking` (`bg-skynest-accent`)
- **Table Column Headers:**
  1. `Reference #` (`font-mono text-sm`)
  2. `Primary Guest`
  3. `Branch`
  4. `Suite Category`
  5. `Arrival`
  6. `Departure`
  7. `Allocated Suite` (Displays physical room number or `Unassigned` chip)
  8. `Stay Status`
  9. `Actions`
- **Row Action Buttons:**
  - If `CONFIRMED`: `Assign Room & Check In`
  - If `CHECKED_IN`: `Manage Stay / Check Out`
  - Default: `View Details`
- **Empty State Notice:**
  - Headline: *No Reservations Matching Filters*
  - Body: *No reservations match the specified branch, dates, or search keywords. Clear filters to view all active stays.*
  - Action Button: `Reset All Filters`

---

### Page 8: New Front Desk Walk-In Booking — `/dashboard/bookings/new`
*Owner: Member 3 · Multi-Room Front Desk Engine*

- **Headline (H1):** *Create Front Desk Reservation* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Record an in-person walk-in or telephone reservation directly into the central ledger.*
- **Section 1 — Guest Registry:**
  - Search Input: `Search existing guest by NIC / Passport, Phone, or Email...`
  - Toggle: `[+] Register New Guest Profile`
  - Quick Guest Inputs: `First Name`, `Last Name`, `Email`, `Phone`, `NIC/Passport`, `Nationality`
- **Section 2 — Suites in This Booking (Atomic Nested Rooms):**
  - Section Header: `Suites & Accommodations`
  - Add Room Action: `+ Add Another Room to Booking`
  - *Per-Room Sub-card:*
    - `Suite Category` (`dropdown of active room types`)
    - `Meal Plan` (`dropdown: RO, BB, HB, FB`)
    - `Stay Dates` (`Check-in Date` to `Check-out Date`)
    - `Primary Occupant` (`select from booking guests`)
    - `Occupancy Headcount` (`Adults`, `Children`)
- **Section 3 — Accompanying Guests:**
  - Section Header: `Accompanying Occupants`
  - Input Fields: `Full Name`, `Relationship`, `NIC / Passport Number`
  - Verification Toggle: `[✓] Identity Document Verified at Counter`
- **Booking Ledger Summary:**
  - `Total Suites:` *[count]*
  - `Aggregate Nights:` *[sum_nights]*
  - `Estimated Tariff:` *LKR [total_tariff]*
- **Submission Action:** `Create & Confirm Reservation` (`bg-skynest-accent text-white`)
- **Overbooking Conflict Alert (HTTP 409):**  
  *⚠️ Capacity Insufficient: The requested room type is fully committed for the specified date interval. Please select an alternative suite category or adjust dates.*

---

### Page 9: Booking Detail, Check-In & Check-Out — `/dashboard/bookings/[id]`
*Owner: Member 3 · Stay Lifecycle & Room Assignment*

- **Headline (H1):** *Stay Ledger: [reference_number]* (`font-cinzel italic text-2xl text-ink`)
- **Header Badges:** `Branch: [Branch Name]` · `Status: [CONFIRMED / CHECKED_IN / CHECKED_OUT]`
- **Panel 1 — Guest Information:**
  - `Primary Guest:` *[first_name] [last_name]*
  - `Contact:` *[email] · [phone]*
  - `Identification:` *[id_number] (NIC/Passport)*
  - `Booked By:` *Guest Online Portal / Front Desk Staff ([staff_name])*
- **Panel 2 — Room Stay Allocation (Physical Room Assignment B3):**
  - `Room Type:` *[room_type_name]*
  - `Rate Frozen at Booking:` *LKR [rate_at_booking] / night*
  - `Physical Room Assignment:`
    - If Unassigned: *No physical room assigned yet.*
    - Dropdown Selector: `Select Available Physical Room (e.g. Room 304 - Floor 3)`
    - Check-in Checkbox: `[✓] Guest ID Verified (Passport/NIC match confirmed)`
    - Primary Action: `Confirm Physical Room & Check In Guest`
- **Panel 3 — Accompanying Occupants (B6):**
  - Table: `Name`, `ID Number`, `Verification Status`, `Action (Verify / Remove)`
  - Button: `+ Add Accompanying Guest`
- **Panel 4 — Billable Services Logged During Stay (B9, B10):**
  - Table: `Date`, `Service Name`, `Quantity`, `Unit Price (Frozen)`, `Subtotal`, `Logged By`
  - Action Button: `+ Log Service Usage (Spa, Mini Bar, Laundry)`
- **Panel 5 — Invoice & Settlement (B11, B12):**
  - `Room Charges:` *LKR [room_charges]*
  - `Service Charges:` *LKR [service_charges]*
  - `Taxes (SC 10% + TDL 1% + SSCL 2.5% + VAT 18%):` *LKR [tax_total]*
  - `Grand Total:` *LKR [total_amount]*
  - `Payments Recorded:` *LKR [paid_amount]*
  - `Outstanding Balance:` *LKR [outstanding_balance]*
- **Check-Out Action:**
  - Normal State: `Complete Check-Out & Finalize Stay`
  - Blocked State (Outstanding Balance > 0):  
    *⚠️ Check-out Blocked: This stay has an outstanding unpaid balance of LKR [balance]. The invoice must be settled or marked authorized before departure.*
    Action: `Settle Invoice at Billing Desk`

---

### Page 10: Branch Management — `/dashboard/branches`
*Owner: Member 2 · Master Data Administration*

- **Headline (H1):** *Branch Properties* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Oversee branch operations, addresses, contact lines, and property status.*
- **Action Button (Top Right):** `+ Register New Branch`
- **Table Headers:** `Branch ID`, `Property Name`, `City`, `Address`, `Contact Phone`, `Operating Status`, `Actions`
- **Status Badges:** `ACTIVE` (`badge-emerald`) | `INACTIVE` (`badge-slate`)
- **Row Actions:** `Edit Details` | `Toggle Active State`

---

### Page 11: Staff Management & RBAC — `/dashboard/staff`
*Owner: Member 1 · User Accounts & Roles*

- **Headline (H1):** *Staff & Permissions Directory* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Manage hotel staff accounts, branch assignments, and role-based access privileges.*
- **Top Control Bar:**
  - Branch Filter: `All Properties` | `Colombo` | `Kandy` | `Galle`
  - Role Filter: `All Roles` | `RECEPTIONIST` | `MANAGER` | `ACCOUNTANT` | `ADMINISTRATOR`
  - Action Button: `+ Add Staff Member`
- **Table Headers:** `Staff Name`, `Assigned Branch`, `Role`, `Email`, `Active Status`, `Last Login`, `Actions`
- **Modal Labels (New Staff):** `First Name`, `Last Name`, `Email Address`, `Branch Assignment`, `System Role`, `Temporary Password`

---

### Page 12: Room & Room-Type Management — `/dashboard/rooms`
*Owner: Member 2 · Inventory & Catalogues*

- **Headline (H1):** *Rooms & Suite Categories* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Configure luxury suite definitions, base tariffs, and physical room maintenance states.*
- **Navigation Tabs:**
  - `Suite Categories (Room Types)`
  - `Physical Room Inventory`
- **Tab 1 — Suite Categories (B2):**
  - Table Headers: `Category Name`, `Base Daily Tariff (LKR)`, `Max Capacity`, `Room Count`, `Actions`
  - Action Button: `+ Add Room Type`
  - Form Fields: `Type Name`, `Base Rate`, `Maximum Occupants`, `Description`, `Feature Amenities`
- **Tab 2 — Physical Room Inventory (B1):**
  - Table Headers: `Room Number`, `Branch`, `Category`, `Floor`, `Current Status`, `Actions`
  - Status Indicators:
    - `AVAILABLE` (`badge-emerald` — Ready for guest check-in)
    - `OCCUPIED` (`badge-blue` — Guest currently in residence)
    - `MAINTENANCE` (`badge-rose` — Excluded from availability count)
    - `RESERVED` (`badge-amber` — Allocated to incoming arrival)
  - Action Button: `+ Add Physical Room`
  - Row Action: `Toggle Maintenance State`

---

### Page 13: Service Catalogue & Tax Configuration — `/dashboard/catalogue`
*Owner: Member 2 & Member 4 · Pricing & Statutory Rates*

- **Headline (H1):** *Services Catalogue & Statutory Tax Rates* (`font-cinzel italic text-2xl text-ink`)
- **Navigation Tabs:**
  - `Chargeable Guest Services`
  - `Statutory Tax Rates`
- **Tab 1 — Chargeable Services (B9, B10):**
  - Table Headers: `Service Name`, `Category (Dining, Wellness, Transport, Laundry)`, `Applicable Branch`, `Base Tariff (LKR)`, `Active Status`, `Actions`
  - Action Button: `+ Register New Service`
- **Tab 2 — Versioned Tax Configurations (B13):**
  - Statutory Warning Banner:  
    *Notice: Modifying an active statutory tax percentage will only apply to future invoices generated after the effective date. Historical invoices preserve their locked tax amounts.*
  - Table Headers: `Tax Identifier`, `Tax Name`, `Current Rate (%)`, `Effective From`, `Effective To`, `Status`
  - Statutory Entries:
    - `SERVICE_CHARGE` — 10.00%
    - `TDL` (Tourism Development Levy) — 1.00%
    - `SSCL` (Social Security Contribution Levy) — 2.50%
    - `VAT` (Value Added Tax) — 18.00%
  - Action Button: `+ Schedule Future Tax Rate`

---

### Page 14: Executive Management Reports — `/dashboard/reports`
*Owner: Member 5 · Analytics & Decision Support*

- **Headline (H1):** *Executive Analytics & Compliance Reports* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Generate verified management reports derived directly from relational audit tables and cached snapshots.*
- **Report Catalog Cards:**
  1. **Room Occupancy Report:**  
     *Description:* *Evaluates occupancy rates, total room nights, and vacant capacity across branches for specified date windows.*  
     *Filters:* `Branch Selection`, `Date Range`
  2. **Revenue Breakdown Report:**  
     *Description:* *Segregates accommodation room revenue vs. ancillary service usage income with statutory tax breakdowns.*  
     *Filters:* `Branch Selection`, `Fiscal Month / Year`
  3. **Unpaid Invoices & Arrears Summary:**  
     *Description:* *Highlights outstanding balances, partially paid invoices, and debtor aging for audit reconciliation.*  
     *Filters:* `Aging Period (> 30 days, > 60 days)`
  4. **Guest Demographics & Channel Analytics:**  
     *Description:* *Tracks domestic vs international guest distribution, length-of-stay averages, and booking sources.*  
     *Filters:* `Date Range`, `Nationality`
  5. **Service Catalogue Utilization Report:**  
     *Description:* *Identifies high-margin services, popular amenities, and consumption volume across dining and wellness.*  
     *Filters:* `Service Category`, `Branch`
- **Action Controls:** `Generate Report` | `Export as CSV` | `Print Official PDF`
- **Snapshot Note:** *Generated snapshots are archived in `report_snapshots` with JSONB audit payloads.*

---

### Page 15: Billing, Invoices & Payment Gateway — `/dashboard/billing`
*Owner: Member 4 · Financial Ledger & Settlements*

- **Headline (H1):** *Invoicing & Financial Settlements* (`font-cinzel italic text-2xl text-ink`)
- **Subhead:** *Generate final bills, execute statutory tax calculations, and record payments against room stays.*
- **Filter Controls:** `Branch`, `Payment Status (UNPAID, PARTIALLY_PAID, PAID)`, `Invoice Date Range`
- **Invoices Master Table:**
  - Table Headers: `Invoice #`, `Booking Reference`, `Guest Name`, `Room #`, `Base Charges`, `Taxes`, `Total (LKR)`, `Paid`, `Balance`, `Status`, `Actions`
  - Status Badges: `UNPAID` (`badge-rose`), `PARTIALLY_PAID` (`badge-amber`), `PAID` (`badge-emerald`)
- **Invoice Detail Modal / Print Preview (sp_generate_final_bill output):**
  - Header: *SkyNest Hotels (Pvt) Ltd · Official Stay Invoice*
  - Stay Details: *Guest: [guest_name] · Suite: [room_number] · Period: [check_in] to [check_out] ([nights] nights)*
  - **Line Items Breakdown:**
    - `Accommodation Room Charges (Base Tariff × Nights):` *LKR [room_charges]*
    - `Chargeable Services Consumed:` *LKR [service_charges]*
    - `Subtotal (Base Billable):` *LKR [v_base]*
    - `10% Hotel Service Charge:` *LKR [service_charge_tax]*
    - `1% Tourism Development Levy (TDL):` *LKR [tdl_amount]*
    - `2.5% Social Security Contribution Levy (SSCL):` *LKR [ssc_amount]*
    - `18% Value Added Tax (VAT on Base + TDL + SSCL):` *LKR [vat_amount]*
    - `Final Invoice Total:` *LKR [total_amount]*
- **Payment Recording Panel (B12):**
  - Input Fields: `Payment Amount (LKR)`, `Payment Method (CASH, CREDIT_CARD, PAYHERE, BANK_TRANSFER)`, `Transaction Reference Number`
  - Action Button: `Record & Post Payment`
  - Validation Warning: *Entered payment amount cannot exceed the remaining unpaid balance.*

---

## 5. Summary of Screen Ownership by Group 40 Members

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 GROUP 40 RESPONSIBILITY MATRIX                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ MEMBER 1 (Auth, Security & Staff):                                                     │
│   • Page 4: /register (Guest Registration)                                             │
│   • /login (Staff Portal Authentication — Pre-built)                                   │
│   • Page 11: /dashboard/staff (Staff Management & RBAC)                                │
│                                                                                        │
│ MEMBER 2 (Rooms, Inventory & Catalogue):                                               │
│   • Page 10: /dashboard/branches (Branch Management)                                   │
│   • Page 12: /dashboard/rooms (Room Types & Physical Rooms)                            │
│   • Page 13: /dashboard/catalogue (Service Catalogue Tab)                              │
│                                                                                        │
│ MEMBER 3 (Reservations, Booking Engine & Frontend Lead — Current User):               │
│   • / (Public Landing Page — Pre-built)                                                │
│   • Page 1: /book (Search & Live Availability)                                         │
│   • Page 2: /book/[roomTypeId] (Room Detail & 4-Step Booking Engine)                   │
│   • Page 3: /book/confirmation/[bookingId] (Voucher & Confirmation)                    │
│   • Page 5: /account (Guest Booking History)                                           │
│   • Page 7: /dashboard/bookings (Bookings Management Master Table)                     │
│   • Page 8: /dashboard/bookings/new (Front Desk Walk-in Multi-Room Booking)            │
│   • Page 9: /dashboard/bookings/[id] (Stay Lifecycle, Check-in/out & Room Assignment)  │
│                                                                                        │
│ MEMBER 4 (Billing, Taxes & Invoicing):                                                 │
│   • Page 13: /dashboard/catalogue (Tax Configurations Tab — 4 Taxes)                   │
│   • Page 15: /dashboard/billing (Invoicing, sp_generate_final_bill & Payments)         │
│                                                                                        │
│ MEMBER 5 (Reports, Auditing & Snapshots):                                              │
│   • Page 14: /dashboard/reports (5 Parameterised Management Reports)                   │
│   • Change log auditing & triggers                                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
