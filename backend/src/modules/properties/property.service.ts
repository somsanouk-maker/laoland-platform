import { query, withTransaction } from '../../config/db.js';
import { env } from '../../config/env.js';
import { hammingDistance } from '../../utils/imageHash.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// De-duplication Algorithm — ກວດກ່ອນບັນທຶກທີ່ດິນໃໝ່
// ກົດກວດ 3 ຂໍ້ (ຕາມເອກະສານ): ຖ້າຊໍ້າ → redirect ໄປ Request Mandate
//   (1) ເລກໃບຕາດິນກົງກັນ
//   (2) ພິກັດ GPS ຢູ່ໃນລັດສະໝີ 30 ແມັດ
//   (3) ຮູບພາບຄ້າຍຄືກັນ (pHash Hamming ≤ threshold)
// ---------------------------------------------------------------------

export interface DedupInput {
  titleDeedNo?: string | null;
  lat: number;
  lng: number;
  imagePhashes?: bigint[]; // pHash ຂອງຮູບທີ່ກຳລັງຈະ upload
}

export interface DedupMatch {
  propertyId: string;
  reason: 'deed_no' | 'gps_radius' | 'similar_image';
  distanceMeters?: number;
  hamming?: number;
}

export async function findDuplicate(input: DedupInput): Promise<DedupMatch | null> {
  // --- ກົດ 1: ເລກໃບຕາດິນກົງກັນ ---
  if (input.titleDeedNo) {
    const rows = await query<{ id: string }>(
      'SELECT id FROM properties WHERE title_deed_no = $1 LIMIT 1',
      [input.titleDeedNo],
    );
    if (rows.length) return { propertyId: rows[0].id, reason: 'deed_no' };
  }

  // --- ກົດ 2: GPS ຢູ່ໃນລັດສະໝີ 30m (Haversine approximate via bounding box) ---
  const radiusDeg = (env.dedup.radiusMeters / 111320); // ~1 degree lat = 111320m
  const geoRows = await query<{ id: string; dist: number }>(
    `SELECT id,
            sqrt(power((lat - $2) * 111320, 2) + power((lng - $1) * 111320 * cos(radians($2)), 2)) AS dist
       FROM properties
      WHERE lat BETWEEN $2 - $3 AND $2 + $3
        AND lng BETWEEN $1 - $3 AND $1 + $3
      ORDER BY dist ASC
      LIMIT 1`,
    [input.lng, input.lat, radiusDeg],
  );
  if (geoRows.length && geoRows[0].dist <= env.dedup.radiusMeters) {
    return { propertyId: geoRows[0].id, reason: 'gps_radius', distanceMeters: Math.round(geoRows[0].dist) };
  }

  // --- ກົດ 3: ຮູບພາບຄ້າຍຄືກັນ (ປຽບທຽບ pHash Hamming distance) ---
  if (input.imagePhashes?.length) {
    // ດຶງ phash ທັງໝົດ (MVP: ກັ່ນຕອງລ່ວງໜ້າດ້ວຍ bounding box ໃນ production)
    const existing = await query<{ property_id: string; phash: string }>(
      'SELECT property_id, phash FROM property_images WHERE phash IS NOT NULL',
    );
    for (const cand of input.imagePhashes) {
      for (const e of existing) {
        const h = hammingDistance(cand, BigInt(e.phash));
        if (h <= env.dedup.phashMaxHamming) {
          return { propertyId: e.property_id, reason: 'similar_image', hamming: h };
        }
      }
    }
  }

  return null; // ບໍ່ຊໍ້າ → ສ້າງໃໝ່ໄດ້
}

// ---------------------------------------------------------------------
// ສ້າງທີ່ດິນໃໝ່ — ເອີ້ນ findDuplicate ກ່ອນ
// ຖ້າຊໍ້າ → throw 409 ພ້ອມ redirectTo ໄປ Request Mandate ຂອງຕອນດິນເກົ່າ
// ---------------------------------------------------------------------
export interface CreatePropertyInput extends DedupInput {
  deedType: string;
  landType: string;
  province: string;
  district: string;
  village?: string;
  addressText?: string;
  areaSqm?: number;
  ownerSetPrice?: number;
  priceCurrency?: string;
  createdBy: string; // broker id
}

