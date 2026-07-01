import { env } from '../config/env.js';

// ============================================================
// WhatsApp adapter — ຊ່ອງທາງຫຼັກໃນການແຈ້ງເຕືອນ (ຕາມຍຸດທະສາດ)
// MVP: ຖ້າຍັງບໍ່ໄດ້ຕັ້ງ token → log ອອກ console (stub) ເພື່ອທົດສອບ flow ໄດ້
// Production: ເອີ້ນ WhatsApp Cloud API (graph.facebook.com)
// ============================================================

interface SendResult {
  ok: boolean;
  provider: 'whatsapp' | 'stub';
}

export async function sendWhatsAppText(toE164: string, body: string): Promise<SendResult> {
  // ບໍ່ມີ credentials → stub mode (dev)
  if (!env.whatsapp.token || !env.whatsapp.phoneId) {
    console.log(`\n[WhatsApp STUB] → ${toE164}\n${body}\n`);
    return { ok: true, provider: 'stub' };
  }

  const url = `${env.whatsapp.apiUrl}/${env.whatsapp.phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toE164.replace('+', ''),
      type: 'text',
      text: { body },
    }),
  });
  return { ok: res.ok, provider: 'whatsapp' };
}

// ແຈ້ງນາຍໜ້າ: ເຈົ້າຂອງອະນຸມັດ mandate
export function buildMandateApprovedMessage(brokerName: string, location: string): string {
  return [
    `LaoLand: ເຈົ້າຂອງທີ່ດິນໄດ້ອະນຸມັດ Mandate ຂອງທ່ານ`,
    `ນາຍໜ້າ: ${brokerName} | ທີ່ດິນ: ${location}`,
    `Your mandate for "${location}" has been approved.`,
  ].join('\n');
}

// ແຈ້ງນາຍໜ້າ: ເຈົ້າຂອງຍົກເລີກ mandate
export function buildMandateRevokedMessage(brokerName: string, location: string): string {
  return [
    `LaoLand: ເຈົ້າຂອງທີ່ດິນໄດ້ຍົກເລີກ Mandate ຂອງທ່ານ`,
    `ນາຍໜ້າ: ${brokerName} | ທີ່ດິນ: ${location}`,
    `Your mandate for "${location}" has been revoked by the owner.`,
  ].join('\n');
}

// ສົ່ງ OTP — ຂໍ້ຄວາມ 3 ພາສາ ສຳລັບ Owner Gatekeeping
export function buildOtpMessage(code: string): string {
  return [
    `ລະຫັດຢືນຢັນ LaoLand: ${code}`,
    `Your LaoLand code: ${code}`,
    `您的 LaoLand 验证码: ${code}`,
    `(ໝົດອາຍຸໃນ ${env.whatsapp.otpTtlMinutes} ນາທີ / valid ${env.whatsapp.otpTtlMinutes} min)`,
  ].join('\n');
}
