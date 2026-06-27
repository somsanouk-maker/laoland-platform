import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ສີຫຼັກ brand (ໂທນຂຽວ = ຄວາມເຊື່ອໝັ້ນ + Green Badge)
        brand: { DEFAULT: '#0F7B6C', light: '#14a08c', dark: '#0a5a4f' },
      },
      fontFamily: {
        // ຮອງຮັບ font ລາວ (Noto Sans Lao) + ສາກົນ
        sans: ['"Noto Sans Lao"', '"Noto Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
