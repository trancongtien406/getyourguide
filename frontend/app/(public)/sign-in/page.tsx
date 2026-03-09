'use client';

import { AuthDialog } from '@/components/public/auth-dialog';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const returnUrl = searchParams.get('returnUrl') || '/profile';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(returnUrl);
    }
  }, [isLoading, isAuthenticated, returnUrl, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <AuthDialog
        isOpen={true}
        onClose={() => router.push('/')}
        initialTab="login"
      />
    </div>
  );
}
