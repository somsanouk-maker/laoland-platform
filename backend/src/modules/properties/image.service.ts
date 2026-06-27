import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { query } from '../../config/db.js';
import { computeImageHash } from '../../utils/imageHash.js';

// ---------------------------------------------------------------------
// Image pipeline — ຮອງຮັບ De-dup ກົດທີ 3 (ຮູບຄ້າຍກັນ)
//   1) hashOnly      → ຄຳນວນ pHash ຈາກຮູບທີ່ upload (ໃຊ້ກວດຊໍ້າ "ກ່ອນ" ສ້າງ)
//   2) attachImages  → ບັນທຶກໄຟລ໌ລົງ disk + insert phash ໃສ່ property_images
// MVP: ເກັບໄຟລ໌ໃນ local /uploads (Production → S3/MinIO ໂດຍປ່ຽນສະເພາະ storage layer)
// ---------------------------------------------------------------------

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

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
  await ensureDir();
  const saved: any[] = [];

  for (const f of files) {
    const phash = await computeImageHash(f.buffer);
    const ext = path.extname(f.originalname) || '.jpg';
    const fname = `${crypto.randomBytes(8).toString('hex')}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, fname), f.buffer);
    const url = `/uploads/${fname}`;

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
