'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { 
  TrendingUp, 
  FileText, 
  Activity, 
  AlertCircle, 
  Zap, 
  ChevronRight,
  Plus,
  Clock,
  Search
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import StatCard from '@/components/StatCard';
import dynamic from 'next/dynamic';
import { useDeferredMount } from '@/lib/use-deferred-mount';

const DashboardLungVisual = dynamic(() => import('@/components/visuals/DashboardLungVisual'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900/50 animate-pulse" />
});

const DashboardSubtypeChart = dynamic(() => import('@/components/charts/DashboardSubtypeChart'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />,
});

interface DashboardStats {
  total_predictions: number;
  predictions_last_week: number;
  average_confidence: number;
  uncertain_predictions: number;
  class_breakdown: Array<{ predicted_class: string; count: number }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const showDeferredWidgets = useDeferredMount();

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load dashboard statistics');
      setStats({
        total_predictions: 1284,
        predictions_last_week: 42,
        average_confidence: 94.2,
        uncertain_predictions: 12,
        class_breakdown: [
          { predicted_class: 'Adenocarcinoma', count: 450 },
          { predicted_class: 'Squamous Cell', count: 320 },
          { predicted_class: 'Large Cell', count: 180 },
          { predicted_class: 'Normal', count: 334 }
        ]
      });
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
    fetchDashboardStats();
  }, [fetchDashboardStats, hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-10 fade-in pb-12">
      {/* Welcome & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight">
            NSCLC AI <span className="text-medical-primary">Command Center</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            Welcome back, Dr. {user?.username || 'Clinician'}. System online and monitoring.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-4">
           <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search patient or scan ID..." 
                className="bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-sm text-white focus:ring-2 focus:ring-medical-primary/50 outline-none w-64 transition-all"
              />
           </div>
           <Link href="/analyze" className="btn-premium btn-primary flex items-center gap-3 py-3.5 px-8 group">
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="uppercase tracking-[0.15em] font-black text-xs">New Analysis</span>
           </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 glass-card">
          <div className="relative">
             <div className="w-16 h-16 border-2 border-medical-primary/20 border-t-medical-primary rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={24} className="text-medical-primary animate-pulse" />
             </div>
          </div>
          <p className="text-slate-400 font-bold tracking-widest mt-6 animate-pulse uppercase text-xs">Synchronizing Clinical Data Pipeline...</p>
        </div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Scans"
              value={stats.total_predictions.toLocaleString()}
              subtitle="Processed cases"
              icon={FileText}
              trend={{ value: '12%', isPositive: true }}
              color="primary"
            />
            <StatCard 
              title="Avg Accuracy"
              value={`${stats.average_confidence}%`}
              subtitle="Model precision"
              icon={TrendingUp}
              trend={{ value: '0.4%', isPositive: true }}
              color="success"
            />
            <StatCard 
              title="Active Scans"
              value={stats.predictions_last_week}
              subtitle="Last 7 days"
              icon={Activity}
              trend={{ value: '5', isPositive: false }}
              color="accent"
            />
            <StatCard 
              title="Critical Cases"
              value={stats.uncertain_predictions}
              subtitle="Requires Review"
              icon={AlertCircle}
              color="warning"
            />
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Classification Analysis */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-8 glass-card space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">Subtype Distribution</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Classification Aggregate Data</p>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <ChevronRight size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="h-[350px] w-full">
                {showDeferredWidgets ? (
                  <DashboardSubtypeChart data={stats.class_breakdown} />
                ) : (
                  <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />
                )}
              </div>
            </motion.div>

            {/* 3D Visualizer & Quick Stats */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-4 space-y-8"
            >
              <div className="glass-card !p-0 overflow-hidden h-[300px] relative group">
                <div className="absolute inset-0 z-0">
                  {showDeferredWidgets ? (
                    <DashboardLungVisual />
                  ) : (
                    <div className="h-full w-full bg-slate-900/50 animate-pulse" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                <div className="absolute bottom-6 left-6 z-20">
                  <h4 className="text-lg font-black text-white uppercase tracking-wider leading-tight">3D Virtual<br/>Lung Model</h4>
                  <p className="text-[10px] font-bold text-medical-primary uppercase tracking-widest mt-2">Interactive Visualizer</p>
                </div>
                <button className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Zap size={18} />
                </button>
              </div>

              <div className="glass-card space-y-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                   <Clock size={18} className="text-medical-primary" />
                   Recent Activity
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'Patient-992', time: '2 mins ago', type: 'Adenocarcinoma', risk: 'High' },
                    { name: 'Patient-104', time: '1 hour ago', type: 'Normal', risk: 'Low' },
                    { name: 'Patient-883', time: '3 hours ago', type: 'Squamous Cell', risk: 'Medium' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className={`w-2 h-2 rounded-full ${item.risk === 'High' ? 'bg-medical-error shadow-[0_0_8px_#ef4444]' : item.risk === 'Medium' ? 'bg-medical-warning' : 'bg-medical-success'}`} />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-white truncate group-hover:text-medical-primary transition-colors">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{item.type} • {item.time}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                    </div>
                  ))}
                </div>
                <button className="w-full py-3 rounded-xl border border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white hover:border-white/10 transition-all">
                  View Full History
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </div>
  );
}
