'use client';

import { Canvas } from '@react-three/fiber';
import LungModelViewer from './LungModelViewer';

export default function DashboardLungVisual() {
  return (
    <Canvas dpr={[1, 1.25]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <LungModelViewer particleCount={180} />
    </Canvas>
  );
}
