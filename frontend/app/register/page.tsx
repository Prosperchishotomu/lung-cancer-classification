'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { validateEmail, validatePassword } from '@/lib/utils';
import { AlertCircle, Eye, EyeOff, Shield, User as UserIcon, Mail, Briefcase, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';


export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, hasHydrated } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'clinician',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState('');

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [hasHydrated, isAuthenticated, router]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid institutional email';
    }

    const passwordErrors = validatePassword(formData.password);
    if (Object.keys(passwordErrors).length > 0) {
      newErrors.password = Object.values(passwordErrors).join(', ');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return 'Weak';
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return 'Fair';
    if (!/[^a-zA-Z0-9]/.test(pwd)) return 'Good';
    return 'Strong';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setFormData({ ...formData, password: pwd });
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please resolve the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.register(
        formData.username,
        formData.email,
        formData.password,
        formData.confirmPassword,
        formData.role
      );

      login(response.token, {
        user_id: response.user_id,
        username: response.username,
        email: response.email,
        role: response.role,
      });

      toast.success('Account provisioned successfully');
      router.push('/dashboard');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Please contact your administrator.';
      setErrors({ form: errorMsg });
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
          className="w-full max-w-xl"
        >
          <div className="glass-card !bg-slate-950/40 border-white/10 space-y-8 !p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-medical-secondary/20 rounded-full blur-[80px]" />

            {/* Header */}
            <div className="text-center space-y-3 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-medical-primary to-medical-secondary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-medical-primary/20 mb-6">
                <Shield size={32} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Account Registration</h1>
              <p className="text-slate-400 font-medium text-sm tracking-wide">Create your NSCLC AI workspace credentials</p>
            </div>

            {/* Form Error */}
            {errors.form && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="alert-premium alert-error"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold">{errors.form}</div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Username</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors" size={16} />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="dr_smith"
                    className={`input-field !pl-12 text-sm ${errors.username ? 'border-medical-error/50' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.username && <p className="text-medical-error text-[10px] font-bold ml-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="smith@hospital.org"
                    className={`input-field !pl-12 text-sm ${errors.email ? 'border-medical-error/50' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-medical-error text-[10px] font-bold ml-1">{errors.email}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Clinical Specialization</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors" size={16} />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-field !pl-12 text-sm cursor-pointer appearance-none"
                    disabled={isLoading}
                  >
                    <option value="clinician">Clinician / Oncologist</option>
                    <option value="radiologist">Radiologist</option>
                    <option value="researcher">Medical Researcher</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handlePasswordChange}
                    placeholder="Min 8 chars"
                    className={`input-field !pl-12 !pr-12 text-sm ${errors.password ? 'border-medical-error/50' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordStrength && (
                   <div className="flex items-center gap-2 mt-1 ml-1">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                         <div 
                            className={`h-full transition-all duration-500 ${
                               passwordStrength === 'Weak' ? 'w-1/4 bg-red-500' :
                               passwordStrength === 'Fair' ? 'w-2/4 bg-amber-500' :
                               passwordStrength === 'Good' ? 'w-3/4 bg-blue-500' :
                               'w-full bg-emerald-500'
                            }`}
                         />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{passwordStrength}</span>
                   </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-medical-primary transition-colors" size={16} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className={`input-field !pl-12 !pr-12 text-sm ${errors.confirmPassword ? 'border-medical-error/50' : ''}`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="md:col-span-2 w-full btn-premium btn-primary py-4 text-sm uppercase tracking-[0.2em] font-black shadow-lg shadow-medical-primary/20 mt-4"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t border-white/5">
              <p className="text-slate-400 text-xs font-medium">
                Existing institutional member?{' '}
                <Link href="/login" className="text-medical-primary font-bold hover:text-sky-300 transition-colors tracking-wide">
                  Sign in to workspace
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
