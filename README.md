# LaoLand Platform — ແພລັດຟອມນາຍໜ້າຊື້-ຂາຍທີ່ດິນ ແລະ ອະສັງຫາລິມະສັບ

> MVP Prototype — ອີງຕາມເອກະສານຍຸດທະສາດ *Executive Summary Lao_Real_Estate_Platform_Lao*

ແພລັດຟອມແບ່ງເປັນ 2 ສ່ວນຫຼັກຕາມຍຸດທະສາດ:

| ສ່ວນ | ຜູ້ໃຊ້ | ຮູບແບບ | ໂຟນເດີ |
|------|--------|--------|--------|
| **Showroom** (Public Portal) | Buyer / Owner | ຟຣີ — ເນັ້ນສະແດງຜົນ + ຄົ້ນຫາ + ແຜນທີ່ | `frontend/src/app/(showroom)` |
| **Workshop** (Backend Dashboard) | Broker | CRM/Pipeline — ຟຣີ 3 ປີທຳອິດ | `frontend/src/app/(workshop)` |

---

## 1. Stack ເຕັກໂນໂລຢີ (Technology Decisions)

| ຊັ້ນ | ເລືອກໃຊ້ | ເຫດຜົນ |
|------|----------|--------|
| Frontend | **Next.js 14 (App Router)** + Tailwind CSS + `next-intl` | SSR ດີຕໍ່ SEO ຂອງ Showroom, i18n ລາວ/ອັງກິດ/ຈີນ |
| Backend | **Node.js + Express + TypeScript** | Type-safe, ໃຊ້ team ດຽວກັນກັບ frontend |
| Database | **PostgreSQL 16 + PostGIS** | ຕ້ອງການ `ST_DWithin` ສຳລັບ De-dup ລັດສະໝີ 30m + ໝຸດ/ຂອບເຂດທີ່ດິນ |
| DB Access | `pg` (node-postgres) raw SQL | ຄວບຄຸມ geospatial query ໄດ້ເຕັມທີ່ (Prisma ຍັງຮອງຮັບ PostGIS ບໍ່ດີ) |
| Notify | WhatsApp Cloud API (adapter ມີ stub) | ຊ່ອງທາງຫຼັກຕາມຍຸດທະສາດ |

### ເຫດຜົນສະຖາປັດຕະຍະກຳ: Modular Monolith
ໃນໄລຍະ MVP ໃຊ້ **Modular Monolith** (ແຍກເປັນ module ຕາມ domain) ແທນ microservices ເພື່ອ:
- ພັດທະນາໄວ, deploy ງ່າຍ, ຄ່າໃຊ້ຈ່າຍຕ່ຳ (ສຳຄັນຍ້ອນ Workshop ຟຣີ 3 ປີ).
- ແຕ່ລະ module (`properties`, `mandates`, `pipeline`, `monetization`) ມີ service/controller/routes ແຍກກັນ → ຖ້າຂະຫຍາຍຕົວແລ້ວ ສາມາດແຍກອອກເປັນ service ໄດ້ທັນທີ.

---

## 2. ໂຄງສ້າງ File Project

```
laoland-platform/
├── docker-compose.yml            # PostgreSQL + PostGIS ສຳລັບ dev
├── backend/
│   ├── src/
│   │   ├── server.ts             # entrypoint
│   │   ├── app.ts                # Express app + mount routes
│   │   ├── config/
│   │   │   ├── env.ts            # ໂຫຼດ ENV (typed)
│   │   │   └── db.ts             # PostgreSQL connection pool
│   │   ├── db/
│   │   │   ├── schema.sql        # ★ DDL ທັງໝົດ (PostGIS, triggers)
│   │   │   └── seed.sql          # ຂໍ້ມູນຕົວຢ່າງ
│   │   ├── middlewares/          # auth, errorHandler
│   │   ├── utils/                # currency, imageHash, otp
│   │   └── modules/
│   │       ├── properties/       # ★ De-duplication Algorithm
│   │       ├── owners/           # ★ WhatsApp OTP + Single-Price
│   │       ├── mandates/         # ★ First-Referral 90d + Co-broke Masking
│   │       ├── pipeline/         # Sales pipeline (CRM)
│   │       └── monetization/     # ★ Currency-Lock + Foreign Buyer Wizard
│   └── package.json
└── frontend/
    ├── src/
    │   ├── i18n/                 # lo.json / en.json / zh.json
    │   └── app/
    │       ├── (showroom)/       # Public Portal
    │       └── (workshop)/       # Broker Dashboard
    └── package.json
```

---

## 3. Core Backend Logics (ສະຫຼຸບ)

