import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LungScan - CT-Based Lung Cancer Classification',
  description: 'Production-grade AI-powered CT scan analysis for lung cancer classification',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

import AppShell from '@/components/AppShell';
import { Toaster } from 'react-hot-toast';

import dynamic from 'next/dynamic';

const BackgroundVisual = dynamic(() => import('@/components/visuals/BackgroundVisual'), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-950 -z-10" />
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#1E3A8A" />
      </head>
      <body className="bg-medical-bg-dark text-medical-text-primary antialiased overflow-x-hidden">
        <BackgroundVisual />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              fontSize: '12px',
              fontWeight: '600',
              padding: '12px 20px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                borderLeft: '4px solid #10b981',
              }
            },
            error: {
              iconTheme: {
                primary: '#f43f5e',
                secondary: '#fff',
              },
              style: {
                borderLeft: '4px solid #f43f5e',
              }
            }
          }}
        />
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

