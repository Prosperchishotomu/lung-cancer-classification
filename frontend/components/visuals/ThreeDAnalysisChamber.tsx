'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Float, 
  PerspectiveCamera, 
  useTexture, 
  ContactShadows,
  Html,
} from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import LungModelViewer from './LungModelViewer';

function MedicalVolumetricScanner({ image, active }: { image: string | null, active: boolean }) {
  const texture = useTexture(image || '/template.png');
  const sliceGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (active && sliceGroupRef.current && ringRef.current) {
      // Slow, precise clinical rotation
      sliceGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
      // Slicing animation: move a "scanning ring" up and down
      ringRef.current.position.y = Math.sin(t * 1.2) * 1.8;
      // Occasional "data burst" flicker
      ringRef.current.scale.x = 1 + Math.sin(t * 10) * 0.02;
    }
  });

  // Create a "stack" of slices for volumetric feel
  const slices = useMemo(() => [
    { pos: [0, 0, 0], op: 1.0 },
    { pos: [0, 0, 0.1], op: 0.2 },
    { pos: [0, 0, -0.1], op: 0.2 },
  ], []);

  return (
    <group ref={sliceGroupRef}>
      {/* Precision Gantry Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.8} />
        <pointLight color="#0ea5e9" intensity={2} distance={5} />
      </mesh>

      {/* Volumetric Scan Stack */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        {slices.map((s, i) => (
          <mesh key={i} position={s.pos as [number, number, number]}>
            <planeGeometry args={[3, 3]} />
            <meshStandardMaterial 
              map={texture} 
              transparent 
              opacity={active ? s.op : (i === 0 ? 1 : 0)} 
              side={THREE.DoubleSide}
              emissive="#0ea5e9"
              emissiveIntensity={active ? 0.1 : 0}
            />
          </mesh>
        ))}
        {/* Bounds Box */}
        <mesh>
          <boxGeometry args={[3.2, 3.2, 0.5]} />
          <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.05} />
        </mesh>
      </Float>
    </group>
  );
}

export default function ThreeDAnalysisChamber({ 
  isAnalyzing, 
  imagePreview, 
  progress 
}: { 
  isAnalyzing: boolean, 
  imagePreview: string | null,
  progress: number 
}) {
  return (
    <div className="w-full h-[500px] relative rounded-3xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl">
      <Canvas dpr={[1, 1.25]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        
        <group position={[-2, 0, 0]}>
          <MedicalVolumetricScanner image={imagePreview} active={isAnalyzing} />
        </group>

        <group position={[2.5, 0, 0]} scale={0.8}>
          <LungModelViewer particleCount={180} />
        </group>

        {isAnalyzing && (
          <Html position={[0, -3.5, 0]} center>
            <div className="flex flex-col items-center gap-4 w-[400px]">
              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-medical-primary shadow-[0_0_10px_#0ea5e9]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between w-full">
                 <span className="text-[10px] font-bold text-medical-primary uppercase tracking-[0.2em]">Neural Processing</span>
                 <span className="text-[10px] font-bold text-white tracking-widest">{progress}%</span>
              </div>
            </div>
          </Html>
        )}

        <gridHelper args={[20, 20, '#0ea5e9', '#1e293b']} position={[0, -4.5, 0]} rotation={[0, 0, 0]} />
        <ContactShadows position={[0, -4.5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      </Canvas>

      <div className="absolute top-6 left-6 flex items-center gap-3">
         <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-medical-primary animate-pulse' : 'bg-slate-600'}`} />
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           {isAnalyzing ? 'Real-time AI Inference Active' : 'Chamber Standby'}
         </span>
      </div>
      
      {!imagePreview && !isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-600 text-sm uppercase tracking-[0.3em] font-bold">Waiting for Scan Data</p>
        </div>
      )}
    </div>
  );
}
