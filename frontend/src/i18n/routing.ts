import { defineRouting } from 'next-intl/routing';

// ຮອງຮັບ 3 ພາສາ ຕາມຍຸດທະສາດ: ລາວ (default) / ອັງກິດ / ຈີນ
export const routing = defineRouting({
  locales: ['lo', 'en', 'zh'],
  defaultLocale: 'lo',
});
