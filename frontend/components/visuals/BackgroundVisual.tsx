'use client';

import { usePathname } from 'next/navigation';

export default function BackgroundVisual() {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-0 pointer-events-none ${
        isLanding
          ? 'bg-[linear-gradient(135deg,#020617_0%,#07111f_52%,#0b1220_100%)]'
          : 'bg-slate-950'
      }`}
    >
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:56px_56px]" />
      {isLanding && (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.42)_58%,rgba(2,6,23,0.96)_100%)]" />
      )}
    </div>
  );
}
