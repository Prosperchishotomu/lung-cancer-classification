'use client';

import { useAuthStore } from '@/lib/store';
import { 
  User, 
  Mail, 
  Shield, 
  BadgeCheck, 
  Save,
  Zap,
  Lock,
  Bell,
  Activity,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated || !isAuthenticated) return null;

  const handleSave = () => {
    toast.success('Clinical preferences updated successfully.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 fade-in pb-20">
      {/* Header / Hero */}
      <div className="flex flex-col md:flex-row items-center gap-8 relative">
        <div className="relative group">
           <div className="absolute inset-0 bg-medical-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-medical-primary/40 transition-all duration-500" />
           <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-medical-primary to-medical-secondary flex items-center justify-center text-white text-4xl font-black shadow-2xl relative z-10 border border-white/10">
              {user?.username?.[0]?.toUpperCase()}
           </div>
           <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-white/10 p-2 rounded-2xl z-20 shadow-lg">
              <Zap size={20} className="text-medical-primary animate-pulse" />
           </div>
        </div>
        
        <div className="text-center md:text-left space-y-3">
           <h1 className="text-5xl font-black text-white tracking-tight">{user?.username}</h1>
           <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <span className="px-4 py-1.5 rounded-full bg-medical-primary/10 text-medical-primary font-black text-[10px] uppercase tracking-[0.2em] border border-medical-primary/20 flex items-center gap-2">
                 <BadgeCheck size={14} /> Authorized {user?.role || 'Clinician'}
              </span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Core ID: #{user?.user_id}</span>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Account Details Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass-card space-y-8 border-white/10"
           >
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-6">Account Architecture</h3>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-slate-900 rounded-2xl text-slate-500 group-hover:text-medical-primary border border-white/5 transition-colors">
                       <Mail size={20} />
                    </div>
                    <div className="overflow-hidden">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Institutional Email</p>
                       <p className="text-sm font-black text-white truncate">{user?.email}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-slate-900 rounded-2xl text-slate-500 group-hover:text-medical-primary border border-white/5 transition-colors">
                       <Shield size={20} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Access Tier</p>
                       <p className="text-sm font-black text-white uppercase tracking-wider">{user?.is_staff ? 'Administrative / Root' : 'Clinical Practitioner'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-slate-900 rounded-2xl text-slate-500 group-hover:text-medical-primary border border-white/5 transition-colors">
                       <Activity size={20} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Neural Sync</p>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-medical-success animate-pulse" />
                          <p className="text-sm font-black text-medical-success uppercase">Active Link</p>
                       </div>
                    </div>
                 </div>
              </div>
           </motion.div>

           <button className="w-full glass-card !p-5 flex items-center justify-between group hover:border-medical-primary/30 transition-all border-white/10">
              <div className="flex items-center gap-4 text-slate-400 group-hover:text-white transition-colors">
                 <Lock size={20} className="text-medical-primary" />
                 <span className="text-xs font-black uppercase tracking-widest">Security Protocols</span>
              </div>
              <ChevronRight size={18} className="text-slate-700 group-hover:text-medical-primary" />
           </button>
        </div>

        {/* Clinical Settings Main */}
        <div className="lg:col-span-8">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="glass-card !p-12 space-y-12 border-white/10"
           >
              <div className="space-y-4">
                 <h3 className="text-2xl font-black text-white tracking-tight">Practitioner Identity</h3>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">Modify your clinical metadata for institutional reporting and AI-generated documentation.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Legal Name</label>
                    <div className="relative">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                       <input type="text" className="input-field !pl-12 !bg-slate-900/50 border-white/5" defaultValue={user?.username} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Specialty Designation</label>
                    <div className="relative">
                       <BadgeCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                       <input type="text" className="input-field !pl-12 !bg-slate-900/50 border-white/5" defaultValue={user?.role?.toUpperCase()} />
                    </div>
                 </div>
                 <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Assigned Institution</label>
                    <div className="relative">
                       <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                       <input type="text" className="input-field !pl-12 !bg-slate-900/50 border-white/5" placeholder="e.g. Metro General Oncology Center" />
                    </div>
                 </div>
              </div>

              <div className="space-y-8 pt-10 border-t border-white/5">
                 <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Neural Interface Prefs</h4>
                 
                 <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                       <div className="flex items-center gap-5">
                          <div className="p-3 bg-slate-900 rounded-2xl text-medical-primary">
                             <Bell size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-white group-hover:text-medical-primary transition-colors">Real-time Telemetry Alerts</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Instant notification on high-risk scan findings.</p>
                          </div>
                       </div>
                       <div className="w-14 h-7 bg-medical-primary rounded-full relative p-1 transition-all">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-1 shadow-lg shadow-medical-primary/50"></div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                       <div className="flex items-center gap-5">
                          <div className="p-3 bg-slate-900 rounded-2xl text-medical-primary">
                             <Activity size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-white group-hover:text-medical-primary transition-colors">Automated Feature Localization</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Compute Grad-CAM heatmaps for every inference.</p>
                          </div>
                       </div>
                       <div className="w-14 h-7 bg-medical-primary rounded-full relative p-1 transition-all">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-1 shadow-lg shadow-medical-primary/50"></div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex justify-end pt-6">
                 <button 
                   onClick={handleSave}
                   className="btn-premium btn-primary py-4 px-12 flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-medical-primary/20"
                 >
                    <Save size={18} />
                    Commit Preferences
                 </button>
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
