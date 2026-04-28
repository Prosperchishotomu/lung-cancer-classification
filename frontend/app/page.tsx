'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import Footer from '@/components/AppFooter';
import Image from 'next/image';
import { Activity, Cpu, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
           {/* Background Template */}
           <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.48)_0%,rgba(2,6,23,0.72)_62%,rgba(2,6,23,1)_100%)]"></div>
           </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-400/20 rounded-xl">
                   <Shield className="text-sky-300 w-5 h-5" />
                   <span className="text-sm font-bold text-sky-200">Production-Ready AI Diagnostic Shell</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
                  Precision <span className="text-sky-300">CT Analysis</span> <br/>
                  Powered by AI.
                </h1>
                
                <p className="text-xl text-slate-300 max-w-lg leading-relaxed">
                  A clinical decision support system utilizing deep learning to classify lung CT scans with over 95% accuracy.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {hasHydrated && isAuthenticated ? (
                    <Link href="/dashboard" className="btn-premium btn-primary px-10 py-4 text-lg">
                      Enter Clinician Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="btn-premium btn-primary px-10 py-4 text-lg">
                        Get Started Now
                      </Link>
                      <Link href="/register" className="px-10 py-4 rounded-xl border border-white/10 font-bold text-slate-100 hover:bg-white/5 hover:border-sky-300/30 transition-colors text-center">
                        Create Account
                      </Link>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-400">
                   <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> ZIMDATA COMPLIANT</div>
                   <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> DICOM SUPPORT</div>
                   <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> GRAD-CAM READY</div>
                </div>
              </div>

              <div className="relative">
                 <div className="absolute inset-0 rounded-2xl border border-sky-300/10 translate-x-4 translate-y-4"></div>
                 <div className="glass-card !bg-slate-900/80 !border-white/10 p-4 relative z-10 scale-105 shadow-2xl shadow-slate-950/60">
                    <div className="rounded-xl overflow-hidden bg-medical-bg-dark h-80 flex items-center justify-center relative">
                       <Image
                         src="/template.png"
                         alt="CT scan preview"
                         fill
                         priority
                         sizes="(max-width: 1024px) 100vw, 50vw"
                         className="object-cover opacity-80"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                       <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-white text-xs font-bold">LIVE AI SCANNER</span>
                          </div>
                          <span className="text-white/70 text-[10px] font-mono">NODE_RESNET50_V2</span>
                       </div>
                    </div>
                    
                    <div className="mt-6 space-y-4 px-2">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase">Diagnosis Probability</span>
                          <span className="text-xs font-bold text-sky-300">98.4% Confidence</span>
                       </div>
                       <div className="space-y-3">
                          {[
                            { label: 'Normal / Benign', val: 98, color: 'bg-green-500' },
                            { label: 'Adenocarcinoma', val: 1.2, color: 'bg-gray-200' },
                            { label: 'Squamous Cell', val: 0.8, color: 'bg-gray-200' }
                          ].map((item) => (
                            <div key={item.label} className="space-y-1">
                               <div className="flex justify-between text-[10px] font-bold text-slate-300">
                                  <span>{item.label}</span>
                                  <span>{item.val}%</span>
                               </div>
                               <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                  <div className={`h-full ${item.color} rounded-full`} style={{width: `${item.val}%`}}></div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-[#07111f] relative border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
               <h2 className="text-4xl font-extrabold text-white">The Future of Radiology.</h2>
               <p className="text-lg text-slate-300">Built by clinical experts, for clinical experts. Our platform bridges the gap between raw data and actionable insights.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Cpu,
                  title: 'ResNet-50 AI',
                  description: 'Deep feature extraction specifically tuned for thoracic CT volumes.',
                },
                {
                  icon: Shield,
                  title: 'ZimData Secure',
                  description: 'End-to-end encryption and anonymization for patient data safety.',
                },
                {
                  icon: Activity,
                  title: 'Explainable AI',
                  description: 'Grad-CAM heatmaps highlight relevant pathology indicators for surgeons.',
                },
                {
                  icon: Zap,
                  title: 'Rapid Inference',
                  description: 'Near-instant classification with sub-800ms pipeline execution.',
                },
              ].map((feature, idx) => (
                <div key={idx} className="glass-card !bg-slate-900/70 !border-white/10 hover:!border-sky-300/30 transition-all group">
                  <div className="w-14 h-14 bg-sky-500/10 text-sky-300 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {hasHydrated && !isAuthenticated && (
          <section className="py-32 px-6 bg-slate-950">
             <div className="max-w-5xl mx-auto overflow-hidden relative rounded-2xl border border-sky-300/20 bg-[linear-gradient(135deg,#075985_0%,#1e3a8a_48%,#312e81_100%)] shadow-2xl shadow-slate-950/60">
                <div className="relative z-10 text-center py-12 px-6 space-y-8">
                   <h2 className="text-4xl font-extrabold text-white">Join the Next Generation <br/> of Medical Analysis.</h2>
                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/register" className="btn-premium bg-white text-slate-950 hover:bg-sky-50 px-12 py-4">
                        Register Account
                      </Link>
                      <Link href="/login" className="btn-premium border border-white/30 text-white hover:bg-white/10 px-12 py-4">
                        Clinician Login
                      </Link>
                   </div>
                   <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Authorized Clinical Personnel Only</p>
                </div>
             </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
