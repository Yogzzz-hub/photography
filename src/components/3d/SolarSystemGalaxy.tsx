import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MemoryGlobe, Photo } from '../../types';
import { vaultAudio } from '../../services/audioSynthesizer';
import { ParticleStarfield } from './ParticleStarfield';
import { Globe, Sparkles, Plus, ExternalLink, ArrowRight, Eye } from 'lucide-react';

interface SolarSystemGalaxyProps {
  globes: MemoryGlobe[];
  activeGlobeId: string;
  photos: Photo[];
  onSelectPlanet: (globeId: string) => void;
  onOpenCreatePlanet: () => void;
  theme?: 'dark' | 'light';
}

const THEME_HEX: Record<string, string> = {
  gold: '#F59E0B',
  amethyst: '#A855F7',
  sapphire: '#0EA5E9',
  emerald: '#10B981',
  rose: '#F43F5E',
  amber: '#F97316',
};

// Orbiting Celestial Planet Sphere with Atmospheric Glow & HTML Tag
function CelestialPlanetMesh({
  globe,
  index,
  totalPlanets,
  photoCount,
  isSelected,
  onSelect,
}: {
  globe: MemoryGlobe;
  index: number;
  totalPlanets: number;
  photoCount: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const planetGroupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [isHovered, setIsHovered] = useState(false);

  // Compute Keplerian orbital radius and speed
  const orbitRadius = 9 + index * 5.2;
  const orbitSpeed = 0.08 / Math.sqrt(index + 1);
  const initialOffset = (index * (Math.PI * 2)) / totalPlanets;

  const planetColor = useMemo(() => {
    return globe.customColor || THEME_HEX[globe.themeColor] || '#F59E0B';
  }, [globe.customColor, globe.themeColor]);

  const hasRings = globe.type === 'milestone' || globe.type === 'group' || index % 2 === 1;

  // Frame-by-frame orbital mechanics and axial rotation
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const angle = t * orbitSpeed + initialOffset;

    if (planetGroupRef.current) {
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const y = Math.sin(angle * 2) * 0.75;
      planetGroupRef.current.position.set(x, y, z);
    }

    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.45;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.2;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.15;
    }
  });

  const planetRadius = isSelected ? 1.6 : isHovered ? 1.5 : 1.25;

  return (
    <group ref={planetGroupRef}>
      {/* Interactive Hit Box / Outer Glow */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
          vaultAudio.playHoverChime();
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Core Planet Sphere */}
        <mesh ref={sphereRef}>
          <sphereGeometry args={[planetRadius, 48, 48]} />
          <meshStandardMaterial
            color={planetColor}
            emissive={planetColor}
            emissiveIntensity={isHovered || isSelected ? 0.6 : 0.25}
            roughness={0.35}
            metalness={0.3}
          />
        </mesh>

        {/* Outer Atmospheric Glow Shield */}
        <mesh ref={atmosphereRef} scale={1.22}>
          <sphereGeometry args={[planetRadius, 32, 32]} />
          <meshStandardMaterial
            color={planetColor}
            emissive={planetColor}
            emissiveIntensity={0.4}
            transparent
            opacity={isHovered || isSelected ? 0.45 : 0.2}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Optional Planetary Ring System (e.g. Saturn-style) */}
        {hasRings && (
          <mesh ref={ringRef} rotation={[Math.PI / 3, 0.2, 0]}>
            <ringGeometry args={[planetRadius * 1.45, planetRadius * 2.3, 64]} />
            <meshStandardMaterial
              color={planetColor}
              emissive={planetColor}
              emissiveIntensity={0.35}
              transparent
              opacity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Floating Luxury 3D HTML Billboard Label */}
        <Html
          position={[0, planetRadius + 1.8, 0]}
          center
          distanceFactor={22}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`px-3 py-1.5 rounded-2xl backdrop-blur-xl border flex flex-col items-center gap-0.5 cursor-pointer transition-all duration-300 select-none ${
              isHovered || isSelected
                ? 'bg-black/90 scale-110 shadow-[0_0_25px_rgba(229,192,123,0.5)] border-vault-gold ring-2 ring-vault-gold/40'
                : 'bg-black/70 hover:bg-black/90 border-white/20 hover:border-vault-gold/60 shadow-lg'
            }`}
            style={{ minWidth: '130px' }}
          >
            <div className="flex items-center gap-1.5 w-full justify-between">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                style={{ backgroundColor: planetColor, boxShadow: `0 0 8px ${planetColor}` }}
              />
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-300">
                {globe.type}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-vault-gold">
                {photoCount}/108
              </span>
            </div>

            <div className="text-white font-serif font-bold text-xs tracking-wide truncate max-w-[140px] drop-shadow-md text-center mt-0.5">
              {globe.name}
            </div>

            <div className="flex items-center gap-1 text-[9px] text-vault-gold font-sans font-medium mt-0.5">
              <span>{isHovered ? 'Zoom Into Planet' : 'Click to Enter'}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// Visual Concentric Orbital Path Rings
