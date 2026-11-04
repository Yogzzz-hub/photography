import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVaultStore } from '../../stores/useVaultStore';

export function ParticleStarfield({ count = 800 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const theme = useVaultStore((s) => s.theme);
  const isLight = theme === 'light';

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const colorA = isLight ? new THREE.Color('#D97706') : new THREE.Color('#A78BFA'); // Warm gold vs Soft violet
    const colorB = isLight ? new THREE.Color('#B48328') : new THREE.Color('#38BDF8'); // Antique amber vs Light cyan
    const colorC = isLight ? new THREE.Color('#64748B') : new THREE.Color('#FFFFFF'); // Slate dust vs Starlight white

    for (let i = 0; i < count; i++) {
      // Distributed in a sphere shell surrounding the universe
      const r = 18 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const choice = Math.random();
      const chosenColor = choice < 0.4 ? colorA : choice < 0.7 ? colorB : colorC;
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }

    return [pos, col];
  }, [count, isLight]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
      pointsRef.current.rotation.x += delta * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isLight ? 0.09 : 0.12}
        vertexColors
        transparent
        opacity={isLight ? 0.35 : 0.65}
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
