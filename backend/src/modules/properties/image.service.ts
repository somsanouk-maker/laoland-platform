import crypto from 'node:crypto';
import path from 'node:path';
import { query } from '../../config/db.js';
import { computeImageHash } from '../../utils/imageHash.js';
import { getStorage } from '../../services/storage.js';
import { AppError } from '../../middlewares/errorHandler.js';

// ---------------------------------------------------------------------
// Image pipeline — ຮອງຮັບ De-dup ກົດທີ 3 (ຮູບຄ້າຍກັນ)
//   1) hashOnly      → ຄຳນວນ pHash ຈາກຮູບທີ່ upload (ໃຊ້ກວດຊໍ້າ "ກ່ອນ" ສ້າງ)
//   2) attachImages  → ບັນທຶກຮູບໃຫ້ storage + insert phash ໃສ່ property_images
//   3) deleteImage   → ລຶບຮູບຈາກ storage ແລະ DB
// Storage: local (/uploads) ໃນ dev, R2 ໃນ production (ຄວບຄຸມດ້ວຍ STORAGE_PROVIDER env)
// ---------------------------------------------------------------------

// ຄຳນວນ pHash ຂອງຫຼາຍຮູບ (ບໍ່ບັນທຶກ) — ສົ່ງເປັນ string ເພື່ອໃຊ້ກັບ check-duplicate
export async function hashOnly(files: Express.Multer.File[]): Promise<string[]> {
  const hashes: string[] = [];
  for (const f of files) {
    const h = await computeImageHash(f.buffer);
    hashes.push(h.toString());
  }
  return hashes;
}

// ບັນທຶກຮູບ + phash ໃສ່ property
export async function attachImages(
  propertyId: string,
  files: Express.Multer.File[],
  opts?: { isDrone?: boolean },
) {
  const storage = getStorage();
  const saved: any[] = [];

  for (const f of files) {
    const phash = await computeImageHash(f.buffer);
    const ext = path.extname(f.originalname) || '.jpg';
    const key = `properties/${propertyId}/${crypto.randomBytes(8).toString('hex')}${ext}`;
    const url = await storage.save(key, f.buffer, f.mimetype);

    const rows = await query(
      `INSERT INTO property_images (property_id, url, phash, is_drone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, phash, is_drone`,
      [propertyId, url, phash.toString(), opts?.isDrone ?? false],
    );
    saved.push(rows[0]);
  }
  return saved;
}

// ລຶບຮູບ — ກວດວ່າຮູບເປັນຂອງ property ນີ້ ແລ້ວລຶບອອກຈາກ storage + DB
export async function deleteImage(imageId: string, propertyId: string): Promise<void> {
  const rows = await query<{ id: string; url: string }>(
    `DELETE FROM property_images
      WHERE id = $1 AND property_id = $2
     RETURNING id, url`,
    [imageId, propertyId],
  );
  if (!rows.length) throw new AppError(404, 'ບໍ່ພົບຮູບ ຫຼື ບໍ່ມີສິດລຶບ');

  // Derive storage key from the URL
  const url = rows[0].url;
  const key = url.startsWith('/uploads/')
    ? url.slice('/uploads/'.length)        // local: /uploads/properties/...
    : url.split('/').slice(3).join('/');   // R2: https://domain/properties/...

  await getStorage().delete(key);
}
