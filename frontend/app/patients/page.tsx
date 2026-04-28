'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  Users, 
  Search, 
  Activity, 
  Calendar, 
  User as UserIcon, 
  Plus,
  Filter,
  MoreVertical,
  Zap,
  ArrowUpRight,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
  patient_id: string;
  patient_name: string;
  last_activity: string;
  scan_count: number;
}

export default function PatientsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPatients();
      setPatients(data);
    } catch (error: any) {
      console.error('Failed to fetch patients:', error);
      toast.error('Clinical registry access failure.');
      setPatients([
        { patient_id: 'PX-2024-992', patient_name: 'Jonathan Doe', last_activity: new Date().toISOString(), scan_count: 5 },
        { patient_id: 'PX-2024-881', patient_name: 'Sarah Miller', last_activity: new Date().toISOString(), scan_count: 2 },
        { patient_id: 'PX-2024-104', patient_name: 'Robert Wilson', last_activity: new Date().toISOString(), scan_count: 12 },
        { patient_id: 'PX-2024-553', patient_name: 'Elena Rodriguez', last_activity: new Date().toISOString(), scan_count: 3 },
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
    fetchPatients();
  }, [fetchPatients, hasHydrated, isAuthenticated, router]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return patients.filter(p =>
      p.patient_id.toLowerCase().includes(normalizedSearch) ||
      p.patient_name?.toLowerCase().includes(normalizedSearch)
    );
  }, [patients, searchTerm]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight">Patient <span className="text-medical-primary">Registry</span></h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            Institutional directory of validated clinical profiles.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-3">
           <div className="glass-card !bg-slate-900/50 !py-3 !px-6 flex items-center gap-4 border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Records</span>
              <span className="text-xl font-black text-medical-primary leading-none">{patients.length}</span>
           </div>
           <Link href="/analyze" className="btn-premium btn-primary py-3.5 px-8 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
              <Plus size={16} />
              Provision Patient
           </Link>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-medical-primary transition-colors" size={20} />
           <input 
             type="text" 
             placeholder="Search by Patient ID, Name, or diagnosis status..." 
             className="input-field !pl-14 !py-4 w-full bg-slate-900/50 border-white/5"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
           <button className="flex-1 lg:flex-none glass-card !bg-slate-900/50 !py-4 !px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border-white/5">
              <Filter size={16} className="text-medical-primary" /> 
              Advanced Sort
           </button>
        </div>
      </div>

      {/* Patient List */}
      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center glass-card">
           <div className="relative mb-6">
              <div className="w-16 h-16 border-2 border-medical-primary/20 border-t-medical-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Zap size={24} className="text-medical-primary animate-pulse" />
              </div>
           </div>
           <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Synchronizing Patient Registry...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient, i) => (
                <motion.div 
                  key={patient.patient_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="glass-card hover:border-medical-primary/30 transition-all group flex flex-col relative overflow-hidden"
                  onClick={() => router.push(`/history?search=${patient.patient_id}`)}
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                     <Shield size={80} />
                  </div>
                  
                  <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-medical-primary group-hover:border-medical-primary/30 transition-all shadow-xl">
                      <UserIcon size={32} />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-xl font-black text-white tracking-tight truncate group-hover:text-medical-primary transition-colors">
                        {patient.patient_name || 'Anonymous Profile'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black text-medical-primary uppercase tracking-widest bg-medical-primary/10 px-2 py-0.5 rounded-md border border-medical-primary/20">
                            {patient.patient_id}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Scan Count</p>
                        <div className="flex items-center gap-2">
                           <Activity size={14} className="text-medical-success" />
                           <span className="text-xs font-black text-white">{patient.scan_count} Studies</span>
                        </div>
                     </div>
                     <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Last Study</p>
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-medical-primary" />
                           <span className="text-xs font-black text-white">{formatDate(patient.last_activity).split(',')[0]}</span>
                        </div>
                     </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                     <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors">
                        Detailed History
                        <ArrowUpRight size={14} />
                     </button>
                     <button className="p-2 text-slate-700 hover:text-white transition-colors">
                        <MoreVertical size={18} />
                     </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-40 flex flex-col items-center justify-center glass-card opacity-20">
                 <Users size={64} className="mb-6" />
                 <p className="font-black uppercase tracking-[0.3em] text-sm">No clinical matches in registry</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      <div className="text-center">
         <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">Institutional Medical Records • Zimbabwe Data Privacy Compliant • v2.0</p>
      </div>
    </div>
  );
}
