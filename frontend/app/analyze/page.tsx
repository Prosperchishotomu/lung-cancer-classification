'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePredictionStore } from '@/lib/store';
import { PatientPayload, apiClient } from '@/lib/api';
import { resizeImageForUpload } from '@/lib/image-utils';
import Image from 'next/image';
import { 
  Upload, 
  CheckCircle, 
  Loader, 
  Activity, 
  Shield, 
  Microscope,
  Zap,
  ChevronRight,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useDeferredMount } from '@/lib/use-deferred-mount';

const ThreeDAnalysisChamber = dynamic(() => import('@/components/visuals/ThreeDAnalysisChamber'), { 
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-slate-950 rounded-3xl animate-pulse" />
});

interface PredictionResult {
  success: boolean;
  prediction_id?: string;
  predicted_class: string;
  confidence_score: number;
  probabilities: Array<{ class: string; probability: number }>;
  heatmap?: string;
  interpretation?: string;
  justification?: string;
  message?: string;
  error?: string;
  patient_id?: string;
  patient_name?: string;
  episode_number?: number;
}

interface Patient {
  patient_id: string;
  patient_name: string;
  full_name?: string;
  date_of_birth?: string | null;
  sex?: string;
  phone?: string | null;
  scan_count?: number;
  episode_count?: number;
}

const ANALYSIS_STAGES = [
  "Initializing Secure Pipeline",
  "Normalizing Image Histograms",
  "Segmenting Lung Field",
  "Extracting Deep Texture Features",
  "Generating Heatmap Distribution",
  "Finalizing AI Inference Report"
];

