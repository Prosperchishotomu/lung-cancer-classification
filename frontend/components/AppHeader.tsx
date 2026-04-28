'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Menu, X, Shield } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/50 backdrop-blur-xl border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo / Branding */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-medical-primary to-medical-secondary rounded-xl flex items-center justify-center text-white shadow-medical-primary/20 shadow-lg group-hover:scale-110 transition-all duration-300">
             <Shield size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white leading-tight tracking-[0.15em] uppercase">
               NSCLC <span className="text-medical-primary">CLASSIFIER</span>
            </h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] leading-none mt-1">
               NSCLC Diagnostic Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm font-bold uppercase tracking-widest transition-colors ${pathname === '/' ? 'text-medical-primary' : 'text-slate-400 hover:text-white'}`}>
            Home
          </Link>
          
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-premium btn-primary py-2 px-6 text-xs uppercase tracking-widest">
              Go to Workspace
            </Link>
          ) : (
            <div className="flex items-center gap-6">
              <Link href="/login" className={`text-sm font-bold uppercase tracking-widest transition-colors ${pathname === '/login' ? 'text-medical-primary' : 'text-slate-400 hover:text-white'}`}>
                Sign In
              </Link>
              <Link href="/register" className="btn-premium btn-primary py-2 px-6 text-xs uppercase tracking-widest">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white transition"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950 border-t border-white/5 overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-6">
              <Link href="/" className="text-sm font-bold text-slate-400 uppercase tracking-widest">Home</Link>
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-premium btn-primary w-full text-center py-4 text-xs uppercase tracking-widest">
                  Workspace
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sign In</Link>
                  <Link href="/register" className="btn-premium btn-primary w-full text-center py-4 text-xs uppercase tracking-widest">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
