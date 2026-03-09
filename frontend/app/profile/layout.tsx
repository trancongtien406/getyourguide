'use client';

import { ProfileSideNav } from '@/components/profile/side-nav';
import { Footer } from '@/components/public/footer';
import { Navbar } from '@/components/public/navbar';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { LocaleCurrencyProvider } from '@/lib/locale-currency-context';
import { ThemeProvider } from '@/lib/theme-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

function ProfileLayoutContent({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(returnUrl ? `/sign-in?returnUrl=${returnUrl}` : '/sign-in');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Side Navigation */}
          <aside className="lg:w-64 shrink-0">
            <ProfileSideNav />
          </aside>

          {/* Page Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LocaleCurrencyProvider>
        <ThemeProvider>
          <ProfileLayoutContent>{children}</ProfileLayoutContent>
        </ThemeProvider>
      </LocaleCurrencyProvider>
    </AuthProvider>
  );
}