export default function AnalyzePage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const { addPrediction, setCurrentPrediction } = usePredictionStore();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  
  const [patientMode, setPatientMode] = useState<'new' | 'returning'>('new');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [episodeReason, setEpisodeReason] = useState('CT analysis');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const showAnalysisChamber = useDeferredMount();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    apiClient.getPatients()
      .then((data) => setPatients(data))
      .catch(() => setPatients([]));
  }, [hasHydrated, isAuthenticated]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type. Please upload a medical image.');
      return;
    }

    setResult(null);
    setProgress(0);
    setCurrentStage(0);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const resized = await resizeImageForUpload(file);
    setImageFile(resized);
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      toast.error('Please select a scan image first');
      return;
    }

    const patientPayload = buildPatientPayload();
    if (!patientPayload) return;

    setIsLoading(true);
    setResult(null);
    setProgress(0);
    setCurrentStage(0);

    // Simulated progress for visual impact
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98;
        }
        const next = prev + Math.random() * 5;
        setCurrentStage(Math.floor((next / 100) * ANALYSIS_STAGES.length));
        return next;
      });
    }, 400);

    try {
      const response = await apiClient.predictWithHeatmap(imageFile, patientPayload);

      clearInterval(interval);
      setProgress(100);
      setCurrentStage(ANALYSIS_STAGES.length - 1);

      if (response.success) {
        setResult(response);
        toast.success('AI Analysis Completed');

        const prediction = {
          id: response.prediction_id,
          patient_id: response.patient_id,
          patient_name: response.patient_name,
          predicted_class: response.predicted_class,
          confidence_score: response.confidence_score,
          probabilities: response.probabilities.reduce((acc: any, p: any) => {
            acc[p.class] = p.probability;
            return acc;
          }, {}),
          is_uncertain: response.confidence_score < 70,
          created_at: new Date().toISOString(),
        };

        addPrediction(prediction);
        setCurrentPrediction(prediction);
      } else {
        toast.error(response.error || 'Pipeline execution failed');
      }
    } catch (error: any) {
      clearInterval(interval);
      const errorMsg = error.response?.data?.error || 'Analysis failed. System error.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const buildPatientPayload = (): PatientPayload | null => {
    if (patientMode === 'returning') {
      const selected = patients.find((patient) => patient.patient_id === selectedPatientId);
      if (!selected) {
        toast.error('Select a registered patient first');
        return null;
      }
      return {
        patient_id: selected.patient_id,
        patient_name: selected.patient_name || selected.full_name,
        episode_reason: episodeReason,
      };
    }

    if (!patientName.trim()) {
      toast.error('Patient name is mandatory');
      return null;
    }

    return {
      patient_name: patientName.trim(),
      date_of_birth: dateOfBirth,
      sex,
      phone: phone.trim(),
      national_id: nationalId.trim(),
      episode_reason: episodeReason,
    };
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setProgress(0);
    setCurrentStage(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Medical <span className="text-medical-primary">Analysis Chamber</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Neural classification pipeline for NSCLC diagnosis assistance.</p>
        </div>
        <div className="badge-clinical bg-medical-primary/10 border-medical-primary/20 text-medical-primary flex items-center gap-2">
          <Shield size={14} />
          <span>Clinical Decision Support Only</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Main 3D Chamber Container */}
          <div className="relative">
             {showAnalysisChamber ? (
               <ThreeDAnalysisChamber
                 isAnalyzing={isLoading}
                 imagePreview={imagePreview}
                 progress={progress}
               />
             ) : (
               <div className="w-full h-[500px] relative rounded-3xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl animate-pulse" />
             )}
             
             {/* Progress Overlay (Mobile/Alt) */}
             {isLoading && (
                <div className="absolute top-6 right-6 glass-card !bg-slate-950/80 !p-4 border-white/10 min-w-[200px] hidden md:block">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Active Stage</p>
                   <p className="text-xs font-bold text-white mb-3">{ANALYSIS_STAGES[currentStage]}</p>
                   <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-medical-primary shadow-[0_0_8px_#0ea5e9]"
                        animate={{ width: `${progress}%` }}
                      />
                   </div>
                </div>
             )}
          </div>

          {/* Controls & Inputs */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Image Source</h3>
                  {imagePreview && (
                     <button onClick={handleReset} className="text-slate-500 hover:text-medical-error transition-colors">
                        <RefreshCw size={16} />
                     </button>
                  )}
               </div>
               
               {!imagePreview ? (
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                    className={`
                      border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
                      ${isDragging ? 'border-medical-primary bg-medical-primary/5 scale-[0.98]' : 'border-white/5 hover:border-white/10 hover:bg-white/5'}
                    `}
                  >
                     <Upload className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                     <p className="text-sm font-bold text-white mb-1">Drop DICOM/JPG scan here</p>
                     <p className="text-xs text-slate-500 mb-6 font-medium">Max resolution 4096px - 20MB</p>
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-premium btn-secondary py-2 px-6 text-[10px] uppercase tracking-widest"
                     >
                        Browse Files
                     </button>
                     <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                  </div>
               ) : (
                  <div className="relative h-48 rounded-2xl overflow-hidden border border-white/5 group">
                     <Image
                       src={imagePreview}
                       alt="Selected CT scan preview"
                       fill
                       unoptimized
                       sizes="(max-width: 768px) 100vw, 50vw"
                       className="object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-950 flex items-end p-4">
                        <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Metadata</p>
                           <p className="text-xs font-bold text-white">{imageFile?.name}</p>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            <div className="glass-card space-y-6">
               <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Clinical Context</h3>
                  <div className="bg-slate-900 border border-white/5 p-1 rounded-xl flex">
                    <button onClick={() => setPatientMode('new')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${patientMode === 'new' ? 'bg-medical-primary text-white' : 'text-slate-500'}`}>New</button>
                    <button onClick={() => setPatientMode('returning')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${patientMode === 'returning' ? 'bg-medical-primary text-white' : 'text-slate-500'}`}>Returning</button>
                  </div>
               </div>
               <div className="space-y-4">
                  {patientMode === 'returning' ? (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Registered Patient</label>
                      <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="input-field !py-2.5 text-sm">
                        <option value="">Select patient</option>
                        {patients.map((patient) => (
                          <option key={patient.patient_id} value={patient.patient_id}>
                            {patient.patient_id} - {patient.patient_name || patient.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Patient Name</label>
                        <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Jane Doe" className="input-field !py-2.5 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                          <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="input-field !py-2.5 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Sex</label>
                          <select value={sex} onChange={(e) => setSex(e.target.value)} className="input-field !py-2.5 text-sm">
                            <option value="">Not specified</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="input-field !py-2.5 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">National ID</label>
                          <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="Optional" className="input-field !py-2.5 text-sm" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Episode Reason</label>
                    <input type="text" value={episodeReason} onChange={(e) => setEpisodeReason(e.target.value)} placeholder="e.g. Follow-up CT" className="input-field !py-2.5 text-sm" />
                  </div>
               </div>
               
               <button 
                  onClick={handleAnalyze}
                  disabled={isLoading || !imageFile}
                  className="w-full btn-premium btn-primary py-4 mt-2 disabled:opacity-30 disabled:pointer-events-none group"
               >
                  <div className="flex items-center justify-center gap-3">
                     {isLoading ? (
                        <Loader className="w-5 h-5 animate-spin" />
                     ) : (
                        <Zap className="w-5 h-5 group-hover:fill-current transition-all" />
                     )}
                     <span className="text-xs font-black uppercase tracking-[0.2em]">
                        {isLoading ? 'Processing Pipeline' : 'Initiate AI Inference'}
                     </span>
                  </div>
               </button>
            </div>
          </div>

          {/* Results Reveal */}
          <AnimatePresence>
             {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card border-l-4 border-l-medical-primary !p-10 space-y-10"
                >
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <CheckCircle className="text-medical-success" size={24} />
                            <h2 className="text-3xl font-black text-white tracking-tight">Classification Report</h2>
                         </div>
                         <p className="text-slate-500 text-sm font-medium">AI analysis successfully extracted features from the provided scan.</p>
                      </div>
                      <div className="flex gap-3">
                         <button className="p-4 bg-slate-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors">
                            <Download size={20} />
                         </button>
                         <Link 
                            href={`/results/${result.prediction_id}`} 
                            className="btn-premium btn-primary py-4 px-8 text-xs font-black uppercase tracking-widest flex items-center gap-3"
                         >
                            View Deep Results
                            <ChevronRight size={18} />
                         </Link>
                      </div>
                   </div>

                   <div className="grid md:grid-cols-3 gap-8">
                      <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={60} />
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Predicted Subtype</p>
                        <h4 className="text-2xl font-black text-medical-primary">{result.predicted_class}</h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-3">{result.patient_id} Episode {result.episode_number}</p>
                      </div>
                      
                      <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 relative overflow-hidden group">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Confidence Score</p>
                         <h4 className="text-2xl font-black text-white">{result.confidence_score.toFixed(2)}%</h4>
                         <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-medical-primary" style={{ width: `${result.confidence_score}%` }} />
                         </div>
                      </div>

                      <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 relative overflow-hidden group">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Risk Evaluation</p>
                         <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${result.confidence_score < 70 ? 'bg-medical-warning shadow-[0_0_8px_#f59e0b]' : 'bg-medical-success shadow-[0_0_8px_#10b981]'}`} />
                            <h4 className="text-2xl font-black text-white">{result.confidence_score < 70 ? 'Moderate' : 'High Accuracy'}</h4>
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass-card bg-gradient-to-br from-medical-primary to-medical-secondary text-white !p-8 relative overflow-hidden group">
              <Zap className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-3">
                 <Microscope size={24} />
                 Model Logic
              </h3>
              <p className="text-sm font-medium leading-relaxed text-sky-100 mb-6">
                 Our ResNet-50 backbone is specifically tuned for lung textural patterns, analyzing micro-calcifications and vascular patterns across the tumor boundary.
              </p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Latency</p>
                    <p className="text-sm font-black">~1.2s</p>
                 </div>
                 <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Architecture</p>
                    <p className="text-sm font-black">Deep-CNN</p>
                 </div>
              </div>
           </div>

           <div className="glass-card space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                 <FileText size={18} className="text-medical-primary" />
                 Diagnostic Protocol
              </h3>
              <ul className="space-y-4">
                 {[
                   'Contrast-enhanced preferred',
                   'DICOM 3.0 Standard metadata',
                   'Minimal motion artifacts',
                   'Axial slice orientation'
                 ].map((step, i) => (
                    <li key={i} className="flex items-start gap-4 text-xs font-bold text-slate-400 group">
                       <div className="w-5 h-5 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[10px] text-medical-primary group-hover:border-medical-primary transition-colors">
                          {i + 1}
                       </div>
                       {step}
                    </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
   }
