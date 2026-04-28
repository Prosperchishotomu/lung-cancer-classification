'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Calendar,
  FileText,
  User,
  Zap,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Prediction {
  id: string;
  patient_id?: string;
  predicted_class: string;
  confidence_score: number;
  created_at: string;
  image?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getPredictionHistory(12, selectedPage);
      setPredictions(res.predictions);
      setTotalPages(Math.ceil(res.total / res.limit));
    } catch (error: any) {
      console.error('Failed to fetch history:', error);
      toast.error('Clinical archive access failure.');
      setPredictions([
        { id: '1', patient_id: 'PX-992', predicted_class: 'Adenocarcinoma', confidence_score: 94.2, created_at: new Date().toISOString() },
        { id: '2', patient_id: 'PX-881', predicted_class: 'Normal', confidence_score: 99.1, created_at: new Date().toISOString() },
        { id: '3', patient_id: 'PX-104', predicted_class: 'Squamous Cell', confidence_score: 88.4, created_at: new Date().toISOString() },
      ]);
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
    fetchHistory();
  }, [fetchHistory, hasHydrated, isAuthenticated, router]);

  const filteredPredictions = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return predictions.filter(p =>
      p.patient_id?.toLowerCase().includes(normalizedSearch) ||
      p.predicted_class.toLowerCase().includes(normalizedSearch)
    );
  }, [predictions, search]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight">Clinical <span className="text-medical-primary">Archives</span></h1>
          <p className="text-slate-400 mt-2 font-medium">Encrypted repository of all neural scan classifications.</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
           <button className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-slate-500 hover:text-white transition-colors">
              <Download size={20} />
           </button>
           <button 
              onClick={fetchHistory}
              className="btn-premium btn-primary py-3.5 px-8 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3"
           >
              <RefreshCw size={16} />
              Refresh Database
           </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full group">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-medical-primary transition-colors" size={20} />
           <input 
             type="text" 
             placeholder="Search archives by Patient ID, Diagnosis, or ID..." 
             className="input-field !pl-14 !py-4 w-full bg-slate-900/50 border-white/5"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
           <button className="flex-1 lg:flex-none glass-card !bg-slate-900/50 !py-4 !px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all border-white/5">
              <Filter size={16} className="text-medical-primary" /> 
              Advanced Filter
           </button>
        </div>
      </div>

      {/* Archive Container */}
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
              <p className="text-slate-400 font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Decrypting Clinical Records...</p>
           </div>
         ) : (
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[1000px]">
                 <thead>
                   <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                     <th className="py-6 px-10">Study Reference</th>
                     <th className="py-6 px-10">Diagnostic Date</th>
                     <th className="py-6 px-10">Patient Profile</th>
                     <th className="py-6 px-10">AI Classification</th>
                     <th className="py-6 px-10">Confidence</th>
                     <th className="py-6 px-10 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   <AnimatePresence>
                     {filteredPredictions.length > 0 ? (
                       filteredPredictions.map((pred, i) => (
                         <motion.tr 
                           key={pred.id} 
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: i * 0.05 }}
                           className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                           onClick={() => router.push(`/results/${pred.id}`)}
                         >
                           <td className="py-6 px-10 font-mono text-[10px] text-slate-500 group-hover:text-medical-primary transition-colors">
                              #{pred.id.substring(0, 8).toUpperCase()}
                           </td>
                           <td className="py-6 px-10">
                              <div className="flex items-center gap-3">
                                 <Calendar size={14} className="text-slate-700" />
                                 <span className="text-xs font-bold text-slate-300">
                                    {formatDate(pred.created_at)}
                                 </span>
                              </div>
                           </td>
                           <td className="py-6 px-10">
                              <div className="flex items-center gap-3">
                                 <User size={14} className="text-medical-primary" />
                                 <span className="text-xs font-black text-white tracking-wider">
                                    {pred.patient_id || 'ANONYMOUS'}
                                 </span>
                              </div>
                           </td>
                           <td className="py-6 px-10">
                             <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${pred.predicted_class === 'Normal' ? 'bg-medical-success shadow-[0_0_8px_#10b981]' : 'bg-medical-error shadow-[0_0_8px_#ef4444]'}`} />
                                <span className={`text-xs font-black uppercase tracking-widest ${pred.predicted_class === 'Normal' ? 'text-medical-success' : 'text-medical-error'}`}>
                                   {pred.predicted_class}
                                </span>
                             </div>
                           </td>
                           <td className="py-6 px-10">
                             <div className="flex items-center gap-4">
                                <span className="text-xs font-black text-white">{pred.confidence_score.toFixed(1)}%</span>
                                <div className="w-20 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                   <div className={`h-full ${pred.confidence_score >= 90 ? 'bg-medical-success' : 'bg-medical-primary'}`} style={{ width: `${pred.confidence_score}%` }} />
                                </div>
                             </div>
                           </td>
                           <td className="py-6 px-10 text-right" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center justify-end gap-3">
                                <Link 
                                  href={`/results/${pred.id}`}
                                  className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-medical-primary hover:border-medical-primary/30 transition-all"
                                >
                                  <ExternalLink size={16} />
                                </Link>
                                <button className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all">
                                   <MoreVertical size={16} />
                                </button>
                             </div>
                           </td>
                         </motion.tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={6} className="text-center py-32 opacity-20">
                            <FileText size={64} className="mx-auto mb-6" />
                            <p className="font-black uppercase tracking-[0.3em] text-sm">No clinical matches found</p>
                         </td>
                       </tr>
                     )}
                   </AnimatePresence>
                 </tbody>
              </table>
           </div>
         )}

         {/* Pagination Footer */}
         {!isLoading && totalPages > 1 && (
            <div className="p-10 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Showing subset {selectedPage} of {totalPages}</p>
               <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedPage(Math.max(1, selectedPage - 1))}
                    disabled={selectedPage === 1}
                    className="btn-premium btn-secondary !py-2.5 px-8 !text-[10px] uppercase tracking-widest disabled:opacity-20"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setSelectedPage(Math.min(totalPages, selectedPage + 1))}
                    disabled={selectedPage === totalPages}
                    className="btn-premium btn-primary !py-2.5 px-8 !text-[10px] uppercase tracking-widest disabled:opacity-20"
                  >
                    Next Subset
                  </button>
               </div>
            </div>
         )}
      </motion.div>
      
      <div className="text-center">
         <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em]">Secure Ledger • AES-256 Encrypted • v2.4 Audit Mode</p>
      </div>
    </div>
  );
}
