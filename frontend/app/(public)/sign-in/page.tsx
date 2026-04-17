'use client';

import { AuthDialog } from '@/components/public/auth-dialog';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function sanitizeReturnUrl(rawValue: string | null): string {
  if (!rawValue) {
    return '/profile';
  }

  if (!rawValue.startsWith('/')) {
    return '/profile';
  }

  if (rawValue.startsWith('//') || rawValue.includes('://')) {
    return '/profile';
  }

  return rawValue;
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));

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
