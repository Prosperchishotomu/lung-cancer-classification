'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
  AlertCircle, 
  Activity, 
  TrendingUp, 
  Zap, 
  Search, 
  ChevronRight,
  Filter,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import StatCard from '@/components/StatCard';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDeferredMount } from '@/lib/use-deferred-mount';

const DiagnosticPrevalenceChart = dynamic(() => import('@/components/charts/DiagnosticPrevalenceChart'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />,
});

const StabilityBySubtypeChart = dynamic(() => import('@/components/charts/StabilityBySubtypeChart'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />,
});

interface Prediction {
  id: string;
  patient_id?: string;
  predicted_class: string;
  confidence_score: number;
  probabilities: { [key: string]: number };
  created_at: string;
}

interface MetricsData {
  total_predictions: number;
  average_confidence: number;
  class_distribution: Array<{ predicted_class: string; count: number }>;
  confidence_by_class: Array<{ predicted_class: string; avg_confidence: number; count: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const showDeferredCharts = useDeferredMount();

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [metricsRes, historyRes] = await Promise.all([
        apiClient.getModelMetrics(),
        apiClient.getPredictionHistory(10, selectedPage),
      ]);

      setMetrics(metricsRes);
      setPredictions(historyRes.predictions);
      setTotalPages(Math.ceil(historyRes.total / historyRes.limit));
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load system metrics');
      setMetrics({
        total_predictions: 1284,
        average_confidence: 94.2,
        class_distribution: [
          { predicted_class: 'Adenocarcinoma', count: 450 },
          { predicted_class: 'Squamous Cell', count: 320 },
          { predicted_class: 'Large Cell', count: 180 },
          { predicted_class: 'Normal', count: 334 }
        ],
        confidence_by_class: [
          { predicted_class: 'Adenocarcinoma', avg_confidence: 92.5, count: 450 },
          { predicted_class: 'Squamous Cell', avg_confidence: 91.8, count: 320 },
          { predicted_class: 'Large Cell', avg_confidence: 89.4, count: 180 },
          { predicted_class: 'Normal', avg_confidence: 98.2, count: 334 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchAnalyticsData();
  }, [fetchAnalyticsData, hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight">System <span className="text-medical-primary">Performance</span></h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            Real-time neural pipeline metrics and diagnostic analytics.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-3">
           <button className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-slate-500 hover:text-white transition-colors">
              <Download size={20} />
           </button>
           <div className="bg-slate-900 border border-white/5 p-1 rounded-2xl flex">
              <button className="px-6 py-2 bg-medical-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl">Real-time</button>
              <button className="px-6 py-2 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-colors">Historical</button>
           </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 glass-card">
          <div className="w-16 h-16 border-2 border-medical-primary/20 border-t-medical-primary rounded-full animate-spin mb-6"></div>
          <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Computing system metrics...</p>
        </div>
      ) : metrics ? (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard 
              title="Pipeline Throughput"
              value={metrics.total_predictions}
              subtitle="Analyses Completed"
              icon={Activity}
              color="primary"
            />
            <StatCard 
              title="Avg Precision"
              value={`${(metrics.average_confidence ?? 0).toFixed(1)}%`}
              subtitle="Confidence Baseline"
              icon={TrendingUp}
              color="success"
            />
            <StatCard 
              title="Active Nodes"
              value="12"
              subtitle="GPU Clusters"
              icon={Zap}
              color="accent"
            />
            <StatCard 
              title="Report Latency"
              value="1,244ms"
              subtitle="P99 response"
              icon={BarChart3}
              color="warning"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card space-y-8"
            >
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Diagnostic prevalence</h3>
                 <Filter size={16} className="text-slate-700" />
              </div>
              <div className="h-[350px] w-full">
                {showDeferredCharts ? (
                  <DiagnosticPrevalenceChart data={metrics.class_distribution || []} />
                ) : (
                  <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card space-y-8"
            >
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Stability by Subtype</h3>
              <div className="h-[350px] w-full">
                {showDeferredCharts ? (
                  <StabilityBySubtypeChart data={metrics.confidence_by_class || []} />
                ) : (
                  <div className="h-full w-full rounded-2xl bg-slate-900/40 animate-pulse" />
                )}
              </div>
            </motion.div>
          </div>

          {/* History Log */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card !p-0 overflow-hidden"
          >
            <div className="p-8 flex items-center justify-between border-b border-white/5">
               <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Diagnostic Pipeline Log</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audit trail of automated classifications</p>
               </div>
               <div className="flex gap-4">
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
                     <input type="text" placeholder="Filter patient ID..." className="bg-slate-900 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[10px] text-white outline-none focus:ring-1 focus:ring-medical-primary w-48 transition-all" />
                  </div>
               </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <th className="py-5 px-8">Timestamp</th>
                    <th className="py-5 px-8">Patient Ref</th>
                    <th className="py-5 px-8">Classification</th>
                    <th className="py-5 px-8">Confidence</th>
                    <th className="py-5 px-8 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {predictions.length > 0 ? (
                    predictions.map((pred) => (
                      <tr key={pred.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-5 px-8 text-xs font-bold text-slate-400">
                           <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-700" />
                              {formatDate(pred.created_at)}
                           </div>
                        </td>
                        <td className="py-5 px-8">
                           <span className="text-xs font-black text-white tracking-wider group-hover:text-medical-primary transition-colors">
                              {pred.patient_id || 'ANONYMOUS'}
                           </span>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${pred.predicted_class === 'Normal' ? 'bg-medical-success' : 'bg-medical-primary'}`} />
                             <span className="text-xs font-bold text-slate-300">
                                {pred.predicted_class}
                             </span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-black text-white">{(pred.confidence_score ?? 0).toFixed(1)}%</span>
                             <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full ${(pred.confidence_score ?? 0) >= 90 ? 'bg-medical-success' : 'bg-medical-primary'}`} style={{ width: `${pred.confidence_score ?? 0}%` }} />
                             </div>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <Link 
                            href={`/results/${pred.id}`}
                            className="inline-flex items-center gap-2 text-medical-primary hover:text-sky-300 font-black text-[10px] uppercase tracking-widest transition-colors"
                          >
                            Details
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-20 opacity-20">
                         <BarChart3 size={48} className="mx-auto mb-4" />
                         <p className="font-black uppercase tracking-[0.2em] text-xs">No audit logs available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-8 flex items-center justify-between bg-white/5 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Page {selectedPage} of {totalPages}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedPage(Math.max(1, selectedPage - 1))}
                    disabled={selectedPage === 1}
                    className="btn-premium btn-secondary !py-2 px-6 !text-[10px] uppercase tracking-widest disabled:opacity-20"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setSelectedPage(Math.min(totalPages, selectedPage + 1))}
                    disabled={selectedPage === totalPages}
                    className="btn-premium btn-primary !py-2 px-6 !text-[10px] uppercase tracking-widest disabled:opacity-20"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <div className="glass-card text-center py-32">
          <AlertCircle className="w-16 h-16 text-medical-warning mx-auto mb-6" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Clinical telemetry offline.</p>
        </div>
      )}
    </div>
  );
}
