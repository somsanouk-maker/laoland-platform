# LaoLand Platform — Software Design Report

**Project:** LaoLand Real Estate & Land Brokerage Platform
**Version:** 0.1.0 (MVP Prototype)
**Date:** 30 June 2026
**Prepared By:** Senior Solution Architect / Technical Documentation Team
**Confidentiality:** For Client Delivery, Developer Onboarding & Maintenance Reference

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Functional Architecture](#3-functional-architecture)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Module Design](#5-module-design)
   - 5.1 [Showroom — Public Property Marketplace](#51-showroom--public-property-marketplace)
   - 5.2 [Workshop — Broker CRM Dashboard](#52-workshop--broker-crm-dashboard)
   - 5.3 [Property Registration & De-duplication](#53-property-registration--de-duplication)
   - 5.4 [Owner Gatekeeping & Single-Price Verification](#54-owner-gatekeeping--single-price-verification)
   - 5.5 [Mandate Management](#55-mandate-management)
   - 5.6 [First-Referral Protection](#56-first-referral-protection)
   - 5.7 [Co-broking & Contact Masking](#57-co-broking--contact-masking)
   - 5.8 [Sales Pipeline (CRM)](#58-sales-pipeline-crm)
   - 5.9 [Buyer Module](#59-buyer-module)
   - 5.10 [Monetization — Currency-Locked Quotes & Foreign Buyer Wizard](#510-monetization--currency-locked-quotes--foreign-buyer-wizard)
   - 5.11 [WhatsApp Notification Service](#511-whatsapp-notification-service)
6. [Business Process Workflows](#6-business-process-workflows)
7. [User Interface Documentation](#7-user-interface-documentation)
8. [Database Design](#8-database-design)
9. [API Documentation](#9-api-documentation)
10. [Security Design](#10-security-design)
11. [Internationalisation (i18n)](#11-internationalisation-i18n)
12. [System Configuration](#12-system-configuration)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Known Limitations & Technical Debt](#14-known-limitations--technical-debt)
15. [Future Enhancements](#15-future-enhancements)

---

## 1 Executive Summary

### 1.1 Overview

LaoLand is a **real estate land-brokerage platform** purpose-built for the Lao PDR property market. It addresses the unique regulatory, linguistic, and market-structure challenges of Lao land transactions, where:

- Multiple brokers may simultaneously represent the same property without coordination.
- Land ownership verification is opaque and prone to fraud.
- Foreign investors face complex, multi-step legal restrictions on land ownership.
- Pricing is inconsistent — the same land parcel may be advertised at different prices by different agents.

The platform consists of two distinct portals operating from a single codebase:

| Portal | Name | Users | Purpose |
|--------|------|-------|---------|
| Public Portal | **Showroom** | Buyers, Owners, Public | Browse, search, and inquire about land parcels |
| Broker Dashboard | **Workshop** | Brokers | CRM, pipeline management, mandate handling, co-broking |

### 1.2 Objectives

The MVP delivers seven core innovations aligned to the platform's executive strategy:

1. **Property De-duplication** — prevents duplicate listings of the same land parcel using a three-rule algorithm (title deed number, GPS radius ≤ 30m, perceptual image hash similarity).
2. **Owner Gatekeeping & Single-Price Lock** — the owner must verify listing activation via WhatsApp OTP and set a single canonical price; brokers cannot independently alter it.
3. **First-Referral Protection** — an immutable, append-only log assigns 90-day buyer protection to the first broker who introduces a buyer to a property.
4. **Mandate Management** — brokers formally request sales mandates per property (exclusive or open); the owner approves or revokes.
5. **Co-broking with Contact Masking** — brokers can share commissions while protecting buyer contact details via a configurable masking layer.
6. **Currency-Locked Quotes** — multi-currency price quotes (LAK / USD / THB) locked at a specific exchange rate with a 24-hour expiry.
7. **Foreign Buyer Legal Wizard** — a rule-based, trilingual (Lao / English / Chinese) wizard that guides foreign investors through land acquisition legal structures.

### 1.3 Business Value

- **For Buyers:** A single transparent price per property, verifiable ownership badges, and a multilingual interface reduce risk and build trust.
- **For Owners:** WhatsApp-based verification (no app install required) and price lock protection ensure their property is accurately represented.
- **For Brokers:** A structured CRM pipeline, mandate tracking, co-broking, and first-referral protection replace informal workflows and protect commission rights.
- **For the Market:** De-duplication creates a single-source-of-truth property registry, eliminating ghost listings and pricing inconsistencies.

---

## 2 System Overview

### 2.1 Architecture Overview

The platform uses a **Modular Monolith** architecture — a single deployable unit partitioned into clearly-bounded domain modules. This choice was deliberate for the MVP phase:

- Fast development and deployment.
- Low infrastructure cost (critical since the Workshop is free for the first three years for founding brokers).
- Clean module boundaries (`properties`, `mandates`, `pipeline`, `monetization`, `owners`, `buyers`) that can be extracted to independent microservices as scale demands.

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                      │
│  Next.js 14 Frontend (Showroom + Workshop)          │
│  Tailwind CSS · next-intl (lo/en/zh) · React 18     │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP REST (JSON)
                        │ X-User-Id header (MVP auth)
┌───────────────────────▼─────────────────────────────┐
│                  API LAYER                          │
│  Node.js + Express + TypeScript                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │properties│ │ mandates │ │ pipeline │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  owners  │ │  buyers  │ │monetize  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  Helmet · CORS · Multer · Zod · Sharp               │
└───────────────────────┬─────────────────────────────┘
                        │ pg (node-postgres)
┌───────────────────────▼─────────────────────────────┐
│               DATABASE LAYER                        │
│  PostgreSQL 16                                      │
│  12 tables · 10 ENUM types · Triggers · Indexes     │
└─────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│            EXTERNAL SERVICES                        │
│  WhatsApp Cloud API (Meta) — OTP delivery           │
│  Google Maps API — map display (frontend)           │
│  Local filesystem — image uploads (MVP)             │
└─────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend Framework | Next.js | 14.2.35 | App Router SSR for Showroom SEO |
| Frontend Styling | Tailwind CSS | 3.4.6 | Utility-first, rapid development |
| Internationalisation | next-intl | 3.17.0 | Lao/English/Chinese locale routing |
| Map Component | @react-google-maps/api | 2.20.8 | Interactive property map pins |
| Icons | lucide-react | 1.21.0 | Consistent icon set |
| Backend Runtime | Node.js + TypeScript | ESM | Type-safe, shared team knowledge |
| Backend Framework | Express | 4.19.2 | Minimal, well-understood REST framework |
| Database Client | pg (node-postgres) | 8.12.0 | Raw SQL control for complex queries |
| Database | PostgreSQL | 16 | ACID compliance, advanced index support |
| Image Processing | sharp | 0.33.4 | pHash computation for de-duplication |
| File Upload | multer | 1.4.5 | Memory-buffered multipart parsing |
| Validation | zod | 3.23.8 | Runtime schema validation |
| Security Headers | helmet | 7.1.0 | HTTP security hardening |
| Development Server | tsx | 4.16.0 | TypeScript execution with hot-reload |
| Container (dev) | Docker Compose | — | Local PostgreSQL provisioning |

### 2.3 Deployment Overview

The platform is configured for deployment on **Railway** (a cloud PaaS), with separate Railway services for the backend and frontend:

- **Backend:** `backend/railway.json` — Node.js service, runs `npm start` after build.
- **Frontend:** `frontend/railway.json` — Next.js service, runs `npm start`.
- **Database:** Railway PostgreSQL add-on (or external PostgreSQL).
- **Development:** Docker Compose spins up PostgreSQL locally; backend runs on port 4000, frontend on port 3000.

---

## 3 Functional Architecture

The system is partitioned into two front-end portals and six back-end domain modules:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SHOWROOM (Public)               WORKSHOP (Broker-only)             │
│  /[locale]/                      /[locale]/workshop/                │
│  /[locale]/properties/[id]       /[locale]/workshop/pipeline        │
│  /[locale]/wizard                /[locale]/workshop/mandates         │
│  /[locale]/login                 /[locale]/workshop/cobroke          │
│                                  /[locale]/workshop/properties/[id]  │
│                                    /request-mandate                  │
├─────────────────────────────────────────────────────────────────────┤
│  OWNER PORTAL                    BUYER PORTAL                       │
│  /[locale]/owner/                /[locale]/buyer/                   │
│  /[locale]/owner/approvals       /[locale]/buyer/saved              │
│  /[locale]/owner/market          /[locale]/buyer/viewings           │
└─────────────────────────────────────────────────────────────────────┘

Backend Domain Modules
├── properties   — CRUD, De-duplication, Image pipeline, Search, Inquiries
├── owners       — OTP issuance, Owner verification, Mandate approval/revoke
├── mandates     — Mandate lifecycle, Referral protection, Co-broke
├── pipeline     — Sales pipeline (Kanban), Viewing logs, Stage transitions
├── monetization — Currency-locked quotes, Foreign Buyer Wizard
└── buyers       — Buyer profile, Saved properties, Viewing history
```

---

## 4 User Roles & Permissions

### 4.1 Role Definitions

The system defines four user roles as a PostgreSQL ENUM (`user_role`):

| Role | Description | Primary Portal |
|------|-------------|---------------|
| `buyer` | Searches for land, saves favourites, tracks viewings | Showroom + Buyer Portal |
| `owner` | Verifies property ownership, sets price, approves mandates | Owner Portal |
| `broker` | Registers properties, manages mandates, operates CRM | Workshop |
| `admin` | Platform administration (seeded, not yet fully implemented) | All |

### 4.2 Permissions Matrix

| Capability | buyer | owner | broker | admin |
|-----------|:-----:|:-----:|:------:|:-----:|
| Browse Showroom (public) | ✓ | ✓ | ✓ | ✓ |
| Search & filter properties | ✓ | ✓ | ✓ | ✓ |
| View property detail | ✓ | ✓ | ✓ | ✓ |
| Submit inquiry / viewing request | ✓ | — | — | ✓ |
| Save properties & select broker | ✓ | — | — | ✓ |
| View own viewings history | ✓ | — | — | ✓ |
| Confirm viewing attendance | ✓ | — | — | ✓ |
| Update buyer profile | ✓ | — | — | ✓ |
| Receive OTP & verify listing | — | ✓ | — | ✓ |
| Approve / revoke mandates | — | ✓ | — | ✓ |
| View own properties | — | ✓ | — | ✓ |
| View market trends | — | ✓ | — | ✓ |
| Create property (De-dup check first) | — | — | ✓ | ✓ |
| Upload property images | — | — | ✓ | ✓ |
| Request mandate on property | — | — | ✓ | ✓ |
| Manage mandates (list, track) | — | — | ✓ | ✓ |
| Register buyer referral | — | — | ✓ | ✓ |
| Check referral protection | — | — | ✓ | ✓ |
| Propose / accept co-broke | — | — | ✓ | ✓ |
| View masked buyer contact | — | — | ✓* | ✓ |
| Operate sales pipeline (Kanban) | — | — | ✓ | ✓ |
| Log GPS viewing | — | — | ✓ | ✓ |
| Generate currency-locked quote | ✓ | ✓ | ✓ | ✓ |
| Use Foreign Buyer Wizard | ✓ | ✓ | ✓ | ✓ |

> *Masked: the co-broke partner sees buyer info only if `mask_contacts = false` or they are the introducing broker.

### 4.3 Authentication Mechanism

**Current MVP implementation:** The backend uses a simplified header-based authentication. The client sends `X-User-Id: <uuid>` with every authenticated request. The middleware resolves this to a `users` row and attaches `{ id, role }` to `req.user`.

> **Important:** This is explicitly documented in the code as a development mechanism. The code comment states: *"MVP: ໃຊ້ header X-User-Id ແທນ JWT ເຕັມຮູບແບບ (ປ່ຽນເປັນ JWT ໃນ production)"* — use full JWT in production.

The frontend `AuthContext` stores demo user credentials in `localStorage` with fixed seed database UUIDs:
- Broker: `11111111-1111-1111-1111-111111111111`
- Owner: `33333333-3333-3333-3333-333333333333`
- Buyer: `44444444-4444-4444-4444-444444444444`

---

## 5 Module Design

### 5.1 Showroom — Public Property Marketplace

#### Purpose
The public-facing portal where buyers discover land parcels. Optimised for SEO via Next.js SSR and internationalised for three languages.

#### Implemented Features
- **Property grid & map dual view** — toggle between card grid and Google Maps pin view.
- **Search & filters** — province/district/village text search; land type filter (residential, agricultural, industrial, commercial); price preset ranges; Green Badge (verified exclusive) filter.
- **Currency switcher** — LAK / USD / THB with context-wide formatting applied to all price displays.
- **Market statistics banner** — live stats from backend: total active listings, verified records, active mandates, exclusive listings, average Vientiane price, average Railway Corridor price.
- **Property detail page** — full property information, GPS coordinates link, deed type display, owner verification badge, price lock indicator, broker inquiry form.
- **Inquiry & viewing requests** — buyers can request information or schedule a viewing; these are automatically routed to the assigned mandate broker and create a pipeline deal at `inquiry` stage.
- **Broker selection** — buyers can view active mandate brokers for a property and select their preferred broker.

#### Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Showroom Home | `/[locale]/` | Search, filters, grid/map toggle, market stats |
| Property Detail | `/[locale]/properties/[id]` | Full property info, inquiry form, map |
| Login | `/[locale]/login` | Role selection, phone entry, OTP verification |
| Foreign Buyer Wizard | `/[locale]/wizard` | Legal eligibility wizard |

#### Business Rules
- Only properties with `status = 'active'` appear in search results.
- Green Badge (`green_badge = true`) properties are sorted to the top.
- Properties without an active mandate cannot receive inquiries (404 response: "no responsible broker found").
- Price display respects currency context; formatted amounts shown across LAK/USD/THB based on user preference.

#### Key UI Components
- `MapView` — dynamic import (SSR-disabled) wrapping `@react-google-maps/api` with clustered pins.
- `LocationPicker` — Google Maps picker used in property creation form.
- `LocaleSwitcher` — dropdown for language selection (lo/en/zh).
- `CurrencyContext` — React context providing `format(amount, fromCurrency)` conversion.

---

### 5.2 Workshop — Broker CRM Dashboard

#### Purpose
The broker-only dashboard providing property management, mandate tracking, pipeline CRM, and co-broking tools.

#### Implemented Features
- **Workshop home / property form** — multi-step property creation with integrated de-duplication check and GPS location picker.
- **Sales Pipeline (Kanban)** — visual board with six stages: Inquiry → Viewing → Negotiation → Deposit → Closed → Lost.
- **Mandate management** — list of broker's active/requested mandates with status tracking.
- **Co-broking management** — propose, accept, and view co-broke agreements with masking controls.
- **Request Mandate flow** — when a duplicate property is detected, the broker is redirected to request a mandate on the existing record rather than creating a duplicate.
- **Broker statistics** — active mandates, open deals, closed deals, total viewings.

#### Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Workshop Dashboard | `/[locale]/workshop` | Property form, de-dup check, stats |
| Pipeline | `/[locale]/workshop/pipeline` | Kanban board, stage management |
| Mandates | `/[locale]/workshop/mandates` | Mandate list, status, revoke |
| Co-broking | `/[locale]/workshop/cobroke` | Co-broke proposals, split percentages |
| Request Mandate | `/[locale]/workshop/properties/[id]/request-mandate` | Post-dedup mandate request form |

#### Access Control
All Workshop routes are protected by the `RequireRole` component which checks `AuthContext` for the `broker` role. Unauthenticated or non-broker users are redirected to the login page.

---

### 5.3 Property Registration & De-duplication

#### Purpose
Prevents duplicate property records for the same physical land parcel — the core data integrity mechanism of the platform.

#### De-duplication Algorithm (Three-Rule Check)

When a broker attempts to register a new property, the system executes three checks **in sequence**:

**Rule 1 — Title Deed Number Match**
```sql
SELECT id FROM properties WHERE title_deed_no = $1 LIMIT 1
```
If the title deed number already exists in the database, the property is flagged as a duplicate. Title deed numbers carry a unique index.

**Rule 2 — GPS Radius Check (≤ 30 metres)**
```sql
SELECT id,
  sqrt(power((lat - $2) * 111320, 2)
     + power((lng - $1) * 111320 * cos(radians($2)), 2)) AS dist
FROM properties
WHERE lat BETWEEN $2 - $3 AND $2 + $3
  AND lng BETWEEN $1 - $3 AND $1 + $3
ORDER BY dist ASC LIMIT 1
```
The 30-metre radius is configured via `DEDUP_RADIUS_METERS` environment variable (default: 30). A bounding box pre-filter uses degrees-per-metre approximation.

**Rule 3 — Perceptual Image Hash (pHash Hamming Distance)**
```
Upload images → sharp → average 64-bit hash → compare Hamming distance ≤ DEDUP_PHASH_MAX_HAMMING (default: 10)
```
Images are processed in memory (not saved) for the pre-check; the pHash is stored as a `bigint` in `property_images.phash`.

**On Duplicate Detection:**
The API returns HTTP 409 with:
```json
{
  "duplicate": { "propertyId": "...", "reason": "deed_no|gps_radius|similar_image" },
  "redirectTo": "/workshop/properties/{id}/request-mandate"
}
```
The frontend intercepts this and navigates the broker to the Request Mandate flow.

**On No Duplicate:**
Property is inserted with `status = 'pending_owner'` awaiting owner OTP verification.

#### Image Pipeline
- Endpoint: `POST /api/properties/images/hash` — pre-check before uploading.
- Endpoint: `POST /api/properties/:id/images` — upload and store with pHash.
- Multer: memory storage, 8MB per file, max 10 files, image MIME types only.
- `sharp` processes each uploaded buffer to compute a 64-bit perceptual average hash.

#### API Endpoints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/properties/check-duplicate` | broker/admin | Pre-check before creation |
| POST | `/api/properties` | broker/admin | Create property (includes de-dup) |
| POST | `/api/properties/images/hash` | broker/admin | Compute pHashes (pre-upload check) |
| POST | `/api/properties/:id/images` | broker/admin | Upload images with pHash storage |
| GET | `/api/properties` | public | Search active properties |
| GET | `/api/properties/market-stats` | public | Aggregate market statistics |
| GET | `/api/properties/:id` | public | Property detail |
| GET | `/api/properties/:id/brokers` | public | Active mandate brokers for a property |
| POST | `/api/properties/:id/inquire` | public | Submit inquiry / viewing request |

---

### 5.4 Owner Gatekeeping & Single-Price Verification

#### Purpose
Ensures no property goes live on the Showroom without verified owner consent and a locked canonical price. Eliminates the industry problem of brokers misrepresenting prices.

#### Workflow
```
Broker creates property (status: pending_owner)
         │
         ▼
  [Owner Portal] Owner receives notification
         │
         ▼
  POST /api/owners/otp/request
  → generates 6-digit OTP
  → hashes it (SHA-256)
  → stores in otp_verifications
  → sends via WhatsApp (or stub console in dev)
         │
         ▼
  Owner receives WhatsApp message (trilingual):
  "ລະຫັດຢືນຢັນ LaoLand: 123456 / Your code: 123456 / 验证码: 123456"
         │
         ▼
  POST /api/owners/otp/verify + { code, ownerSetPrice, priceCurrency }
  → verifies code hash
  → marks OTP consumed
  → updates property:
      owner_verified = true
      price_locked = true
      owner_set_price = [owner's price]
      status = 'active'
  → writes audit_log entry
         │
         ▼
  Property is now ACTIVE on Showroom with Green Badge eligibility
```

#### Business Rules
- OTP is valid for `OTP_TTL_MINUTES` minutes (default: 10).
- Maximum `OTP_MAX_ATTEMPTS` failed attempts (default: 5); after which the OTP is rejected and must be regenerated.
- The OTP code is **never stored in plaintext** — only its SHA-256 hash is persisted.
- Once `price_locked = true`, neither the owner nor any broker can modify `owner_set_price` through the API (write-once pattern enforced at application level).
- Owner can approve or revoke individual broker mandates (`/api/owners/mandates/:id/approve` and `/revoke`).

#### Owner Portal Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Owner Dashboard | `/[locale]/owner` | Property list, OTP verification form |
| Mandate Approvals | `/[locale]/owner/approvals` | Pending/active mandates, approve/revoke |
| Market Trends | `/[locale]/owner/market` | Market stats relevant to owner's properties |

#### API Endpoints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/owners/otp/request` | owner | Request WhatsApp OTP |
| POST | `/api/owners/otp/verify` | owner | Verify OTP, activate listing, lock price |
| GET | `/api/owners/properties` | owner | List owner's properties |
| GET | `/api/owners/mandates` | owner | List mandates on owner's properties |
| POST | `/api/owners/mandates/:id/approve` | owner | Approve a broker mandate |
| POST | `/api/owners/mandates/:id/revoke` | owner | Revoke a broker mandate |

---

### 5.5 Mandate Management

#### Purpose
Formalises the legal and commercial relationship between a broker and a property. A mandate grants the broker the right to sell/represent that property.

#### Mandate Types
| Type | Description | Constraint |
|------|-------------|-----------|
| `exclusive` | Sole representation right | Only one active exclusive mandate per property (enforced by DB unique partial index) |
| `open` | Non-exclusive; multiple brokers may hold active open mandates | No unique constraint |

#### Mandate Lifecycle
```
requested → active (owner approves) → revoked (owner revokes)
                                    → expired (future: time-based)
```

#### Trackable Slug
Each mandate generates a unique `trackable_slug` (e.g., `m-demo-somphone`). This creates a **personalised link** for the broker: when a buyer arrives via this link, the mandate broker is identified and the referral is attributed.

**Resolution endpoint:** `GET /api/mandates/link/:slug` — public, no auth required.

#### Green Badge
A property earns the Green Badge (`green_badge = true`) when it has an exclusive mandate with `is_exclusive = true` AND `owner_verified = true`. This badge is displayed prominently in the Showroom.

#### API Endpoints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/mandates/link/:slug` | public | Resolve trackable link |
| GET | `/api/mandates` | broker | List broker's mandates |
| POST | `/api/mandates` | broker | Request a mandate |
| POST | `/api/mandates/referrals` | broker | Register a referral |
| POST | `/api/mandates/referrals/check` | broker | Check referral protection |
| GET | `/api/mandates/brokers` | broker | List other brokers (for co-broke) |
| GET | `/api/mandates/cobroke` | broker | List co-broke agreements |
| POST | `/api/mandates/cobroke` | broker | Propose co-broke |
| POST | `/api/mandates/cobroke/:id/accept` | broker | Accept co-broke proposal |
| GET | `/api/mandates/cobroke/:id/buyer` | broker | Get buyer (with masking) |

---

### 5.6 First-Referral Protection

#### Purpose
Protects the first broker who introduces a buyer to a specific property from being cut out of the commission by another broker or direct contact.

#### Mechanism
When a broker introduces a buyer to a property (e.g., schedules a viewing), they register the referral:

```
POST /api/mandates/referrals
{ propertyId, buyerPhoneE164 }
```

The system:
1. Hashes the buyer's E.164 phone number (identity anchor without storing PII).
2. Inserts a row into `referrals` with `protected_until = now() + 90 days`.
3. A unique partial index `uq_referral_property_buyer` on `(property_id, buyer_phone_hash)` prevents the same buyer from being registered twice for the same property.

**Immutability:** A PostgreSQL trigger (`trg_referral_immutable`) prevents `DELETE` and restricts `UPDATE` to only the `status` column. The core identity fields (broker, buyer, property, dates) are write-once and tamper-proof.

**Protection Check:**
```
POST /api/mandates/referrals/check
{ propertyId, buyerPhoneE164 }
→ { protected: true/false, brokerId, protectedUntil }
```

This allows any broker (or the system) to verify whether a buyer is already under another broker's 90-day protection window before proceeding with a transaction.

#### Business Rules
- Protection period: 90 days (configured via `REFERRAL_PROTECT_DAYS` environment variable).
- Hash comparison uses SHA-256 of the E.164 phone number — the raw phone number is not stored.
- The referral log is append-only; records cannot be deleted by any user, including admins.

---

### 5.7 Co-broking & Contact Masking

#### Purpose
Enables two brokers to collaborate on a deal — one holds the property mandate (listing broker), the other has the buyer (co-broke broker) — while protecting each party's key business asset (their buyer's contact details).

#### Co-broke Lifecycle
```
Listing Broker proposes co-broke to Co-broke Broker
POST /api/mandates/cobroke
{ propertyId, cobrokeBrokerId, splitListingPct, splitCobrokePct }

Co-broke Broker accepts:
POST /api/mandates/cobroke/:id/accept

Status: proposed → accepted → closed
```

#### Commission Split
- Configurable percentage split: `split_listing_pct` + `split_cobroke_pct` must equal 100.00.
- Database constraint: `CHECK (split_listing_pct + split_cobroke_pct = 100.00)`.
- Default split: 50% / 50%.

#### Contact Masking
- `mask_contacts = true` (default): when the listing broker calls `GET /api/mandates/cobroke/:id/buyer`, the buyer's phone number is returned as `null` and name is partially redacted.
- `mask_contacts = false`: full buyer contact is visible to both parties (must be agreed upon).
- This protects the co-broke broker's buyer from being contacted directly by the listing broker and bypassing the commission split.

---

### 5.8 Sales Pipeline (CRM)

#### Purpose
Provides brokers with a structured sales funnel tracking every deal from initial buyer inquiry through to completion or loss.

#### Pipeline Stages
```
inquiry → viewing → negotiation → deposit → closed
                                           ↘ lost
```

| Stage | Trigger |
|-------|---------|
| `inquiry` | Created automatically when a buyer submits an inquiry via the Showroom |
| `viewing` | Advanced automatically when a GPS viewing log is recorded |
| `negotiation` | Manually advanced by broker |
| `deposit` | Manually advanced by broker |
| `closed` | Deal completed |
| `lost` | Deal terminated |

#### Kanban Board
`GET /api/pipeline/board` returns deals grouped by stage:
```json
{
  "inquiry": [...],
  "viewing": [...],
  "negotiation": [...],
  "deposit": [...],
  "closed": [...],
  "lost": [...]
}
```
Each deal includes: property location, buyer name (if registered), viewing count, buyer contact masking flag.

#### GPS Viewing Log
When a broker logs a physical property visit:
```
POST /api/pipeline/:dealId/log-viewing
{ lat, lng, notes }
```
- A row is inserted into `viewing_logs` with `lock_expires_at = now() + 90 days`.
- The pipeline deal is automatically advanced from `inquiry` to `viewing`.
- This GPS timestamp serves as evidence for First-Referral Protection.

#### Buyer Viewing Confirmation
A buyer can confirm their attendance at a viewing:
```
POST /api/buyers/viewings/:viewingLogId/confirm
```
Sets `buyer_confirmed = true` and `buyer_confirmed_at = now()`.

#### Broker Statistics
`GET /api/pipeline/stats` returns:
```json
{
  "active_mandates": 3,
  "open_deals": 7,
  "closed_deals": 2,
  "total_viewings": 15
}
```

#### API Endpoints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/pipeline/board` | broker | Kanban board grouped by stage |
| GET | `/api/pipeline/stats` | broker | Broker statistics summary |
| POST | `/api/pipeline` | broker | Create new deal |
| PATCH | `/api/pipeline/:id/stage` | broker | Advance or change deal stage |
| POST | `/api/pipeline/:id/log-viewing` | broker | Record GPS viewing visit |

---

### 5.9 Buyer Module

#### Purpose
Provides buyers with personalised tools to track their property search, manage saved listings, and maintain their viewing history.

#### Implemented Features

**Buyer Profile**
Buyers can store their preferences (preferred provinces, districts, land types, budget range) for future matching:
```
PUT /api/buyers/profile
{ preferredProvinces, preferredDistricts, preferredLandTypes, budgetMinLak, budgetMaxLak, notes }
```

**Saved Properties**
Buyers can save properties and optionally select a preferred broker:
- `POST /api/buyers/saved` — save with optional `brokerId`.
- `DELETE /api/buyers/saved/:propertyId` — unsave.
- `GET /api/buyers/saved` — list saved properties with broker info, price, location, Green Badge status.

**Viewing History**
- `GET /api/buyers/viewings` — list all GPS-logged viewings the buyer has been part of, with lock expiry dates, broker details, and confirmation status.
- `POST /api/buyers/viewings/:id/confirm` — buyer confirms attendance.

#### Buyer Portal Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Buyer Dashboard | `/[locale]/buyer` | Profile, preferences |
| Saved Properties | `/[locale]/buyer/saved` | Saved listings with broker info |
| Viewing History | `/[locale]/buyer/viewings` | Upcoming and past viewings |

---

### 5.10 Monetization — Currency-Locked Quotes & Foreign Buyer Wizard

#### 5.10.1 Currency-Locked Quotes

**Purpose:** Provides buyers with a price quote locked to a specific exchange rate, valid for 24 hours, protecting against currency fluctuation during negotiation.

**Supported Currencies:** LAK (Lao Kip), USD (US Dollar), THB (Thai Baht).

**Flow:**
```
POST /api/monetization/quotes
{ propertyId, baseCurrency, quoteCurrency, baseAmount }

→ looks up latest fx_rate
→ calculates locked_amount = baseAmount × rate
→ stores in currency_quotes with expires_at = now() + 24h
→ returns { id, lockedAmount, quoteCurrency, expiresAt, status: 'locked' }
```

**Quote Status Lifecycle:** `locked` → `honored` (deal closed) or `expired` (24h elapsed).

#### 5.10.2 Foreign Buyer Legal Wizard

**Purpose:** A rule-based decision engine that guides foreign nationals through the legal options for land investment in Laos, presented in three languages.

**Input:**
```json
{
  "buyerNationality": "foreign",
  "hasLaoRegisteredEntity": false,
  "intent": "buy_land | lease_land | buy_condo",
  "leaseYears": 30,
  "lang": "en"
}
```

**Decision Logic:**

| Scenario | Result |
|----------|--------|
| Lao citizen | `eligible: true`, `freehold_ownership` |
| Foreign, intent `buy_land` | `eligible: false`, recommend `long_term_lease`, fallback: `condominium` |
| Foreign, intent `buy_condo` | `eligible: true`, `condominium_unit` |
| Foreign lease ≤ 50 years (no entity) | `eligible: true`, `long_term_lease` |
| Foreign lease ≤ 75 years (with Lao entity) | `eligible: true`, `concession_via_entity` |
| Foreign lease exceeds limit | `eligible: false`, suggest reduce or register entity |

**Legal Constants** (configurable, require legal review for production):
- Max lease for foreign national: 50 years.
- Max lease via Lao-registered promoted entity: 75 years.

**Frontend:** The `/[locale]/wizard` screen provides a step-by-step form with results displayed in the user's selected language.

---

### 5.11 WhatsApp Notification Service

#### Purpose
Delivers OTP codes to property owners via WhatsApp — the primary communication channel in Laos, where WhatsApp penetration is high and no app install is required beyond what users already have.

#### Architecture
The service is implemented as an adapter pattern (`backend/src/services/whatsapp.ts`):

- **Production mode:** Calls WhatsApp Cloud API (`graph.facebook.com/v{version}/{phoneId}/messages`) with a Bearer token.
- **Stub mode (dev/test):** When `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_ID` are absent, the OTP code is printed to the server console. This allows full flow testing without real WhatsApp credentials.

#### OTP Message Format
The OTP message is automatically generated in all three languages:
```
ລະຫັດຢືນຢັນ LaoLand: 123456
Your LaoLand code: 123456
您的 LaoLand 验证码: 123456
(ໝົດອາຍຸໃນ 10 ນາທີ / valid 10 min)
```

#### Security
- OTP codes are generated as 6-digit numeric strings.
- Only the SHA-256 hash is stored in `otp_verifications.code_hash`.
- Brute-force protection: after `OTP_MAX_ATTEMPTS` (default 5) failed attempts, the OTP is invalidated.
- TTL: configurable via `OTP_TTL_MINUTES` (default 10 minutes).

---

## 6 Business Process Workflows

### 6.1 Property Registration & Activation

```
┌─────────────┐    check-duplicate     ┌─────────────┐
│   Broker    │──────────────────────▶│   Backend   │
│  (Workshop) │                        │  De-dup     │
└─────────────┘                        └──────┬──────┘
        │                                     │
        │ Duplicate found?                    │
        │ YES → redirect to                   │ NO → create property
        │        Request Mandate              │       status: pending_owner
        ▼                                     ▼
┌─────────────┐    OTP via WhatsApp   ┌─────────────┐
│    Owner    │◀─────────────────────│   Backend   │
│  (Portal)   │                        │  OTP svc    │
└──────┬──────┘                        └─────────────┘
       │ Enters OTP + price
       ▼
┌─────────────┐
│  Property   │  status: active
│  LIVE on    │  owner_verified: true
│  Showroom   │  price_locked: true
└─────────────┘
```

### 6.2 Buyer Inquiry Flow

```
Buyer clicks "Request Info / Viewing" on Showroom
        │
        ▼
POST /api/properties/:id/inquire
        │
        ├─ Finds active mandate broker for property
        │
        ├─ Creates sales_pipeline deal (stage: inquiry)
        │
        └─ Returns brokerName, dealId to buyer
                │
                ▼
        Broker sees new card in Pipeline Kanban (inquiry column)
```

### 6.3 Viewing & Referral Lock Flow

```
Broker arranges viewing
        │
        ▼
POST /api/pipeline/:dealId/log-viewing { lat, lng }
        │
        ├─ Inserts viewing_log (lock_expires_at = +90 days)
        │
        ├─ Auto-advances deal to 'viewing' stage
        │
        └─ Broker's claim on this buyer is protected for 90 days
                │
                ▼
POST /api/mandates/referrals { propertyId, buyerPhoneE164 }
        │
        └─ Immutable referral record (cannot be deleted)
```

### 6.4 Co-broking Flow

```
Broker A (listing) ──proposes──▶ Broker B (has buyer)
POST /api/mandates/cobroke
{ cobrokeBrokerId: B, splitListingPct: 60, splitCobrokePct: 40 }
                        │
                        ▼
               Status: proposed
                        │
        Broker B accepts:
        POST /api/mandates/cobroke/:id/accept
                        │
                        ▼
               Status: accepted
        mask_contacts = true (default)
        → Broker A cannot see Buyer's phone
```

### 6.5 Currency Quote Flow

```
Buyer requests price in USD
POST /api/monetization/quotes
{ propertyId, baseCurrency: LAK, quoteCurrency: USD, baseAmount: 1500000000 }
        │
        ▼
System: 1500000000 LAK ÷ 21500 = 69,767 USD
→ Returns locked_amount: 69767, expires_at: now()+24h
        │
        ▼
Buyer has 24 hours at this locked rate
```

---

## 7 User Interface Documentation

### 7.1 Navigation & Layout

#### Sidebar Navigation (`Sidebar.tsx`)
The `Sidebar` component renders a role-aware navigation sidebar with four sections:

| Section | Visible To | Menu Items |
|---------|-----------|-----------|
| Public | Everyone | Find Land, Foreign Investor |
| Workshop | broker | Dashboard, Add Property, Pipeline, My Mandates, Co-broking |
| Owner | owner | My Properties, Mandate Approvals, Market Trends |
| Buyer | buyer | My Profile, Saved Properties |

The sidebar also renders:
- Language switcher (`LocaleSwitcher`) — switches between `lo`, `en`, `zh`.
- Login / Logout button with current user name and role badge.

#### Route Grouping
All pages are nested under `/[locale]/` which enables locale-prefixed URLs:
- `/lo/` — Lao
- `/en/` — English
- `/zh/` — Chinese

#### Authentication Guard (`RequireRole.tsx`)
A client-side guard component that reads from `AuthContext`. If the user's role does not match the required roles, it redirects to the login page.

### 7.2 Login Screen

**Route:** `/[locale]/login`

The login screen implements a three-step flow:

1. **Role Selection** — user selects Broker / Owner / Buyer with role descriptions.
2. **Phone Entry** — user enters WhatsApp number and name; system sends OTP.
3. **OTP Verification** — user enters the 6-digit code.

**MVP note:** The frontend does not call the OTP API in the current implementation. The `AuthContext.login()` function maps roles to fixed seed database UUIDs, enabling demo flow without live WhatsApp credentials.

### 7.3 Showroom Home Screen

**Route:** `/[locale]/`

Layout elements:
- **Market statistics row:** total listings, verified records, mandates, exclusive listings, Vientiane average price, Railway Corridor average price.
- **Search bar:** province/district/village text input.
- **Filter panel:** land type pills, price preset buttons, Green Badge toggle.
- **View toggle:** Grid icon / Map icon.
- **Currency selector:** LAK / USD / THB tabs.
- **Results:** card grid or MapView with `MapPin` markers.

Property card contains: province/district/village, land type badge, area, price (formatted in selected currency), Green Badge indicator, "View Details" link.

### 7.4 Property Detail Screen

**Route:** `/[locale]/properties/[id]`

Sections:
- **Header:** property ID, province, district, village, land type.
- **Price block:** formatted price with currency, "Price Locked" badge if `price_locked = true`.
- **Deed info:** title deed number (if available), deed type label (Titled / Survey / Tax Receipt / White Paper).
- **Verification badges:** Owner Verified (✓/✗), Green Badge (if applicable).
- **Location:** address text, Google Maps link.
- **Inquiry / Viewing form:** buyer name, phone, inquiry type (info/viewing), message, broker selection dropdown.
- **Active brokers list:** shows mandate brokers with mandate type and exclusive status.

### 7.5 Workshop Home / Property Form

**Route:** `/[locale]/workshop`

Multi-step property creation UI:
1. **Duplicate Check Step:** broker enters title deed number and GPS coordinates (via LocationPicker map); clicks "Check Duplicate".
   - Duplicate found → orange alert with "Request Mandate" button.
   - No duplicate → green alert; proceed button enabled.
2. **Property Details Step:** land type, deed type, province/district/village, area, price.
3. **Submit:** creates property; success → navigates to pipeline.

### 7.6 Pipeline / Kanban Screen

**Route:** `/[locale]/workshop/pipeline`

Six-column Kanban board. Each column header shows stage name and deal count. Cards display property location, buyer name (if present), viewing count, and quick-action buttons (stage advance).

### 7.7 Foreign Buyer Wizard Screen

**Route:** `/[locale]/wizard`

Step-by-step wizard:
1. **Nationality** — Lao / Foreign.
2. **Intent** — Buy Land / Lease Land / Buy Condo.
3. **Lease duration** (if leasing) — year input.
4. **Entity** — whether the buyer has a Lao-registered legal entity.
5. **Result panel** — eligibility status, recommended structure, notes, fallback suggestion.

All text is displayed in the user's selected locale (lo/en/zh).

---

## 8 Database Design

### 8.1 Tables Overview

| Table | Rows (seed) | Description |
|-------|-------------|-------------|
| `users` | 4 | All platform users with role |
| `properties` | 1 | Physical land parcels (single source of truth) |
| `property_images` | 0 | Property images with pHash |
| `mandates` | 1 | Broker sales representation rights |
| `otp_verifications` | 0 | WhatsApp OTP log |
| `referrals` | 0 | First-referral protection log (immutable) |
| `co_broke_agreements` | 0 | Co-broke commission splits |
| `sales_pipeline` | 0 | CRM deals by stage |
| `viewing_logs` | 0 | GPS viewing records |
| `fx_rates` | 5 | Exchange rates for currency conversion |
| `currency_quotes` | 0 | Locked price quotes |
| `audit_log` | 0 | Immutable system event log |
| `saved_properties` | 0 | Buyer wishlist |
| `buyer_profiles` | 0 | Buyer preferences |

### 8.2 ENUM Types

```sql
user_role:      buyer | owner | broker | admin
lang_code:      lo | en | zh
currency_code:  LAK | USD | THB
land_type:      residential | agricultural | industrial | commercial
deed_type:      titled | survey | tax_receipt | white_paper
property_status: draft | pending_owner | active | sold | archived
mandate_type:   exclusive | open
mandate_status: requested | active | revoked | expired
otp_channel:    whatsapp | sms
otp_purpose:    activate_listing | confirm_price | revoke_broker
referral_status: active | expired | converted
cobroke_status: proposed | accepted | rejected | closed
pipeline_stage: inquiry | viewing | negotiation | deposit | closed | lost
quote_status:   locked | expired | honored
```

### 8.3 Key Relationships

```
users ─────────────────────────── (1) is owner of ──────▶ properties
users ─────────────────────────── (1) created by ──────▶ properties
users (broker) ─────────────────── (N) holds ──────────▶ mandates
mandates ──────────────────────── (N) on ──────────────▶ properties
properties ────────────────────── (N) has ─────────────▶ property_images
users ─────────────────────────── (N) receives ────────▶ otp_verifications
properties ────────────────────── (N) has ─────────────▶ otp_verifications
referrals ──── broker + property + buyer_phone_hash (unique per buyer+property)
co_broke_agreements ── listing_broker + cobroke_broker + property
sales_pipeline ──────── broker + property + mandate + buyer
viewing_logs ──────── deal + property + broker + buyer (lat/lng + lock)
currency_quotes ──── property + rate snapshot
saved_properties ── buyer + property + optional broker
buyer_profiles ──── buyer (1:1)
audit_log ─────────── append-only event record
```

### 8.4 Key Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `uq_properties_deed_no` | properties | `title_deed_no` (WHERE NOT NULL) | De-dup rule 1, uniqueness |
| `idx_properties_latng` | properties | `(lat, lng)` | De-dup rule 2 geo search |
| `idx_properties_status` | properties | `status` | Showroom filter |
| `idx_properties_loc` | properties | `(province, district)` | Location search |
| `idx_images_phash` | property_images | `phash` | De-dup rule 3 scan |
| `uq_mandate_broker_property` | mandates | `(property_id, broker_id)` | One mandate per broker per property |
| `uq_mandate_exclusive` | mandates | `property_id` WHERE exclusive+active | Enforces single exclusive mandate |
| `uq_referral_property_buyer` | referrals | `(property_id, buyer_phone_hash)` | One referral per buyer per property |
| `idx_referrals_protect` | referrals | `(property_id, protected_until)` | Protection window queries |
| `idx_pipeline_broker_stage` | sales_pipeline | `(broker_id, stage)` | Kanban queries |
| `idx_fx_pair` | fx_rates | `(base, quote, as_of DESC)` | Latest rate lookup |
| `idx_audit_entity` | audit_log | `(entity, entity_id)` | Entity history queries |

### 8.5 Database Triggers

| Trigger | Table | Effect |
|---------|-------|--------|
| `trg_users_updated` | users | Auto-sets `updated_at = now()` on UPDATE |
| `trg_properties_updated` | properties | Auto-sets `updated_at = now()` on UPDATE |
| `trg_cobroke_updated` | co_broke_agreements | Auto-sets `updated_at = now()` on UPDATE |
| `trg_pipeline_updated` | sales_pipeline | Auto-sets `updated_at = now()` on UPDATE |
| `trg_referral_immutable` | referrals | Raises EXCEPTION on DELETE; restricts UPDATE to `status` only |

### 8.6 Constraints

- `co_broke_agreements`: `CHECK (split_listing_pct + split_cobroke_pct = 100.00)` — commission split must total 100%.
- `users.phone_e164`: UNIQUE — phone number is the primary identity anchor.
- `mandates.trackable_slug`: UNIQUE — each trackable broker link is globally unique.
- `saved_properties`: UNIQUE `(buyer_id, property_id)` — no duplicate saves.
- `buyer_profiles`: PRIMARY KEY is `buyer_id` (1:1 with users).
- `fx_rates`: UNIQUE `(base, quote, as_of)` — no duplicate rate snapshots.

---

## 9 API Documentation

### 9.1 Base URL & Headers

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:4000` |
| Production | Configured via `NEXT_PUBLIC_API_URL` environment variable |

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes (mutations) | `application/json` |
| `X-User-Id` | For authenticated endpoints | UUID of the authenticated user |

### 9.2 Health Check

```
GET /health
Response: { "ok": true, "ts": "2026-06-30T..." }
```

### 9.3 Properties API

#### Search Properties
```
GET /api/properties
Query: province, district, landType, minPrice, maxPrice, greenBadge, limit, offset
Auth: none

Response: [
  {
    "id": "uuid",
    "land_type": "residential",
    "deed_type": "titled",
    "province": "ນະຄອນຫຼວງວຽງຈັນ",
    "district": "ໄຊເສດຖາ",
    "village": "ໂພນທັນ",
    "area_sqm": 800.00,
    "owner_set_price": 1500000000,
    "price_currency": "LAK",
    "price_locked": true,
    "green_badge": true,
    "owner_verified": true,
    "lat": 17.9757,
    "lng": 102.6331
  }
]
```

#### Market Statistics
```
GET /api/properties/market-stats
Auth: none

Response: {
  "total_active": 1,
  "verified_records": 1,
  "active_mandates": 1,
  "exclusive_listings": 1,
  "avg_price_vientiane": 1500000000,
  "avg_price_railway": null
}
```

#### Get Property Detail
```
GET /api/properties/:id
Auth: none

Response: { id, title_deed_no, deed_type, land_type, area_sqm,
            province, district, village, address_text,
            owner_set_price, price_currency, price_locked,
            owner_verified, green_badge, status, lat, lng }
```

#### Check Duplicate
```
POST /api/properties/check-duplicate
Auth: broker/admin
Body: { titleDeedNo?, lat, lng, imagePhashes?: number[] }

Response (no duplicate): { duplicate: null }
Response (duplicate found): {
  "error": "ທີ່ດິນນີ້ມີໃນລະບົບແລ້ວ",
  "details": {
    "duplicate": { "propertyId": "uuid", "reason": "deed_no|gps_radius|similar_image" },
    "redirectTo": "/workshop/properties/{id}/request-mandate"
  }
}
```

#### Create Property
```
POST /api/properties
Auth: broker/admin
Body: {
  titleDeedNo?, deedType, landType, lat, lng,
  province, district, village?, addressText?, areaSqm?,
  ownerSetPrice?, priceCurrency?
}

Success (201): { id, status: "pending_owner" }
Conflict (409): { duplicate, redirectTo }
```

#### Submit Inquiry
```
POST /api/properties/:id/inquire
Auth: none
Body: { type: "info"|"viewing", buyerName, buyerPhone, message?, buyerId? }

Response (201): { success: true, dealId, brokerName, type }
Error (404): "ບໍ່ພົບນາຍໜ້າທີ່ຮັບຜິດຊອບ"
```

### 9.4 Owner API

```
POST /api/owners/otp/request         body: { propertyId, purpose }
POST /api/owners/otp/verify          body: { propertyId, code, ownerSetPrice, priceCurrency }
GET  /api/owners/properties          returns: array of owner's properties
GET  /api/owners/mandates            returns: mandates on owner's properties
POST /api/owners/mandates/:id/approve
POST /api/owners/mandates/:id/revoke
```

### 9.5 Mandates API

```
GET  /api/mandates/link/:slug        public — resolve trackable link
GET  /api/mandates                   broker — list own mandates
POST /api/mandates                   broker — request mandate
POST /api/mandates/referrals         broker — register referral
POST /api/mandates/referrals/check   broker — check protection
GET  /api/mandates/brokers           broker — list other brokers
GET  /api/mandates/cobroke           broker — list co-broke agreements
POST /api/mandates/cobroke           broker — propose co-broke
POST /api/mandates/cobroke/:id/accept
GET  /api/mandates/cobroke/:id/buyer broker — get buyer (masked)
```

### 9.6 Pipeline API

```
GET   /api/pipeline/board              broker — Kanban board
GET   /api/pipeline/stats              broker — summary stats
POST  /api/pipeline                    broker — create deal
PATCH /api/pipeline/:id/stage          broker — change stage
POST  /api/pipeline/:id/log-viewing    broker — GPS viewing log
```

### 9.7 Buyers API

```
GET    /api/buyers/profile                 buyer
PUT    /api/buyers/profile                 buyer
GET    /api/buyers/saved                   buyer
POST   /api/buyers/saved                   buyer
DELETE /api/buyers/saved/:propertyId       buyer
GET    /api/buyers/viewings                buyer
POST   /api/buyers/viewings/:id/confirm    buyer
```

### 9.8 Monetization API

```
POST /api/monetization/quotes             public — create locked quote
GET  /api/monetization/quotes/:id         public — get quote status
POST /api/monetization/foreign-wizard     public — run wizard
```

### 9.9 Error Response Format

All errors return consistent JSON:
```json
{
  "error": "Human-readable error message (Lao)",
  "details": { ... }   // optional structured data
}
```

Standard HTTP status codes:
- `400` — Validation error (Zod schema failure)
- `401` — Missing or invalid `X-User-Id`
- `403` — Insufficient role permissions or ownership mismatch
- `404` — Resource not found
- `409` — Duplicate property detected
- `429` — OTP attempt limit exceeded
- `500` — Unhandled server error

---

## 10 Security Design

### 10.1 Authentication

**Current MVP approach:** `X-User-Id` header resolved against the `users` table. This is a **development mechanism only** and must be replaced with a proper JWT-based authentication system for production.

**Intended production approach** (documented in code comments): standard JWT tokens issued on OTP verification, with refresh token rotation.

### 10.2 Authorization

Role-based access control is enforced at two levels:

1. **Backend middleware:** `requireRole(...roles)` in `auth.ts` — applied per router with `router.use(authenticate, requireRole('broker'))`.
2. **Frontend guard:** `RequireRole` component reads `AuthContext.user.role` and redirects on mismatch.

### 10.3 Input Validation

All API inputs are validated using **Zod schemas** at the route/controller level before any business logic executes. Invalid inputs return 400 with structured error details from `z.error.flatten()`.

### 10.4 OTP Security

- 6-digit numeric codes generated cryptographically.
- Stored as SHA-256 hash only — plaintext never persisted.
- 10-minute TTL with strict expiry check.
- 5-attempt brute-force limit with attempt counter in database.
- Each OTP has a `consumed_at` timestamp preventing replay attacks.

### 10.5 HTTP Security Headers

Helmet middleware is applied globally:
```typescript
app.use(helmet());
```
This sets: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`.

### 10.6 CORS

`cors()` middleware is applied globally without origin restriction in the MVP:
```typescript
app.use(cors());
```
> **Production requirement:** Restrict `origin` to the specific frontend domain.

### 10.7 File Upload Security

Multer configuration enforces:
- File type whitelist: `image/*` MIME types only.
- Size limit: 8MB per file.
- File count limit: 10 files per request.
- Storage: memory buffer only (not written to disk during hash computation).

### 10.8 Data Privacy

- Buyer phone numbers stored in `referrals` as SHA-256 hash only (`buyer_phone_hash`).
- Co-broke contact masking (`mask_contacts = true`) hides buyer phone from listing broker by default.
- `buyer_contact_masked` flag in `sales_pipeline` tracks masking state per deal.

### 10.9 Audit Logging

An append-only `audit_log` table records significant platform events:
- `actor_id` — who performed the action.
- `action` — event type (e.g., `owner_activate`).
- `entity` / `entity_id` — affected record.
- `meta` — JSONB payload with event-specific data.

Currently implemented: owner listing activation events. The table is designed to be extended.

### 10.10 Database Immutability

Two tables are protected by PostgreSQL triggers against modification:
- **`referrals`:** `trg_referral_immutable` — DELETE raises exception; UPDATE restricted to `status` field only.
- **`audit_log`:** Designed as append-only (no trigger yet; application-level enforcement).

---

## 11 Internationalisation (i18n)

### 11.1 Supported Locales

| Code | Language | Script |
|------|----------|--------|
| `lo` | Lao | Lao script (ພາສາລາວ) |
| `en` | English | Latin |
| `zh` | Chinese (Simplified) | Han |

### 11.2 Implementation

- **Library:** `next-intl` 3.17.0 with Next.js App Router integration.
- **Route prefix:** All pages nested under `/[locale]/` (e.g., `/lo/`, `/en/`, `/zh/`).
- **Message files:** `frontend/src/i18n/messages/lo.json`, `en.json`, `zh.json`.
- **Locale switcher:** `LocaleSwitcher` component in sidebar renders a dropdown.
- **Middleware:** `frontend/src/middleware.ts` handles locale detection and redirection.

### 11.3 Translation Coverage

Translation keys cover:
- Navigation labels.
- Login screens (all steps).
- Showroom: search, filters, property cards, detail page.
- Workshop: property form, pipeline stages, mandate management.
- Owner portal: approval screens.
- Buyer portal: profile, saved, viewings.
- Foreign Buyer Wizard: results and notes.
- Validation messages and error states.

### 11.4 Backend i18n

The WhatsApp OTP message is generated in all three languages simultaneously in a single message. The Foreign Buyer Wizard accepts a `lang` parameter and returns all result text in the requested language.

---

## 12 System Configuration

### 12.1 Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | HTTP server port |
| `DATABASE_URL` | `postgres://laoland:laoland_dev_pwd@localhost:5432/laoland` | PostgreSQL connection string |
| `JWT_SECRET` | `change_me_in_production` | Secret for future JWT implementation |
| `DEDUP_RADIUS_METERS` | `30` | GPS de-duplication radius |
| `DEDUP_PHASH_MAX_HAMMING` | `10` | pHash similarity threshold |
| `REFERRAL_PROTECT_DAYS` | `90` | First-referral protection duration |
| `WHATSAPP_API_URL` | `https://graph.facebook.com/v20.0` | WhatsApp Cloud API base URL |
| `WHATSAPP_PHONE_ID` | *(empty)* | WhatsApp Cloud API phone ID |
| `WHATSAPP_TOKEN` | *(empty)* | WhatsApp Cloud API bearer token |
| `OTP_TTL_MINUTES` | `10` | OTP expiry duration |
| `OTP_MAX_ATTEMPTS` | `5` | Max OTP verification attempts |
| `QUOTE_TTL_HOURS` | `24` | Currency quote lock duration |

### 12.2 Frontend Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (defaults to `http://localhost:4000`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

### 12.3 Docker Compose (Development)

```yaml
# docker-compose.yml provides:
# - PostgreSQL 16 on port 5432
# - Database: laoland
# - User: laoland / laoland_dev_pwd
```

### 12.4 Database Initialisation

```bash
npm run db:init
# Executes: psql "$DATABASE_URL" -f src/db/schema.sql
#           psql "$DATABASE_URL" -f src/db/seed.sql
```

Seed data creates:
- 4 demo users (1 founding broker, 1 broker, 1 owner, 1 buyer).
- 1 active residential property in Vientiane (Green Badge, owner verified, price locked).
- 1 active exclusive mandate for the founding broker.
- 5 exchange rate records (USD/LAK, THB/LAK, USD/THB and inverses).

### 12.5 Image Storage

Images are stored on the **local filesystem** under `backend/uploads/` and served statically at `/uploads/*`. This is explicitly an MVP approach; a production system would use object storage (e.g., AWS S3, Cloudflare R2, or equivalent).

---

## 13 Deployment Architecture

### 13.1 Railway Deployment

Both services are configured for Railway deployment:

**Backend (`backend/railway.json`):**
- Build: `npm install && npm run build`
- Start: `npm start` (runs compiled `dist/server.js`)
- Environment: Railway PostgreSQL add-on via `DATABASE_URL` environment variable.

**Frontend (`frontend/railway.json`):**
- Build: `npm install && npm run build`
- Start: `npm start` (Next.js production server)
- Environment: `NEXT_PUBLIC_API_URL` pointing to deployed backend.

### 13.2 Development Setup

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env    # configure environment
npm install
npm run db:init         # run schema + seed
npm run dev             # http://localhost:4000

# 3. Frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

### 13.3 Production Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | 20+ LTS |
| PostgreSQL | 16 (standard; PostGIS removed in current version) |
| Memory (backend) | 512MB minimum |
| Memory (frontend) | 512MB minimum |
| Storage | Object storage for images (not local filesystem) |
| SSL | Required for production; managed by Railway or reverse proxy |
| WhatsApp | Meta Business Account + WhatsApp Cloud API access |
| Google Maps | Billing-enabled Google Cloud project with Maps JavaScript API |

### 13.4 Note on PostGIS

The README and early schema comments reference PostGIS for geospatial queries. A later commit (`2868f6a`) replaced PostGIS with **plain lat/lng columns** (`numeric(10,7)`) for Railway compatibility. The GPS proximity search now uses a Haversine bounding-box approximation in raw SQL rather than `ST_DWithin`.

---

## 14 Known Limitations & Technical Debt

### 14.1 Authentication

| Issue | Severity | Description |
|-------|----------|-------------|
| Header-based auth (MVP) | High | `X-User-Id` header is not signed/encrypted. Any client can impersonate any user by sending a known UUID. Must be replaced with signed JWTs before production. |
| No token refresh | High | No session management; frontend stores credentials in `localStorage` indefinitely. |
| Login OTP not wired (frontend) | Medium | The login page UI exists and shows OTP steps, but `AuthContext.login()` does not call the backend OTP API — it maps phone numbers to hardcoded seed UUIDs. |

### 14.2 Image Storage

| Issue | Severity | Description |
|-------|----------|-------------|
| Local filesystem storage | High | Images saved to `backend/uploads/` are lost on container restart or redeploy. Must migrate to object storage (S3/R2) before production. |
| No image CDN | Medium | Images served directly from the Express server; no caching layer. |

### 14.3 Missing Database Table

The `pipeline.service.ts` references a `viewing_logs` table (with `lock_expires_at`, `buyer_confirmed`, `buyer_confirmed_at`) that does **not appear in `schema.sql`**. This indicates the viewing log feature is partially implemented — the service code exists but the database schema may not have been updated. The `db:init` script would fail or silently skip if this table is absent.

> **Recommended action:** Add `viewing_logs` DDL to `schema.sql` or verify the table was added after the schema file was last updated.

### 14.4 Not Yet Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Admin portal | Placeholder only | No admin-specific UI screens implemented |
| Real-time notifications | Not started | WebSocket/SSE for pipeline updates |
| Push notifications | Not started | WhatsApp mandate notifications to brokers |
| Property reporting | Not started | Sales reports, broker performance |
| Property edit / update | Not started | No `PATCH /api/properties/:id` endpoint |
| Property archiving/sold marking | Not started | Status transitions beyond `pending_owner` → `active` |
| Email notifications | Not started | No email service configured |
| Pagination UI | Not started | Backend supports `limit`/`offset`; frontend sends default `limit=100` |
| Mandate expiry | Not started | `expired` status exists in ENUM but no time-based expiry logic |
| SMS OTP channel | Partial | `otp_channel` ENUM includes `sms` but only WhatsApp is implemented |
| Green Badge auto-calculation | Partial | Field exists; trigger to auto-set based on exclusive mandate + owner verification not implemented |
| Market trends page (owner) | Stub | Route exists (`/owner/market`) but content is minimal |

### 14.5 CORS Configuration

`cors()` is applied without origin restrictions. This must be tightened to the specific frontend domain before production deployment.

### 14.6 Error Handling

The global error handler (`errorHandler.ts`) catches all thrown `AppError` instances and unhandled exceptions. However, there is no structured logging system (e.g., Winston, Pino) — errors are currently written to `console.error`. A production system needs structured, queryable logs.

### 14.7 pHash Scalability

The Rule 3 image de-duplication query (`SELECT phash FROM property_images WHERE phash IS NOT NULL`) performs a full table scan and compares every existing pHash in application code. This approach is acceptable for MVP scale (hundreds of properties) but will degrade at thousands of listings. Production should use a VP-tree index or dedicated image similarity service.

---

## 15 Future Enhancements

### 15.1 Short-Term (Pre-Production)

1. **Replace `X-User-Id` with JWT authentication** — issue signed tokens on OTP verification, implement token refresh, and validate signatures on every request.
2. **Wire frontend login to backend OTP** — complete the login flow so the WhatsApp OTP is actually called and verified.
3. **Add `viewing_logs` table to `schema.sql`** — resolve the missing DDL for the viewing log feature.
4. **Migrate image storage to object storage** — integrate AWS S3, Cloudflare R2, or equivalent; update image URLs to CDN paths.
5. **Restrict CORS to production domain.**
6. **Add structured logging** — integrate Pino or Winston with JSON output for Railway log drain.

### 15.2 Medium-Term (Post-Launch)

7. **Admin Portal** — user management, property moderation, mandate oversight, audit log viewer.
8. **Property edit/update API** — allow brokers to update property details (with audit trail).
9. **Real-time pipeline updates** — WebSocket or SSE push for Kanban board changes.
10. **WhatsApp mandate notifications** — notify brokers when owners approve/revoke mandates.
11. **Mandate expiry** — automatic expiry of mandates after a configurable period.
12. **Green Badge auto-trigger** — PostgreSQL trigger to automatically compute and update `green_badge` based on `is_exclusive`, `status`, and `owner_verified`.
13. **Pagination UI** — implement infinite scroll or page navigation in the Showroom.
14. **PDF generation** — mandate agreement documents, currency quote summaries.

### 15.3 Long-Term (Scale)

15. **SMS OTP fallback** — implement the `sms` channel in the OTP service for users without WhatsApp.
16. **Push notification system** — broker mobile app notifications for new inquiries.
17. **Reporting & Analytics** — broker performance dashboards, market trend analysis, commission summaries.
18. **Subscription / Monetization layer** — paid tiers for premium brokers post-free-cohort period.
19. **pHash scaling** — migrate image similarity to a VP-tree index or a dedicated ANN (approximate nearest neighbour) service.
20. **Microservice extraction** — as volume grows, extract `properties`, `pipeline`, and `monetization` into independent services per the planned Modular Monolith → Microservices migration path.
21. **Land Registry API integration** — direct integration with Lao PDR land title verification authorities when APIs become available.
22. **Mobile application** — React Native app sharing business logic with the existing TypeScript codebase.

---

*End of Software Design Report*

*Document prepared from complete source code analysis of the LaoLand Platform MVP (commit: `22db6bd`), 30 June 2026.*
