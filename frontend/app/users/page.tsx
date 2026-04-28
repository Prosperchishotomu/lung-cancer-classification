'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  Shield, 
  ShieldAlert, 
  User, 
  Calendar, 
  UserPlus, 
  Lock,
  MoreVertical,
  Zap,
  Search,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import StatCard from '@/components/StatCard';

interface SystemUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast.error('Access denied to secure user vault.');
      setUsers([
        { id: 1, username: 'admin', email: 'admin@medical-ai.org', role: 'admin', is_active: true, is_staff: true, date_joined: new Date().toISOString() },
        { id: 2, username: 'dr_smith', email: 'smith@hospital.org', role: 'clinician', is_active: true, is_staff: false, date_joined: new Date().toISOString() },
        { id: 3, username: 'rad_jones', email: 'jones@radiology.com', role: 'radiologist', is_active: true, is_staff: false, date_joined: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user && user.role !== 'admin' && !user.is_staff) {
      toast.error('Administrative access required for this terminal.');
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [fetchUsers, hasHydrated, isAuthenticated, user, router]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return users.filter(u =>
      u.username.toLowerCase().includes(normalizedSearch) ||
      u.email.toLowerCase().includes(normalizedSearch)
    );
  }, [searchTerm, users]);

  if (!hasHydrated || !isAuthenticated || (user?.role !== 'admin' && !user?.is_staff)) return null;

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
             <Shield className="text-medical-primary" size={32} />
             System <span className="text-medical-primary">Administration</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Manage institutional credentials and access permissions.</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
           <button className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-slate-500 hover:text-white transition-colors">
              <ShieldAlert size={20} />
           </button>
           <button className="btn-premium btn-primary py-3.5 px-8 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <UserPlus size={16} />
              Provision Account
           </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Active Personnel"
          value={users.length}
          subtitle="Total Provisioned Users"
          icon={User}
          color="primary"
        />
        <StatCard 
          title="Security Rank"
          value={users.filter(u => u.role === 'admin' || u.is_staff).length}
          subtitle="Administrative Nodes"
          icon={Lock}
          color="accent"
        />
        <StatCard 
          title="Access Status"
          value="100%"
          subtitle="Neural Link Stability"
          icon={Zap}
          color="success"
        />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-medical-primary transition-colors" size={20} />
           <input 
             type="text" 
             placeholder="Search clinician by name, ID, or email..." 
             className="input-field !pl-14 !py-4 w-full bg-slate-900/50 border-white/5"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
           <button className="flex-1 lg:flex-none glass-card !bg-slate-900/50 !py-4 !px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border-white/5">
              <Filter size={16} className="text-medical-primary" /> 
              Tier Filter
           </button>
        </div>
      </div>

      {/* Users Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card !p-0 overflow-hidden border-white/10 shadow-2xl bg-slate-950/40"
      >
         {isLoading ? (
           <div className="py-40 flex flex-col items-center justify-center">
              <div className="relative mb-6">
                 <div className="w-16 h-16 border-2 border-medical-primary/20 border-t-medical-primary rounded-full animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-medical-primary animate-pulse" />
                 </div>
              </div>
              <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Syncing User Vault...</p>
           </div>
         ) : (
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[1000px]">
                 <thead>
                   <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                     <th className="py-6 px-10">Clinician Identity</th>
                     <th className="py-6 px-10">Clinical Designation</th>
                     <th className="py-6 px-10">Status</th>
                     <th className="py-6 px-10">Provisioned Date</th>
                     <th className="py-6 px-10 text-right">Privilege Control</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   <AnimatePresence>
                     {filteredUsers.map((u, i) => (
                       <motion.tr 
                         key={u.id} 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                         className="hover:bg-white/[0.02] transition-colors group"
                       >
                         <td className="py-6 px-10">
                            <div className="flex items-center gap-5">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl border ${
                                  u.is_staff 
                                  ? 'bg-gradient-to-br from-medical-primary to-medical-secondary text-white border-white/10' 
                                  : 'bg-slate-900 text-slate-400 border-white/5 group-hover:border-medical-primary/30'
                               }`}>
                                  {u.username[0].toUpperCase()}
                               </div>
                               <div>
                                  <p className="font-black text-white tracking-tight group-hover:text-medical-primary transition-colors">{u.username}</p>
                                  <p className="text-[10px] text-slate-500 font-bold tracking-wider">{u.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="py-6 px-10">
                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                               u.role === 'admin' || u.is_staff 
                               ? 'bg-medical-primary/10 text-medical-primary border-medical-primary/20 shadow-[0_0_8px_rgba(14,165,233,0.1)]' 
                               : 'bg-slate-900 text-slate-500 border-white/5'
                            }`}>
                               {u.role}
                            </span>
                         </td>
                         <td className="py-6 px-10">
                            <div className="flex items-center gap-2">
                               {u.is_active ? (
                                 <>
                                   <div className="w-1.5 h-1.5 rounded-full bg-medical-success shadow-[0_0_8px_#10b981]" />
                                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Link</span>
                                 </>
                               ) : (
                                 <>
                                   <div className="w-1.5 h-1.5 rounded-full bg-medical-error" />
                                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vault Locked</span>
                                 </>
                               )}
                            </div>
                         </td>
                         <td className="py-6 px-10">
                            <div className="flex items-center gap-3">
                               <Calendar size={14} className="text-slate-700" />
                               <span className="text-xs font-bold text-slate-400">
                                  {formatDate(u.date_joined)}
                               </span>
                            </div>
                         </td>
                         <td className="py-6 px-10 text-right">
                            <div className="flex items-center justify-end gap-3">
                               {u.username !== 'admin' ? (
                                 <>
                                   <button className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-medical-primary hover:border-medical-primary/30 transition-all">
                                      <Lock size={16} />
                                   </button>
                                   <button className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-medical-error hover:border-medical-error/30 transition-all">
                                      <ShieldAlert size={16} />
                                   </button>
                                 </>
                               ) : (
                                 <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                    System Protected
                                 </div>
                               )}
                               <button className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all">
                                  <MoreVertical size={16} />
                               </button>
                            </div>
                         </td>
                       </motion.tr>
                     ))}
                   </AnimatePresence>
                 </tbody>
              </table>
           </div>
         )}
      </motion.div>
      
      <div className="text-center">
         <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">Root Administration Terminal • Encrypted Session • v2.4</p>
      </div>
    </div>
  );
}
