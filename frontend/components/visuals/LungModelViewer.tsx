'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function LungShape({ position, rotation, color }: { position: [number, number, number], rotation: [number, number, number], color: string }) {
  return (
    <group position={position} rotation={rotation}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Sphere args={[1, 32, 32]} scale={[1, 1.5, 0.8]}>
          <MeshDistortMaterial
            color={color}
            speed={3}
            distort={0.2}
            radius={1}
            transparent
            opacity={0.3}
            roughness={0}
            metalness={1}
          />
        </Sphere>
        {/* Wireframe overlay */}
        <Sphere args={[1.02, 32, 32]} scale={[1, 1.5, 0.8]}>
          <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
        </Sphere>
      </Float>
    </group>
  );
}

function ParticleCloud({ count = 500 }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = (Math.random() - 0.5) * 10;
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, [count]);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <Points ref={pointsRef} positions={points} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#0ea5e9"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
      />
    </Points>
  );
}

export default function LungModelViewer({ particleCount = 260 }: { particleCount?: number }) {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#0ea5e9" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
      
      {/* Left Lung */}
      <LungShape position={[-1.2, 0, 0]} rotation={[0, 0, 0.2]} color="#0ea5e9" />
      
      {/* Right Lung */}
      <LungShape position={[1.2, 0, 0]} rotation={[0, 0, -0.2]} color="#0ea5e9" />
      
      <ParticleCloud count={particleCount} />
    </group>
  );
}
