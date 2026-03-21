'use client';

// ============================================================
// BottomNav - Mobile navigation bar
// ============================================================

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/home', icon: '🏠', label: 'Home' },
  { href: '/friends', icon: '👥', label: 'Friends' },
  { href: '/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-xl border-t border-white/5 safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-xl transition-colors"
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-white/5 rounded-xl"
                  layoutId="nav-active"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`text-lg ${isActive ? '' : 'opacity-50'}`}>
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
