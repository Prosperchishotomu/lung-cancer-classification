'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { 
  LayoutDashboard, 
  Activity, 
  History, 
  BarChart3, 
  User, 
  LogOut,
  Shield,
  MessageSquare,
  Menu,
  X,
  Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analyze Scan', href: '/analyze', icon: Activity },
  { label: 'History', href: '/history', icon: History },
  { label: 'Patients', href: '/patients', icon: User },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'AI Assistant', href: '/chat', icon: MessageSquare },
];

const ADMIN_NAV_ITEM = { label: 'Users', href: '/users', icon: Users };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isAdmin = user?.role === 'admin' || user?.is_staff;
  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      logout();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
      router.push('/login');
    }
  };

  return (
    <>
      {/* Mobile Nav Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-[60]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-900 border border-white/10 rounded-xl text-medical-primary active:scale-95 transition-transform"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-[50] w-72 bg-slate-950 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="p-8">
          <Link href="/dashboard" prefetch className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-medical-primary to-medical-secondary rounded-xl flex items-center justify-center text-white shadow-medical-primary/20 shadow-lg group-hover:scale-110 transition-transform">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white leading-tight uppercase tracking-wider">
                NSCLC <span className="text-medical-primary">AI</span>
              </h1>
              <p className="text-[8px] uppercase tracking-[0.3em] font-bold text-slate-500 leading-tight mt-1">Diagnostic System</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href}
                prefetch
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <item.icon size={20} className={isActive ? 'text-medical-primary' : 'text-slate-500'} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <Link href="/profile" prefetch className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors ${pathname === '/profile' ? 'bg-white/5 border border-white/10' : 'border border-transparent'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white font-bold border border-white/10">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.username || 'Medical Staff'}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{user?.role || 'Clinician'}</p>
            </div>
          </Link>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-medical-error hover:bg-medical-error/10 transition-all font-semibold text-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
