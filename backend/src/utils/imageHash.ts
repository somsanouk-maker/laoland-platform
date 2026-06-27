import sharp from 'sharp';

// ============================================================
// Perceptual hash (pHash) helpers — ໃຊ້ De-dup ກົດທີ 3 (ຮູບຄ້າຍກັນ)
// ການຄຳນວນ hash ຈາກຮູບຈິງ ເຮັດຢູ່ pipeline upload (sharp)
//   ແລ້ວເກັບເປັນ bigint(64-bit) ໃນ property_images.phash.
// MVP: ໃຊ້ Average-Hash (aHash) — ໄວ ແລະ ທົນຕໍ່ resize/compress
//   (Production ສາມາດອັບເກຣດເປັນ DCT-based pHash ໄດ້ ໂດຍບໍ່ກະທົບ API)
// ============================================================

// ★ ຄຳນວນ 64-bit average-hash ຈາກ buffer ຮູບ
//   ຂັ້ນຕອນ: → grayscale → resize 8x8 → ຫາຄ່າສະເລ່ຍ → bit = pixel > avg
export async function computeImageHash(buffer: Buffer): Promise<bigint> {
  const pixels = await sharp(buffer)
    .grayscale()
    .resize(8, 8, { fit: 'fill' }) // 64 pixel ພໍດີ 64 bit
    .raw()
    .toBuffer();

  let sum = 0;
  for (const p of pixels) sum += p;
  const avg = sum / pixels.length;

  let hash = 0n;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > avg) hash |= 1n << BigInt(i);
  }
  return hash;
}

// ນັບ bit ທີ່ຕ່າງກັນ (Hamming distance) ລະຫວ່າງ 2 ຄ່າ 64-bit
// ຄ່າຍິ່ງໜ້ອຍ = ຮູບຍິ່ງຄ້າຍກັນ (0 = ຄືກັນແທ້)
export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b; // XOR: bit ທີ່ຕ່າງ = 1
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

// ກວດວ່າ 2 ຮູບຄ້າຍກັນບໍ່ ພາຍໃຕ້ threshold (default 10)
export function isSimilarImage(a: bigint, b: bigint, maxHamming: number): boolean {
  return hammingDistance(a, b) <= maxHamming;
}
