import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// ໂຫຼດ message ຕາມ locale ປັດຈຸບັນ (server-side)
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) locale = routing.defaultLocale;
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