export async function createProperty(input: CreatePropertyInput) {
  const dup = await findDuplicate(input);
  if (dup) {
    // ★ ບໍ່ສ້າງຊໍ້າ — ສົ່ງສັນຍານໃຫ້ frontend redirect ໄປຂໍ Mandate ແທນ
    throw new AppError(409, 'ທີ່ດິນນີ້ມີໃນລະບົບແລ້ວ', {
      duplicate: dup,
      redirectTo: `/workshop/properties/${dup.propertyId}/request-mandate`,
    });
  }

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO properties
         (title_deed_no, deed_type, land_type, lat, lng, area_sqm,
          province, district, village, address_text,
          owner_set_price, price_currency, created_by, status)
       VALUES
         ($1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, 'pending_owner')
       RETURNING id, status`,
      [
        input.titleDeedNo ?? null,
        input.deedType,
        input.landType,
        input.lng,
        input.lat,
        input.areaSqm ?? null,
        input.province,
        input.district,
        input.village ?? null,
        input.addressText ?? null,
        input.ownerSetPrice ?? null,
        input.priceCurrency ?? 'LAK',
        input.createdBy,
      ],
    );
    return rows[0];
  });
}

// ຄົ້ນຫາທີ່ດິນ (Showroom public) — ສະແດງສະເພາະ active, ຈັດ Green Badge ຂຶ້ນກ່ອນ
// ★ ກັ່ນຕອງ Dead Listings ໂດຍສະແດງສະເພາະ status='active'
export async function searchProperties(filters: {
  province?: string;
  district?: string;
  landType?: string;
  maxPrice?: number;
  minPrice?: number;
  greenBadge?: boolean;
  limit?: number;
  offset?: number;
}) {
  const where: string[] = [`status = 'active'`];
  const params: any[] = [];
  let i = 1;
  if (filters.province) { where.push(`province ILIKE $${i++}`); params.push(`%${filters.province}%`); }
  if (filters.district) { where.push(`district ILIKE $${i++}`); params.push(`%${filters.district}%`); }
  if (filters.landType) { where.push(`land_type = $${i++}`); params.push(filters.landType); }
  if (filters.minPrice) { where.push(`owner_set_price >= $${i++}`); params.push(filters.minPrice); }
  if (filters.maxPrice) { where.push(`owner_set_price <= $${i++}`); params.push(filters.maxPrice); }
  if (filters.greenBadge) { where.push(`green_badge = true`); }

  params.push(filters.limit ?? 100, filters.offset ?? 0);
  return query(
    `SELECT id, land_type, deed_type, province, district, village, area_sqm,
            owner_set_price, price_currency, price_locked, green_badge, owner_verified,
            lat, lng
       FROM properties
      WHERE ${where.join(' AND ')}
      ORDER BY green_badge DESC, created_at DESC
      LIMIT $${i++} OFFSET $${i}`,
    params,
  );
}

// ✦ Market Stats — for the public dashboard
export async function getMarketStats() {
  const rows = await query<any>(`
    SELECT
      (SELECT count(*) FROM properties WHERE status = 'active') AS total_active,
      (SELECT count(*) FROM properties WHERE owner_verified = true) AS verified_records,
      (SELECT count(*) FROM mandates WHERE status = 'active') AS active_mandates,
      (SELECT count(*) FROM properties WHERE green_badge = true) AS exclusive_listings,
      (SELECT round(avg(owner_set_price))
         FROM properties WHERE status = 'active'
           AND province ILIKE '%ວຽງຈັນ%' AND owner_set_price > 0) AS avg_price_vientiane,
      (SELECT round(avg(owner_set_price))
         FROM properties WHERE status = 'active'
           AND (province ILIKE '%ຫຼວງພະ%' OR province ILIKE '%ວັງວຽງ%')
           AND owner_set_price > 0) AS avg_price_railway
  `);
  return rows[0];
}

// ດຶງລາຍລະອຽດທີ່ດິນ (Showroom) — ສົ່ງ lat/lng ກັບໄປໃຫ້ frontend ສະແດງແຜນທີ່
export async function getProperty(id: string) {
  const rows = await query(
    `SELECT id, title_deed_no, deed_type, land_type, area_sqm,
            province, district, village, address_text,
            owner_set_price, price_currency, price_locked,
            owner_verified, green_badge, status,
            lat, lng
       FROM properties WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
