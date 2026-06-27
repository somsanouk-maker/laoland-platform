import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '../../contexts/AuthContext';
import { CurrencyProvider } from '../../contexts/CurrencyContext';
import Sidebar from '../../components/Sidebar';

export const metadata = { title: 'LaoLand — ອະສັງຫາລິມະສັບລາວ' };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  return (
    <html lang={params.locale}>
      <body className="bg-gray-50 min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CurrencyProvider>
              <Sidebar />
              {/* Offset content for desktop sidebar (240px) */}
              <main className="lg:pl-60">
                <div className="max-w-6xl mx-auto px-4 pt-16 lg:pt-6 pb-10">
                  {children}
                </div>
              </main>
            </CurrencyProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
