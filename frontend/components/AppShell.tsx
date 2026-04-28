'use client';

import Sidebar from './Sidebar';
import Header from './AppHeader';
import { useAuthStore } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const PUBLIC_ROUTES = ['/', '/login', '/register'];
const PROTECTED_ROUTES_TO_PREFETCH = [
  '/dashboard',
  '/analyze',
  '/history',
  '/patients',
  '/analytics',
  '/chat',
  '/profile',
  '/users',
];
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Platform Overview',
  '/analyze': 'Medical Analysis Chamber',
  '/history': 'Prediction History',
  '/analytics': 'System Analytics',
  '/profile': 'My Profile',
  '/chat': 'Clinical Assistant',
  '/patients': 'Patient Registry',
  '/users': 'User Management',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isPublicPage = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    setMounted(true);
    
    // Activity tracking for idle logout
    let idleTimer: NodeJS.Timeout;
    let lastReset = 0;
    const RESET_THROTTLE = 2000; // 2 seconds

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastReset < RESET_THROTTLE) return;
      lastReset = now;

      clearTimeout(idleTimer);
      if (isAuthenticated) {
        idleTimer = setTimeout(() => {
          logout();
          router.push('/login');
          toast.error('Session expired due to inactivity');
        }, IDLE_TIMEOUT);
      }
    };

    const activityEvents = ['mousemove', 'keypress', 'scroll'];
    
    if (isAuthenticated) {
      activityEvents.forEach(event => {
        window.addEventListener(event, resetTimer, { passive: true });
      });
      resetTimer();
    }

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout, router]);

  useEffect(() => {
    if (!isAuthenticated || !hasHydrated || typeof window === 'undefined') return;

    const prefetchRoutes = () => {
      PROTECTED_ROUTES_TO_PREFETCH.forEach((route) => router.prefetch(route));
    };
    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = browserWindow.setTimeout(prefetchRoutes, 500);
    return () => browserWindow.clearTimeout(timeoutId);
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    // Enforcement: Redirect if not on a public page and not authenticated
    if (!mounted || !hasHydrated) return;

    if (!isPublicPage && !isAuthenticated) {
      router.push('/login');
      toast.error('Please sign in to access this system');
    }
  }, [pathname, isAuthenticated, hasHydrated, mounted, router, isPublicPage]);

  if (!mounted || !hasHydrated) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (isPublicPage || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Landing/Auth pages use the classic header */}
        {isPublicPage && <Header />}
        <main className="flex-1 overflow-x-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-container">
        <header className="h-16 md:h-20 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center px-8 justify-between z-20 sticky top-0">
          <h2 className="text-xl font-bold text-white tracking-wide">
            {ROUTE_TITLES[pathname] ?? ''}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">System Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-medical-success animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-sm font-semibold text-medical-success">Secure Connection</span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="content-scroll">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
