'use client';

// ============================================================
// Root Page - Auth gate + redirect to home
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store-auth';
import AuthScreen from '@/components/auth/AuthScreen';

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  return <AuthScreen onSuccess={() => router.push('/home')} />;
}
