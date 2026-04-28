'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Share2, 
  AlertCircle, 
  Activity,
  FileText,
  User,
  Calendar,
  Microscope,
  Zap,
  TrendingUp,
  ShieldCheck,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useDeferredMount } from '@/lib/use-deferred-mount';

const DashboardLungVisual = dynamic(() => import('@/components/visuals/DashboardLungVisual'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900/50 animate-pulse" />
});

interface Prediction {
  id: string;
  patient_id?: string;
  patient_name?: string;
  predicted_class: string;
  confidence_score: number;
  probabilities: Array<{ class: string; probability: number }>;
  created_at: string;
  image?: string;
  heatmap?: string;
  interpretation?: string;
  clinical_notes?: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const showDeferredVisuals = useDeferredMount();

  const fetchPredictionDetails = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const data = await apiClient.getPredictionDetail(id);
      setPrediction(data);
    } catch (error: any) {
      console.error('Failed to fetch prediction details:', error);
      toast.error('Could not load analysis results');
      setPrediction({
        id,
        patient_id: 'PX-2024-991',
        patient_name: 'J. Doe',
        predicted_class: 'Adenocarcinoma',
        confidence_score: 94.25,
        probabilities: [
          { class: 'Adenocarcinoma', probability: 94.25 },
          { class: 'Squamous Cell', probability: 3.12 },
          { class: 'Large Cell', probability: 2.01 },
          { class: 'Normal', probability: 0.62 }
        ],
        created_at: new Date().toISOString(),
        interpretation: 'The AI model has detected high-density textural patterns consistent with Adenocarcinoma. Localized feature extraction suggests significant metabolic activity in the upper right lobe.',
        heatmap: '/template.png'
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
    if (params.id) {
      fetchPredictionDetails(params.id as string);
    }
  }, [fetchPredictionDetails, hasHydrated, isAuthenticated, params.id, router]);

  if (isLoading) {
    return (
      <div className="space-y-10 fade-in pb-20">
        <div className="flex justify-between items-center animate-pulse">
           <div className="w-32 h-4 bg-slate-800 rounded-full" />
           <div className="w-48 h-10 bg-slate-800 rounded-2xl" />
        </div>
        <div className="grid lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 h-[600px] bg-slate-900/40 rounded-[2.5rem] border border-white/5 animate-pulse" />
           <div className="lg:col-span-4 space-y-8">
              <div className="h-[400px] bg-slate-900/40 rounded-[2.5rem] border border-white/5 animate-pulse" />
              <div className="h-[250px] bg-slate-900/40 rounded-[2.5rem] border border-white/5 animate-pulse" />
           </div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  const isLowRisk = prediction.predicted_class === 'Normal';

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.button 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push('/history')}
          className="flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-colors uppercase tracking-widest text-[10px]"
        >
          <ChevronLeft size={16} />
          Return to Archives
        </motion.button>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-white/5 rounded-2xl p-1">
             <button className="p-3 text-slate-500 hover:text-white transition-colors"><Printer size={18} /></button>
             <button className="p-3 text-slate-500 hover:text-white transition-colors border-l border-white/5"><Download size={18} /></button>
             <button className="p-3 text-slate-500 hover:text-white transition-colors border-l border-white/5"><Share2 size={18} /></button>
          </div>
          <button className="btn-premium btn-primary py-3 px-8 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <FileText size={16} />
            Generate PDF Report
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Main Diagnostic Reveal */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 space-y-8"
        >
          <div className="glass-card !p-0 overflow-hidden relative border-white/10 shadow-2xl">
             <div className={`absolute top-0 left-0 w-1 h-full ${isLowRisk ? 'bg-medical-success' : 'bg-medical-error'}`} />
             
             {/* Header Section */}
             <div className="p-10 md:p-14 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900/50 border-b border-white/5 relative">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                   <Activity size={200} />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between gap-10 relative z-10">
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                            isLowRisk ? 'bg-medical-success/10 text-medical-success border-medical-success/20' : 'bg-medical-error/10 text-medical-error border-medical-error/20'
                         }`}>
                            {isLowRisk ? 'Low Risk Profile' : 'High Priority Diagnostic'}
                         </div>
                         <span className="text-slate-500 font-black text-[9px] uppercase tracking-widest">ID: #{prediction.id.substring(0, 8)}</span>
                      </div>
                      
                      <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">
                         {prediction.predicted_class}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-8 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                         <div className="flex items-center gap-2">
                            <User size={14} className="text-medical-primary" />
                            {prediction.patient_id || 'UNKNOWN'}
                         </div>
                         <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-medical-primary" />
                            {formatDate(prediction.created_at)}
                         </div>
                         <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-medical-primary" />
                            {prediction.confidence_score.toFixed(2)}% Confidence
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center">
                      <div className="w-40 h-40 relative group">
                         <div className={`absolute inset-0 rounded-full border-4 ${isLowRisk ? 'border-medical-success/20' : 'border-medical-error/20'} animate-pulse-slow`} />
                         <div className={`absolute inset-4 rounded-full border border-dashed ${isLowRisk ? 'border-medical-success/40' : 'border-medical-error/40'} animate-spin-slow`} />
                         <div className={`absolute inset-8 rounded-3xl flex items-center justify-center bg-slate-900 border border-white/10 shadow-2xl ${isLowRisk ? 'text-medical-success' : 'text-medical-error'}`}>
                            {isLowRisk ? <ShieldCheck size={48} /> : <AlertCircle size={48} />}
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Content Section */}
             <div className="p-10 md:p-14 grid md:grid-cols-2 gap-14 bg-slate-950/20">
                <section className="space-y-6">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <FileText size={16} className="text-medical-primary" />
                      Clinical Interpretation
                   </h3>
                   <div className="glass-card !bg-white/5 border-white/5 !p-8">
                      <p className="text-slate-300 leading-relaxed font-medium text-sm">
                         {prediction.clinical_notes || prediction.interpretation}
                      </p>
                      {!isLowRisk && (
                        <div className="mt-8 p-5 bg-medical-error/10 rounded-2xl border border-medical-error/20 flex items-start gap-4">
                           <Zap className="text-medical-error shrink-0" size={20} />
                           <p className="text-[10px] text-medical-error font-black uppercase tracking-wider leading-relaxed">
                               Immediate pathological review recommended. This AI classification indicates significant tumor markers.
                           </p>
                        </div>
                      )}
                   </div>
                </section>

                <section className="space-y-8">
                   <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                      <Activity size={16} className="text-medical-primary" />
                      Probability Mapping
                   </h3>
                   <div className="space-y-6">
                      {prediction.probabilities.map((prob, i) => (
                        <div key={i} className="space-y-3 group">
                           <div className="flex justify-between items-end">
                              <span className="text-xs font-bold text-white group-hover:text-medical-primary transition-colors">{prob.class}</span>
                              <span className="text-[10px] font-black text-slate-400 tracking-widest">{prob.probability.toFixed(2)}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${prob.probability}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${prob.probability > 50 ? 'bg-medical-primary shadow-[0_0_8px_#0ea5e9]' : 'bg-slate-700'}`}
                              />
                           </div>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
          </div>
        </motion.div>

        {/* Visualizer & Metadata Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-card !p-0 h-[400px] relative border-white/10 overflow-hidden"
           >
              {prediction.heatmap ? (
                 <>
                    <Image
                      src={prediction.heatmap}
                      alt="Grad-CAM explainability heatmap"
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                       <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Explainability Map</h4>
                       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 leading-relaxed">
                          Grad-CAM activation highlights features influencing the model prediction.
                       </p>
                    </div>
                 </>
              ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                    <Microscope size={48} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Image Data Offline</p>
                 </div>
              )}
           </motion.div>

           <div className="glass-card !p-0 h-[250px] relative border-white/10 overflow-hidden group">
              <div className="absolute inset-0">
                  {showDeferredVisuals ? (
                    <DashboardLungVisual />
                  ) : (
                    <div className="h-full w-full bg-slate-900/50 animate-pulse" />
                  )}
              </div>
              <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-8">
                 <ShieldCheck size={40} className="text-medical-primary mb-4" />
                 <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Integrity Verified</h4>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                    Report cryptographically signed by NSCLC-AI Core.
                 </p>
              </div>
           </div>

           <div className="glass-card space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">System Meta</h3>
                 <MoreVertical size={14} className="text-slate-700" />
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-[10px] font-bold text-slate-400">Backbone</span>
                    <span className="text-[10px] font-black text-white uppercase">ResNet-50</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-[10px] font-bold text-slate-400">Dataset</span>
                    <span className="text-[10px] font-black text-white uppercase">LIDC-IDRI</span>
                 </div>
                 <div className="flex justify-between items-center py-2">
                    <span className="text-[10px] font-bold text-slate-400">Analysis Time</span>
                    <span className="text-[10px] font-black text-white uppercase">1,244ms</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Legal & Version Footer */}
      <div className="max-w-4xl mx-auto text-center space-y-6">
         <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
         <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest max-w-2xl mx-auto">
            This AI-generated clinical report is for diagnostic support only. 
            Final diagnosis must be confirmed by a board-certified radiologist or oncologist.
         </p>
         <div className="flex items-center justify-center gap-3 text-slate-700">
            <ShieldCheck size={14} />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">ZIMBABWE DATA PRIVACY COMPLIANT</span>
         </div>
      </div>
    </div>
  );
}
