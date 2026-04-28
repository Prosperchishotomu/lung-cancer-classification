'use client';
import { User } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#020617] text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-4 gap-8 mb-6">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-xl border border-blue-500/20">
                  🫁
               </div>
               <div className="flex flex-col">
                  <h3 className="font-extrabold text-sm tracking-tight leading-none">LUNG CANCER</h3>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Diagnostic System</p>
               </div>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed max-w-xs">
              Advanced decision support utilizing dual-stage ResNet-50 features for precision oncological classification.
            </p>
            <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 group hover:border-medical-primary/30 transition-all">
               <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-medical-primary transition-colors">
                  <User size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Clinical Lead</p>
                  <p className="text-xs font-bold text-white tracking-tight">Prosper T Chishotomu</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1">Lead AI Researcher</p>
               </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Platform</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><a href="#" className="hover:text-blue-400 transition">Clinical Features</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Security & Zimbabwe Health Standards</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">API Access</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Support</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><a href="#" className="hover:text-blue-400 transition">Documentation</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">System Status</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Contact Bio-Oncology</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Institutional</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><a href="#" className="hover:text-blue-400 transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-blue-400 transition">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <p>&copy; {currentYear} LungScan AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Research Use Only
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                ZimData Compliant
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
