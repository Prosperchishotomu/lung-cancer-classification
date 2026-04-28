'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'primary' | 'success' | 'warning' | 'error' | 'accent';
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color }: StatCardProps) {
  const colorMap = {
    primary: 'text-medical-primary bg-medical-primary/10 border-medical-primary/20 shadow-medical-primary/10',
    success: 'text-medical-success bg-medical-success/10 border-medical-success/20 shadow-medical-success/10',
    warning: 'text-medical-warning bg-medical-warning/10 border-medical-warning/20 shadow-medical-warning/10',
    error: 'text-medical-error bg-medical-error/10 border-medical-error/20 shadow-medical-error/10',
    accent: 'text-medical-accent bg-medical-accent/10 border-medical-accent/20 shadow-medical-accent/10',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className="glass-card flex flex-col justify-between group"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</span>
        <div className={`p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110 ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      
      <div>
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black text-white tracking-tight">{value}</h4>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-medical-success/10 text-medical-success' : 'bg-medical-error/10 text-medical-error'}`}>
              {trend.isPositive ? '+' : '-'}{trend.value}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{subtitle}</p>
      </div>
      
      {/* Decorative glow */}
      <div className={`absolute -bottom-8 -right-8 w-16 h-16 rounded-full blur-[30px] opacity-20 ${color === 'primary' ? 'bg-medical-primary' : color === 'success' ? 'bg-medical-success' : 'bg-medical-warning'}`} />
    </motion.div>
  );
}
