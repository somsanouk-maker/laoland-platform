const createNextIntlPlugin = require('next-intl/plugin');

// ເຊື່ອມ next-intl: ໂຫຼດ message ຕາມ locale (lo/en/zh)
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withNextIntl(nextConfig);
