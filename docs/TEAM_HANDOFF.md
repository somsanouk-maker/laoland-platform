# LaoLand Platform — Team Handoff & Work Assignment

> **Audience:** Frontend, Backend, and Mobile developers joining the project.
> **Purpose:** Explain what exists today, what's left to build, and who owns what.
> **Language:** Written in English for the whole team. Product/UI copy in the app is Lao/EN/中文.
> **Last updated:** 2026-07-20 · maintained by the project owner (Somsanouk).

---

## 0. How to read this document

1. **§1–3** — get oriented (what's built, repo map, how to run).
2. **§4** — the shared backlog / tech-debt register. Every task below is pulled from real code.
3. **§5** — your assignment. Find your role, read your section.
4. **§6** — how we work together (API contract, git, branching).
5. **§7** — decisions that need the owner's input before some work can start.

---

## 1. Current State (what already works)

The MVP is **feature-complete for web** and running locally. All 4 user roles are built and verified end-to-end.

| Layer | Status | Notes |
|-------|--------|-------|
| **Backend API** | ✅ Working | Node + Express + TypeScript, ~50 REST endpoints, 8 modules |
| **Database** | ✅ Working | PostgreSQL 16 + PostGIS, schema + seed in `backend/src/db/` |
| **Auth** | ✅ Working | WhatsApp-OTP → JWT (7-day). Role-based route guards |
| **Web frontend** | ✅ Working | Next.js 14 App Router, 20 pages, i18n (lo/en/zh) |
| **Mobile app** | ❌ Not started | Greenfield — see §5.3 |
| **Automated tests** | ❌ None | No unit/integration/e2e tests exist yet |
| **CI/CD & deploy** | ❌ None | No pipeline, no app Dockerfile, no hosting config |

**Roles & their main screens:**
- **Public** — Showroom (`/`), Foreign-Investor Wizard (`/wizard`), Property Detail (`/properties/[id]`)
- **Broker** — Workshop dashboard, Pipeline (Kanban), Mandates, Co-broking
- **Owner** — Properties, Mandate approvals, Market trends
- **Buyer** — Profile/Auto-Match, Saved properties, Viewings
- **Admin** — Users, Properties, Mandates, Audit Log

**Core business logic implemented (backend):** property de-duplication (deed no / GPS ≤30 m / image pHash), owner gatekeeping + single-price lock, mandate management, first-referral 90-day protection, co-broking with buyer-contact masking, sales pipeline, currency-locked quotes, foreign-buyer eligibility wizard.

---

## 2. Repository Map — who owns what

```
laoland-platform/
├── backend/          ← BACKEND DEV owns this
│   └── src/
│       ├── modules/  (admin, auth, buyers, mandates, monetization,
│       │              owners, pipeline, properties)
│       ├── services/ (whatsapp.ts ⚠stub, storage.ts local/R2)
│       ├── config/   (env.ts, db.ts)
│       └── db/        schema.sql · seed.sql · migrations/
├── frontend/         ← FRONTEND DEV owns this
│   └── src/
│       ├── app/[locale]/   (20 pages, per role)
│       ├── components/      (Sidebar, LocaleSwitcher, …)
│       ├── contexts/        (AuthContext, CurrencyContext ⚠hardcoded FX)
│       ├── i18n/            (lo.json / en.json / zh.json)
│       └── lib/api.ts        API client
├── mobile/           ← MOBILE DEV creates this (does not exist yet)
├── docs/             ← Design report (.md/.pdf), this handoff
├── docker-compose.yml  PostgreSQL + PostGIS (dev DB)
└── README.md          Setup + seed logins (§ Quick Start)
```

The three codebases are **loosely coupled through the REST API**. Frontend and Mobile are independent clients of the same Backend. This is deliberate — the three devs can work in parallel with minimal collisions.

---

## 3. Running the project (all devs)

Full steps are in [README.md](../README.md) §4–5. Short version:

```bash
docker start laoland_db      # or: docker compose up -d   (MUST be first)
cd backend  && cp .env.example .env && npm install && npm run db:init && npm run dev   # :4000
cd frontend && cp .env.example .env && npm install && npm run dev                       # :3000
```

**Test logins** (any role, OTP `123456` when `DEV_OTP=123456` is set in `backend/.env`):

| Role | Phone (enter last 10 digits) |
|------|------------------------------|
| Admin | `2055500000` |
| Broker | `2055500001` |
| Owner | `2055500003` |
| Buyer | `2055500004` |

---

## 4. Backlog / Tech-Debt Register (source of truth for tasks)

Every item below is a **real gap found in the current code**. Priorities: 🔴 blocker for production · 🟠 important · 🟡 nice-to-have.

| # | Area | Gap (where) | Prio | Owner |
|---|------|-------------|------|-------|
| B1 | WhatsApp OTP | `services/whatsapp.ts` logs to console (stub). No real send. | 🔴 | Backend |
| B2 | Auth secrets | `JWT_SECRET` defaults to dev value; `DEV_OTP` bypass must be OFF in prod (`config/env.ts`) | 🔴 | Backend |
| B3 | Image storage | Defaults to `local` disk; R2 client exists but unconfigured (`services/storage.ts`) | 🟠 | Backend |
| B4 | FX rates | Exchange rates **hardcoded** in `contexts/CurrencyContext.tsx` — source = **BOL daily rates** (see D4) | 🟠 | Backend (API) + Frontend (consume) |
| B5 | Owner doc vault | Uploads are **mock**, not persisted per property (`owner/page.tsx` L65) | 🟠 | Backend + Frontend |
| B6 | Tests | Zero automated tests across the repo | 🟠 | All |
| B7 | CI/CD & deploy | No pipeline, no app Dockerfile — target = **DigitalOcean** (see D2) | 🔴 | Backend (lead) + All |
| B8 | API contract doc | ✅ **Drafted** — [`docs/openapi.yaml`](./openapi.yaml) (OpenAPI 3.0.3, all ~54 endpoints). Backend to keep it in sync + serve Swagger UI | 🟠 | Backend |
| B9 | Mobile app | Does not exist | 🟠 | Mobile |
| B10 | Observability | No structured logging/error tracking (Sentry etc.) | 🟡 | Backend |
| B11 | Accessibility & responsive | Web not audited for a11y / small screens | 🟡 | Frontend |

---

## 5. Role Assignments

### 5.1 Backend Developer — owns `backend/`

**Mission:** make the API production-ready, integrations real, and unblock the Mobile dev with a stable contract.

**Sprint 1 (highest impact first):**
1. **B8 — Own the API contract.** A first-draft OpenAPI spec already exists at [`docs/openapi.yaml`](./openapi.yaml) (3.0.3, ~54 endpoints, generated from the current routes). Your job: **serve Swagger UI** (e.g. `swagger-ui-express` at `/api/docs`), keep the spec **in sync** as endpoints change, and fill in any response bodies marked `additionalProperties: true`. *This is what unblocks Mobile.*
2. **B1 — Wire real WhatsApp Cloud API** in `services/whatsapp.ts` (credentials already scaffolded in `env.ts`/`.env.example`). Keep the stub as automatic fallback when no token is set. *The owner provisions the WhatsApp Business account and hands you the phone ID + token (D3).*
3. **B2 — Production auth hardening.** Enforce a real `JWT_SECRET`, fail-fast if it's the default in `NODE_ENV=production`, and make sure `DEV_OTP` cannot be active in prod.

**Sprint 2:**
4. **B3 — Turn on R2 storage** for images (set `STORAGE_PROVIDER=r2` + creds); verify upload/delete round-trip.
5. **B5 — Real owner document vault** — persist uploaded docs per property via the storage service; expose secure fetch.
6. **B4 — FX rate endpoint** — replace hardcoded rates with a small `/fx/rates` endpoint sourced from the **Bank of the Lao PDR (BOL)** daily reference rates (`bol.gov.la`). BOL has no clean public API, so fetch + parse the published daily-rate page on a **daily schedule** and cache. Handle weekends/holidays by serving the **last known** rate (with an "as of" date). Cover LAK↔USD and LAK↔THB.
7. **B6 — Test foundation** — add integration tests for the critical flows: OTP→JWT login, de-duplication, mandate approval, referral lock.

**Ongoing:** B7 — **deploy to DigitalOcean (D2)**: containerize backend + web, provision a Managed PostgreSQL (must support **PostGIS**), set up staging + production, and a GitHub Actions pipeline. B10 (logging/error tracking).

---

### 5.2 Frontend Developer — owns `frontend/`

**Mission:** polish the web experience, close UI gaps behind the backend integrations, and own web quality (a11y, responsive, i18n completeness).

**Sprint 1:**
1. **Document-vault UI (pairs with B5)** — replace the mock upload in `owner/page.tsx` with real upload/list/delete against the backend once endpoints land. Coordinate with Backend.
2. **FX display (pairs with B4)** — consume the new rates endpoint in `CurrencyContext.tsx`; remove hardcoded numbers; show "rates as of …".
3. **i18n audit** — sweep all 20 pages for any hardcoded strings; ensure lo/en/zh parity in `i18n/*.json`.

**Sprint 2:**
4. **B11 — Responsive & accessibility pass** — verify every page on mobile-web widths and dark mode; fix keyboard/focus/contrast issues (the app is used on phones heavily in Laos).
5. **Empty/error/loading states** — make sure every data view has clean loading and failure UI (several currently assume the happy path).
6. **B6 — Component/e2e tests** — start with the login flow and Showroom search.

**Coordination:** you and Mobile share the same API. Align on shared UX patterns (status labels, currency formatting, masking rules) so web and mobile feel consistent.

---

### 5.3 Mobile Developer — creates `mobile/` (greenfield)

**Mission:** build the customer-facing mobile app on top of the existing REST API. Start with the two roles that benefit most from mobile: **Buyer** and **Owner**.

**Your contract is [`docs/openapi.yaml`](./openapi.yaml)** — you can generate a typed API client from it (e.g. `openapi-typescript` / `orval`) and start immediately, in parallel with Backend serving live Swagger UI.

**Framework: React Native + Expo (decided — D1).** The team already knows React/TypeScript, so types and API-client logic can be shared with the web frontend.

**Sprint 0 (setup & scaffolding):**
1. Scaffold the Expo app under `mobile/`, set up TypeScript, navigation, and the API base URL (point at `api.asangha.la` in prod, `localhost:4000` in dev).
2. Implement the **OTP → JWT login** flow (mirror `frontend/src/lib/api.ts` + `AuthContext`); store the JWT securely (Expo SecureStore).

**Sprint 1 (Buyer flows):**
3. Showroom: browse/search properties, property detail (respect masking rules — never show hidden owner/broker contact).
4. Buyer profile + Auto-Match list; Saved properties; request a viewing.

**Sprint 2 (Owner flows):**
5. Owner login, view own properties, approve/revoke mandate, single-price display.
6. Push notifications for OTP / mandate events (coordinate with Backend on WhatsApp vs. native push).

**Guardrails:** the mobile app is a **pure API client** — no business logic duplicated. All rules (de-dup, referral lock, masking) stay in the backend.

---

## 6. How we work together

- **API is the contract.** Backend publishes it (B8); Frontend and Mobile consume it. Any breaking change → announce + version.
- **Branching:** feature branches off `main` (e.g. `be/whatsapp-integration`, `fe/doc-vault`, `mobile/auth`). Open a PR into `main`; no direct pushes to `main`.
- **Reviews:** at least one teammate reviews each PR. Backend changes that alter the API contract require a heads-up to Frontend + Mobile.
- **Secrets:** never commit real `.env`. Only `.env.example` is tracked. `DEV_OTP` is dev-only.
- **Commits:** set your own git identity (`git config user.name/user.email`) so history is attributable.
- **Definition of Done:** builds green · typecheck passes (`npm run typecheck`) · feature verified against the running app · no secrets committed · PR reviewed.

---

## 7. Resolved Decisions (owner-confirmed, 2026-07-20)

| # | Decision | Impact |
|---|----------|--------|
| **D1** | **Mobile = React Native + Expo** — team knows React/TS; share types/logic with web | Unblocks §5.3 |
| **D2** | **Hosting = DigitalOcean (cloud)** — containers for backend + web, **Managed PostgreSQL with PostGIS**, staging + prod | Shapes B7 |
| **D3** | **WhatsApp Business account = owner-provisioned** — owner creates it and hands Backend the phone ID + token | Unblocks B1 |
| **D4** | **FX source = Bank of the Lao PDR (BOL)** daily reference rates (`bol.gov.la`), fetched/parsed daily and cached | Shapes B4 |
| **D5** | **Domain = `asangha.la`** (pending registration) — see table below | CORS, R2 public domain, deep-links |

**D5 — Domain scheme = `asangha.la`** (Lao `.la` ccTLD; owner to register `asangha.la` and point DNS at DigitalOcean):

| Purpose | Production | Staging |
|---------|-----------|---------|
| Web app | `asangha.la` (+ `www.asangha.la`) | `staging.asangha.la` |
| Backend API | `api.asangha.la` | `api.staging.asangha.la` |
| Property images (R2 CDN) | `images.asangha.la` | — |
| Mobile deep-link scheme | `asangha://` (+ universal link on `asangha.la`) | — |

> Action for owner: **register the domain** and point DNS at DigitalOcean. Backend sets `ALLOWED_ORIGINS` and `R2_PUBLIC_DOMAIN` from this scheme once confirmed.

---

## 8. Quick contact / escalation

- Product & business rules questions → **project owner (Somsanouk)**.
- Anything ambiguous in a business rule → **ask, don't guess.** These rules (referral lock, masking, single-price) are core to the product's value.

---

*This manual reflects the codebase as of commit on `main`, 2026-07-20. Keep it updated as items in §4 are completed.*