| Logic | ໄຟລ໌ | ກົດເກນທຸລະກິດ |
|-------|------|----------------|
| **De-duplication** | `modules/properties/property.service.ts` | (1) ເລກໃບຕາດິນກົງ OR (2) GPS ≤ 30m OR (3) phash ຮູບຄ້າຍ → redirect Request Mandate |
| **Image pipeline (pHash)** | `modules/properties/image.service.ts` + `utils/imageHash.ts` | sharp → average-hash 64-bit; `POST /images/hash` (ກວດກ່ອນສ້າງ), `POST /:id/images` (ບັນທຶກ) |
| **Owner Gatekeeping + Single-Price** | `modules/owners/otp.service.ts` | OTP → WhatsApp, ຢືນຢັນ → activate + lock ລາຄາກາງ |
| **First-Referral Protection** | `modules/mandates/referral.service.ts` | Immutable log, ລັອກ 90 ມື້ |
| **Co-broke Masking** | `modules/mandates/cobroke.service.ts` | ແບ່ງຄ່ານາຍໜ້າ ແຕ່ປິດບັງ Buyer Contact |
| **Currency-Locked Quotes** | `modules/monetization/currency.service.ts` | lock ລາຄາ + ໝົດອາຍຸ |
| **Foreign Buyer Wizard** | `modules/monetization/foreignWizard.service.ts` | ກວດເງື່ອນໄຂກົດໝາຍຕ່າງປະເທດ |

---

## 4. ການ Run (Quick Start)

```bash
# 1. ຖານຂໍ້ມູນ
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run db:init      # ໂຫຼດ schema.sql + seed.sql
npm run dev          # http://localhost:4000

# 3. Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:3000
```

> **⚠️ ລຳດັບການ Start ສຳຄັນ:** ຕ້ອງ start ຖານຂໍ້ມູນ (Docker) **ກ່ອນ** backend ສະເໝີ.
> ຖ້າ backend ຂຶ້ນກ່ອນ DB ຈະເຫັນ error `Failed to fetch` ຢູ່ໜ້າເວັບ.
> ຖ້າ container ຢຸດຢູ່ແລ້ວ: `docker start laoland_db` (ຫຼື `docker compose up -d`).

---

## 5. Team Onboarding — ການທົດສອບ ແລະ Login

### 5.1 Dev OTP Bypass (ທົດສອບ Login ໄວ)
ໃນໄລຍະ dev, WhatsApp OTP ຈິງບໍ່ໄດ້ສົ່ງ. ໃຫ້ຕັ້ງ `DEV_OTP` ໃນ `backend/.env`:

```bash
# backend/.env
DEV_OTP=123456
```

ຈາກນັ້ນ **ທຸກ user** ສາມາດ login ດ້ວຍ code `123456` (ຂ້າມການສົ່ງ WhatsApp).

> **🔒 Production Warning:** `DEV_OTP` ຕ້ອງ **ຖອດອອກ/ບໍ່ຕັ້ງຄ່າ** ໃນ production —
> ຖ້າຍັງຕັ້ງໄວ້ ທຸກ account ຈະເຂົ້າໄດ້ດ້ວຍ code ດຽວ. (ຄ່ານີ້ຢູ່ໃນ `.env` local ເທົ່ານັ້ນ, ບໍ່ push ຂຶ້ນ git.)

### 5.2 Seed Users (ຈາກ `seed.sql`)
ໃຊ້ເບີລຸ່ມນີ້ + OTP `123456` ເພື່ອທົດສອບແຕ່ລະ role:

| Role | ເບີ WhatsApp | ໜ້າຫຼັກ | ໃຊ້ທົດສອບ |
|------|--------------|---------|-----------|
| **Admin** | `+8562055500000` | `/lo/admin/users` | ຈັດການ users, properties, mandates, audit log |
| **Broker** | `+8562055500001` | `/lo/workshop` | Dashboard, Pipeline, Mandates, Co-broking |
| **Owner** | `+8562055500003` | `/lo/owner` | ທີ່ດິນ, ອະນຸມັດ Mandate, ຕະຫຼາດ |
| **Buyer** | `+8562055500004` | `/lo/buyer` | Profile, Auto-Match, ທີ່ດິນທີ່ບັນທຶກ |

> ຢູ່ໜ້າ Login ໃສ່ສະເພາະ **10 ຫຼັກຫຼັງ** `+856` (ເຊັ່ນ `2055500000`).

### 5.3 ພາສາ (i18n)
ສະຫຼັບ ລາວ / EN / 中文 ໄດ້ຈາກປຸ່ມມຸມລຸ່ມຊ້າຍ. URL ຈະປ່ຽນ prefix (`/lo`, `/en`, `/zh`).
