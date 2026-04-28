'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { AlertCircle, Eye, EyeOff, Shield, Lock, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, hasHydrated } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(username, password);
      login(response.token, {
        user_id: response.user_id,
        username: response.username,
        email: response.email,
        role: response.role,
        is_staff: response.is_staff,
      });
      toast.success('Access Granted. Welcome back.');
      router.push('/dashboard');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="glass-card !bg-slate-950/40 border-white/10 space-y-8 !p-10 shadow-2xl relative overflow-hidden">
            {/* Glossy overlay effect */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-medical-primary/20 rounded-full blur-[80px]" />
            
            {/* Header */}
            <div className="text-center space-y-3 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-medical-primary to-medical-secondary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-medical-primary/20 mb-6">
                <Shield size={32} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Clinician Portal</h1>
              <p className="text-slate-400 font-medium text-sm tracking-wide">Enter credentials to access NSCLC AI platform</p>
            </div>

            {/* Error Alert */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="alert-premium alert-error"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold">{error}</div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Institutional ID
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. dr_smith_01"
                    className="input-field !pl-12"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Password
                  </label>
                  <Link href="#" className="text-[10px] font-bold text-medical-primary uppercase tracking-widest hover:underline">Forgot?</Link>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field !pl-12 !pr-12"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-premium btn-primary py-4 text-sm uppercase tracking-[0.2em] font-black shadow-lg shadow-medical-primary/20"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-white/5">
              <p className="text-slate-400 text-xs font-medium">
                New clinician?{' '}
                <Link href="/register" className="text-medical-primary font-bold hover:text-sky-300 transition-colors tracking-wide">
                  Request Institutional Account
                </Link>
              </p>
            </div>
          </div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1 }}
            className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-8"
          >
             Secure Protocol • High Precision Medical AI • v2.0.4
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
