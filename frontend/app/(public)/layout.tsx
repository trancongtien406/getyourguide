import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';
import { AuthProvider } from '@/lib/auth-context';
import { GuestCartProvider } from '@/lib/guest-cart-context';
import { LocaleCurrencyProvider } from '@/lib/locale-currency-context';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GuestCartProvider>
        <LocaleCurrencyProvider>
          <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </LocaleCurrencyProvider>
      </GuestCartProvider>
    </AuthProvider>
  );
}
