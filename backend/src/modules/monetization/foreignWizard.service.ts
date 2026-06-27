// ---------------------------------------------------------------------
// Foreign Buyer Land Wizard
// ກວດເງື່ອນໄຂທາງກົດໝາຍຂອງນັກລົງທຶນຕ່າງປະເທດ ໃນການເຊົ່າ/ນຳໃຊ້ທີ່ດິນລາວ
// ຫຼັກກົດໝາຍ (ສະຫຼຸບ): ຄົນຕ່າງປະເທດ "ບໍ່ສາມາດຖືກຳມະສິດທີ່ດິນ" ໄດ້
//   ແຕ່ສາມາດ:
//   - ເຊົ່າ/ສຳປະທານ (Lease/Concession) ໄລຍະຍາວ
//   - ຊື້ຫ້ອງ condominium (ກຳມະສິດອາຄານຊຸດ) ພາຍໃຕ້ສັດສ່ວນທີ່ກຳນົດ
// ໝາຍເຫດ: ກົດເກນຄ່າ/ປີ ເປັນ config — ໃຫ້ທີ່ປຶກສາກົດໝາຍກວດສອບກ່ອນ production
// ---------------------------------------------------------------------

export type Lang = 'lo' | 'en' | 'zh';

export interface WizardInput {
  buyerNationality: 'lao' | 'foreign';
  // ນັກລົງທຶນ (ມີນິຕິບຸກຄົນ/ບໍລິສັດທີ່ຈົດທະບຽນໃນລາວບໍ່)
  hasLaoRegisteredEntity?: boolean;
  intent?: 'buy_land' | 'lease_land' | 'buy_condo';
  leaseYears?: number;
  lang?: Lang;
}

export interface WizardResult {
  eligible: boolean;
  recommendedStructure: string;
  notes: string[];
  fallback?: string; // ທາງເລືອກສຳຮອງ (ເຊັ່ນ condominium)
}

// ໄລຍະເຊົ່າສູງສຸດ (ປີ) — ປັບໄດ້ຕາມລະບຽບປັດຈຸບັນ
const MAX_LEASE_YEARS_FOREIGN = 50;     // ສຳປະທານທົ່ວໄປ
const MAX_LEASE_YEARS_VIA_ENTITY = 75;  // ຜ່ານນິຕິບຸກຄົນທີ່ໄດ້ຮັບການສົ່ງເສີມ

const T: Record<Lang, Record<string, string>> = {
  lo: {
    laoFull: 'ພົນລະເມືອງລາວ ສາມາດຖືກຳມະສິດທີ່ດິນໄດ້ເຕັມສິດ.',
    foreignNoOwn: 'ຄົນຕ່າງປະເທດບໍ່ສາມາດຖືກຳມະສິດທີ່ດິນໄດ້ ຕາມກົດໝາຍທີ່ດິນ.',
    leaseOk: 'ສາມາດເຊົ່າ/ສຳປະທານທີ່ດິນໄລຍະຍາວໄດ້.',
    leaseTooLong: 'ໄລຍະເຊົ່າເກີນກຳນົດ — ຕ້ອງປັບລົງ ຫຼື ຜ່ານນິຕິບຸກຄົນທີ່ໄດ້ຮັບການສົ່ງເສີມ.',
    condoFallback: 'ແນະນຳ: ພິຈາລະນາຊື້ຫ້ອງ Condominium (ກຳມະສິດອາຄານຊຸດ) ເປັນທາງເລືອກ.',
    needEntity: 'ແນະນຳໃຫ້ຈົດທະບຽນນິຕິບຸກຄົນໃນລາວ ເພື່ອຂະຫຍາຍສິດການເຊົ່າ.',
  },
  en: {
    laoFull: 'Lao citizens may hold full land ownership.',
    foreignNoOwn: 'Foreigners cannot own land under the Land Law.',
    leaseOk: 'Long-term land lease/concession is permitted.',
    leaseTooLong: 'Lease term exceeds the limit — reduce it or use a promoted legal entity.',
    condoFallback: 'Suggestion: consider buying a condominium unit as an alternative.',
    needEntity: 'Register a Lao legal entity to extend lease rights.',
  },
  zh: {
    laoFull: '老挝公民可拥有完整土地所有权。',
    foreignNoOwn: '根据土地法，外国人不能拥有土地。',
    leaseOk: '允许长期租赁/特许土地。',
    leaseTooLong: '租期超过上限——请缩短或通过受鼓励的法律实体办理。',
    condoFallback: '建议：可考虑购买公寓单元作为替代方案。',
    needEntity: '注册老挝法律实体以延长租赁权。',
  },
};

export function runForeignBuyerWizard(input: WizardInput): WizardResult {
  const lang: Lang = input.lang ?? 'lo';
  const t = T[lang];
  const notes: string[] = [];

  // --- ກໍລະນີ 1: ພົນລະເມືອງລາວ → ຖືກຳມະສິດໄດ້ເຕັມ ---
  if (input.buyerNationality === 'lao') {
    return { eligible: true, recommendedStructure: 'freehold_ownership', notes: [t.laoFull] };
  }

  // --- ກໍລະນີ 2: ຄົນຕ່າງປະເທດ ຢາກຊື້ທີ່ດິນໂດຍກົງ → ບໍ່ໄດ້ ---
  if (input.intent === 'buy_land') {
    notes.push(t.foreignNoOwn, t.leaseOk, t.condoFallback);
    return {
      eligible: false,
      recommendedStructure: 'long_term_lease',
      notes,
      fallback: 'condominium',
    };
  }

  // --- ກໍລະນີ 3: ຄົນຕ່າງປະເທດ ຊື້ condominium → ໄດ້ (ພາຍໃຕ້ສັດສ່ວນ) ---
  if (input.intent === 'buy_condo') {
    return {
      eligible: true,
      recommendedStructure: 'condominium_unit',
      notes: [
        lang === 'lo' ? 'ສາມາດຖືກຳມະສິດຫ້ອງ Condominium ໄດ້ ພາຍໃຕ້ສັດສ່ວນທີ່ກົດໝາຍກຳນົດ.' :
        lang === 'zh' ? '可在法律规定的比例内拥有公寓单元。' :
        'Condominium ownership allowed within the legally mandated quota.',
      ],
    };
  }

  // --- ກໍລະນີ 4: ຄົນຕ່າງປະເທດ ເຊົ່າທີ່ດິນ → ກວດໄລຍະ ---
  const maxYears = input.hasLaoRegisteredEntity ? MAX_LEASE_YEARS_VIA_ENTITY : MAX_LEASE_YEARS_FOREIGN;
  const years = input.leaseYears ?? 0;

  if (years > maxYears) {
    notes.push(t.leaseTooLong);
    if (!input.hasLaoRegisteredEntity) notes.push(t.needEntity);
    return { eligible: false, recommendedStructure: 'long_term_lease', notes, fallback: 'condominium' };
  }

  notes.push(t.leaseOk);
  if (!input.hasLaoRegisteredEntity && years > MAX_LEASE_YEARS_FOREIGN) notes.push(t.needEntity);
  return {
    eligible: true,
    recommendedStructure: input.hasLaoRegisteredEntity ? 'concession_via_entity' : 'long_term_lease',
    notes,
  };
}