function OrbitalPathRings({ count }: { count: number }) {
  const rings = useMemo(() => {
    return Array.from({ length: count }, (_, i) => 9 + i * 5.2);
  }, [count]);

  return (
    <group>
      {rings.map((r, i) => (
        <mesh key={`orbit_${i}`} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.05, r + 0.05, 128]} />
          <meshBasicMaterial
            color="#E5C07B"
            transparent
            opacity={0.18 + (i % 2 === 0 ? 0.08 : 0)}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Galactic Sun / Central Core
function GalacticSunCore() {
  const sunRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (sunRef.current) sunRef.current.rotation.y += delta * 0.1;
    if (coronaRef.current) coronaRef.current.rotation.z -= delta * 0.05;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Radiant Solar Core */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[3.2, 48, 48]} />
        <meshStandardMaterial
          color="#FFF7ED"
          emissive="#F59E0B"
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>

      {/* Atmospheric Corona Flare */}
      <mesh ref={coronaRef} scale={1.35}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshStandardMaterial
          color="#FBBF24"
          emissive="#D97706"
          emissiveIntensity={0.8}
          transparent
          opacity={0.35}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Point Light Radiating Across Solar System */}
      <pointLight color="#FFFBEB" intensity={3.5} distance={150} decay={1.2} />

      {/* Central Core Label */}
      <Html position={[0, -4.2, 0]} center distanceFactor={24}>
        <div className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-vault-gold/40 text-vault-gold text-[10px] font-mono uppercase tracking-widest text-center shadow-glow">
          Galactic Core • Genesis Vault
        </div>
      </Html>
    </group>
  );
}

// Camera Flight Controller for Cinematic Warp Fly-To
function SolarSystemCameraController({
  targetCoords,
  isFlying,
  controlsRef,
}: {
  targetCoords: [number, number, number] | null;
  isFlying: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    if (isFlying && targetCoords && controlsRef.current) {
      // Smoothly interpolate camera position toward target planet coordinates
      camera.position.lerp(
        new THREE.Vector3(targetCoords[0], targetCoords[1] + 1.2, targetCoords[2] + 4.5),
        0.08
      );
      controlsRef.current.target.lerp(
        new THREE.Vector3(targetCoords[0], targetCoords[1], targetCoords[2]),
        0.08
      );
      controlsRef.current.update();
    }
  });

  return null;
}

export function SolarSystemGalaxy({
  globes,
  activeGlobeId,
  photos,
  onSelectPlanet,
  onOpenCreatePlanet,
  theme = 'dark',
}: SolarSystemGalaxyProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number, number] | null>(null);
  const [isWarping, setIsWarping] = useState(false);
  const [warpingPlanetName, setWarpingPlanetName] = useState<string>('');
  const [warpingPlanetColor, setWarpingPlanetColor] = useState<string>('#F59E0B');

  const getGlobePhotoCount = (globeId: string) => {
    return photos.filter(
      (p) => !p.inTrash && (p.globeId === globeId || (!p.globeId && globeId === 'globe_main'))
    ).length;
  };

  const handlePlanetClick = (globe: MemoryGlobe, index: number) => {
    vaultAudio.playWhoosh();

    const orbitRadius = 9 + index * 5.2;
    const initialOffset = (index * (Math.PI * 2)) / globes.length;
    // Approximate current target vector
    const x = Math.cos(initialOffset) * orbitRadius;
    const z = Math.sin(initialOffset) * orbitRadius;
    const y = 0.5;

    setTargetCoords([x, y, z]);
    setWarpingPlanetName(globe.name);
    setWarpingPlanetColor(globe.customColor || THEME_HEX[globe.themeColor] || '#F59E0B');
    setIsWarping(true);

    // Zoom fly-through sequence then hand off to dome
    setTimeout(() => {
      onSelectPlanet(globe.id);
    }, 950);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#040508]">
      {/* Cinematic Warp Zoom Overlay */}
      {isWarping && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="w-24 h-24 rounded-full border-4 border-dashed animate-spin-slow mb-4 shadow-glow"
            style={{ borderColor: warpingPlanetColor, boxShadow: `0 0 50px ${warpingPlanetColor}` }}
          />
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-vault-gold mb-1">
            Approaching Orbit
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-widest uppercase drop-shadow-xl text-center px-4">
            {warpingPlanetName}
          </h2>
          <div className="text-xs text-slate-300 font-sans mt-2">
            Synchronizing 108 Memory Slots...
          </div>
        </div>
      )}

      {/* Three.js 3D Solar System Canvas */}
      <Canvas
        camera={{ position: [0, 32, 45], fov: 50, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#040508']} />
        <ambientLight intensity={0.8} />

        {/* Surrounding Galactic Starfield */}
        <ParticleStarfield count={1200} />

        {/* Central Sun / Core Archive */}
        <GalacticSunCore />

        {/* Concentric Planetary Orbits */}
        <OrbitalPathRings count={globes.length} />

        {/* Orbiting Celestial Planets */}
        {globes.map((globe, index) => (
          <CelestialPlanetMesh
            key={globe.id}
            globe={globe}
            index={index}
            totalPlanets={globes.length}
            photoCount={getGlobePhotoCount(globe.id)}
            isSelected={globe.id === activeGlobeId}
            onSelect={() => handlePlanetClick(globe, index)}
          />
        ))}

        <SolarSystemCameraController
          targetCoords={targetCoords}
          isFlying={isWarping}
          controlsRef={controlsRef}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={85}
          maxPolarAngle={Math.PI / 2 + 0.1}
          autoRotate={!isWarping}
          autoRotateSpeed={0.3}
        />
      </Canvas>

      {/* Floating Galaxy HUD Legend & Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-2xl border border-vault-gold/40 shadow-glow text-xs text-white">
        <Sparkles className="w-3.5 h-3.5 text-vault-gold animate-pulse" />
        <span className="font-serif">Click any planet to zoom into its 3D Memory Dome</span>
        <button
          onClick={onOpenCreatePlanet}
          className="ml-2 flex items-center gap-1 px-3 py-1 rounded-full bg-vault-gold hover:bg-amber-400 text-black font-bold text-[11px] transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3 h-3 text-black" />
          <span>+ Birth Planet</span>
        </button>
      </div>
    </div>
  );
}
