import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// middleware ຈັດການ locale prefix ໃນ URL (/lo, /en, /zh)
export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(lo|en|zh)/:path*'],
};
