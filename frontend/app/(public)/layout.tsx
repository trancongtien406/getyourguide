import { BottomHeader } from '@/components/public/bottom-header';
import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';
import { AuthProvider } from '@/lib/auth-context';
import { LocaleCurrencyProvider } from '@/lib/locale-currency-context';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleCurrencyProvider>
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
          <Navbar />
          <BottomHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </LocaleCurrencyProvider>
    </AuthProvider>
  );
}
