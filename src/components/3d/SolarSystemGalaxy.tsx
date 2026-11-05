import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { MemoryGlobe, Photo } from '../../types';
import { vaultAudio } from '../../services/audioSynthesizer';
import { ParticleStarfield } from './ParticleStarfield';
import {
  getSunSurfaceTexture,
  getPlanetSurfaceTexture,
  getPlanetCloudsTexture,
  getPlanetaryRingsTexture,
} from '../../services/planetTextures';
import {
  Globe,
  Sparkles,
  Plus,
  ArrowRight,
  Shield,
  Radio,
  Compass,
  Zap,
} from 'lucide-react';

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

// ---------------------------------------------------------------------------
// 1. Orbiting Celestial Moon Mesh
// ---------------------------------------------------------------------------
function CelestialMoon({
  parentRadius,
  color,
  speed = 1.2,
  distance = 2.6,
}: {
  parentRadius: number;
  color: string;
  speed?: number;
  distance?: number;
}) {
  const moonRef = useRef<THREE.Mesh>(null);
  const moonGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    if (moonGroupRef.current) {
      moonGroupRef.current.position.set(
        Math.cos(t) * (parentRadius + distance),
        Math.sin(t * 0.7) * 0.4,
        Math.sin(t) * (parentRadius + distance)
      );
    }
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={moonGroupRef}>
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial
          color="#E2E8F0"
          roughness={0.8}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 2. Photorealistic Orbiting Celestial Planet Mesh
// ---------------------------------------------------------------------------
function CelestialPlanetMesh({
  globe,
  index,
  totalPlanets,
  photoCount,
  globePhotos,
  isSelected,
  onSelect,
  onRegisterGroup,
}: {
  globe: MemoryGlobe;
  index: number;
  totalPlanets: number;
  photoCount: number;
  globePhotos: Photo[];
  isSelected: boolean;
  onSelect: () => void;
  onRegisterGroup: (id: string, group: THREE.Group | null) => void;
}) {
  const planetGroupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const [isHovered, setIsHovered] = useState(false);

  // Register live group for real-time 3D camera tracking
  useEffect(() => {
    if (planetGroupRef.current) {
      onRegisterGroup(globe.id, planetGroupRef.current);
    }
    return () => {
      onRegisterGroup(globe.id, null);
    };
  }, [globe.id, onRegisterGroup]);

  // Compute Keplerian orbital radius and speed
  const orbitRadius = 10 + index * 5.6;
  const orbitSpeed = 0.075 / Math.sqrt(index + 1);
  const initialOffset = (index * (Math.PI * 2)) / totalPlanets;

  const planetColor = useMemo(() => {
    return globe.customColor || THEME_HEX[globe.themeColor] || '#F59E0B';
  }, [globe.customColor, globe.themeColor]);

  const hasRings = globe.type === 'milestone' || globe.type === 'group' || index % 2 === 1;

  // Retrieve procedural photorealistic textures
  const surfaceTexture = useMemo(() => getPlanetSurfaceTexture(globe, index), [globe, index]);
  const cloudsTexture = useMemo(() => getPlanetCloudsTexture(index), [index]);
  const ringsTexture = useMemo(() => (hasRings ? getPlanetaryRingsTexture(planetColor) : null), [hasRings, planetColor]);

  // Frame-by-frame orbital mechanics and axial rotation
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const angle = t * orbitSpeed + initialOffset;

    if (planetGroupRef.current) {
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const y = Math.sin(angle * 2.2) * 0.65;
      planetGroupRef.current.position.set(x, y, z);
    }

    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.35;
    }

    // Atmospheric clouds rotate independently from the solid crust
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.48;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -= delta * 0.15;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.08;
    }
  });

  const planetRadius = isSelected ? 1.7 : isHovered ? 1.55 : 1.35;

  return (
    <group ref={planetGroupRef}>
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
        {/* 1. Primary Solid Planetary Crust with Surface Map */}
        <mesh ref={sphereRef}>
          <sphereGeometry args={[planetRadius, 64, 64]} />
          <meshStandardMaterial
            map={surfaceTexture}
            roughness={0.4}
            metalness={0.2}
            emissive={planetColor}
            emissiveIntensity={isHovered || isSelected ? 0.35 : 0.12}
          />
        </mesh>

        {/* 2. Independent 3D Atmospheric Clouds Deck */}
        <mesh ref={cloudsRef} scale={1.02}>
          <sphereGeometry args={[planetRadius, 48, 48]} />
          <meshStandardMaterial
            map={cloudsTexture}
            transparent
            opacity={0.75}
            blending={THREE.NormalBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 3. Outer Atmospheric Rayleigh Halo (Limb Scattering) */}
        <mesh ref={atmosphereRef} scale={1.22}>
          <sphereGeometry args={[planetRadius, 32, 32]} />
          <meshStandardMaterial
            color={planetColor}
            emissive={planetColor}
            emissiveIntensity={isHovered || isSelected ? 0.65 : 0.3}
            transparent
            opacity={isHovered || isSelected ? 0.4 : 0.18}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 4. Planetary Rings (Cassini Division & Ice-Dust) */}
        {hasRings && ringsTexture && (
          <mesh ref={ringRef} rotation={[Math.PI / 3.2, 0.25, 0]}>
            <ringGeometry args={[planetRadius * 1.5, planetRadius * 2.5, 96]} />
            <meshStandardMaterial
              map={ringsTexture}
              transparent
              opacity={0.88}
              side={THREE.DoubleSide}
              roughness={0.5}
            />
          </mesh>
        )}

        {/* 5. Natural Orbiting Memory Moon */}
        <CelestialMoon parentRadius={planetRadius} color={planetColor} />

        {/* 6. Floating Luxury 3D Holographic Label */}
        <Html
          position={[0, planetRadius + 2.2, 0]}
          center
          distanceFactor={22}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 select-none ${
              isHovered || isSelected
                ? 'bg-black/92 scale-110 shadow-[0_0_35px_rgba(229,192,123,0.6)] border-vault-gold ring-2 ring-vault-gold/50'
                : 'bg-black/75 hover:bg-black/90 border-white/20 hover:border-vault-gold/60 shadow-xl'
            }`}
            style={{ minWidth: '145px' }}
          >
            <div className="flex items-center gap-2 w-full justify-between">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                style={{ backgroundColor: planetColor, boxShadow: `0 0 10px ${planetColor}` }}
              />
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-300 font-bold">
                {globe.type}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-vault-gold border border-white/10">
                {photoCount}/108
              </span>
            </div>

            <div className="text-white font-serif font-bold text-xs tracking-wide truncate max-w-[150px] drop-shadow-md text-center mt-0.5">
              {globe.name}
            </div>

            {/* Orbit Thumbnail Previews (if photos present) */}
            {globePhotos.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {globePhotos.slice(0, 3).map((p, pIdx) => (
                  <img
                    key={p.id || pIdx}
                    src={p.decryptedThumbUrl || p.thumbStoragePath || p.storagePath}
                    alt="Memory"
                    className="w-5 h-5 rounded-md object-cover border border-white/25 shadow-sm"
                  />
                ))}
                {globePhotos.length > 3 && (
                  <span className="text-[8px] font-mono text-vault-gold font-bold">
                    +{globePhotos.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[9px] text-vault-gold font-sans font-semibold mt-0.5">
              <span>{isHovered ? 'Initiate Warp' : 'Enter 3D Dome'}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 3. Realistic 3D Asteroid Belt
// ---------------------------------------------------------------------------
function AsteroidBelt({ count = 220, innerRadius = 21, outerRadius = 25 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const asteroids = useMemo(() => {
    const dummy = new THREE.Object3D();
    const data: { radius: number; speed: number; offset: number; rotX: number; rotY: number; scale: number }[] = [];

    for (let i = 0; i < count; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const speed = 0.035 / Math.sqrt(radius * 0.08);
      const offset = Math.random() * Math.PI * 2;
      const rotX = (Math.random() - 0.5) * 0.02;
      const rotY = (Math.random() - 0.5) * 0.02;
      const scale = 0.08 + Math.random() * 0.22;

      data.push({ radius, speed, offset, rotX, rotY, scale });
    }
    return { dummy, data };
  }, [count, innerRadius, outerRadius]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const { dummy, data } = asteroids;

    for (let i = 0; i < count; i++) {
      const ast = data[i];
      const angle = t * ast.speed + ast.offset;
      const x = Math.cos(angle) * ast.radius;
      const z = Math.sin(angle) * ast.radius;
      const y = Math.sin(angle * 3) * 0.8 + (Math.sin(i) * 0.4);

      dummy.position.set(x, y, z);
      dummy.rotation.x += ast.rotX;
      dummy.rotation.y += ast.rotY;
      dummy.scale.set(ast.scale, ast.scale, ast.scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#78716C"
        roughness={0.9}
        metalness={0.3}
        emissive="#44403C"
        emissiveIntensity={0.08}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// 4. Concentric Orbital Rings with Starlight Dust
// ---------------------------------------------------------------------------
function OrbitalPathRings({ count }: { count: number }) {
  const rings = useMemo(() => {
    return Array.from({ length: count }, (_, i) => 10 + i * 5.6);
  }, [count]);

  return (
    <group>
      {rings.map((r, i) => (
        <group key={`orbit_${i}`}>
          {/* Thin Glowing Golden Orbit Line */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.04, r + 0.04, 128]} />
            <meshBasicMaterial
              color="#E5C07B"
              transparent
              opacity={0.22 + (i % 2 === 0 ? 0.08 : 0)}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 5. Blazing Sun / Solar Radiant Core
// ---------------------------------------------------------------------------
function GalacticSunCore() {
  const sunRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const outerFlareRef = useRef<THREE.Mesh>(null);

  const sunTexture = useMemo(() => getSunSurfaceTexture(), []);

  useFrame((_, delta) => {
    if (sunRef.current) sunRef.current.rotation.y += delta * 0.08;
    if (coronaRef.current) coronaRef.current.rotation.z -= delta * 0.04;
    if (outerFlareRef.current) outerFlareRef.current.rotation.y += delta * 0.03;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Turbulent Solar Surface Core */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[3.4, 64, 64]} />
        <meshStandardMaterial
          map={sunTexture}
          emissive="#F59E0B"
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* 2. Inner Coronal Flare Shield */}
      <mesh ref={coronaRef} scale={1.3}>
        <sphereGeometry args={[3.4, 48, 48]} />
        <meshStandardMaterial
          color="#FDE68A"
          emissive="#D97706"
          emissiveIntensity={0.9}
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Radiant Heat Aura */}
      <mesh ref={outerFlareRef} scale={1.6}>
        <sphereGeometry args={[3.4, 32, 32]} />
        <meshStandardMaterial
          color="#FEF08A"
          emissive="#F59E0B"
          emissiveIntensity={0.5}
          transparent
          opacity={0.22}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Solar Omnidirectional Point Light */}
      <pointLight color="#FFFBEB" intensity={4.5} distance={200} decay={1.1} />

      {/* Sun Core Floating Tag */}
      <Html position={[0, -4.6, 0]} center distanceFactor={24}>
        <div className="px-3.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-vault-gold/45 text-vault-gold text-[10px] font-mono uppercase tracking-widest text-center shadow-glow">
          Galactic Core • Genesis Vault
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 6. 3D Hyperspace Warp Speed Streaks
// ---------------------------------------------------------------------------
function HyperspaceWarpStreaks({ active, color }: { active: boolean; color: string }) {
  const streaksRef = useRef<THREE.LineSegments>(null);

  const [positions, streakColors] = useMemo(() => {
    const count = 160;
    const pos = new Float32Array(count * 6);
    const col = new Float32Array(count * 6);
    const c = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 22;
      const z1 = -50 - Math.random() * 80;
      const z2 = z1 + 8 + Math.random() * 20;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      const idx = i * 6;
      pos[idx] = x;
      pos[idx + 1] = y;
      pos[idx + 2] = z1;
      pos[idx + 3] = x;
      pos[idx + 4] = y;
      pos[idx + 5] = z2;

      col[idx] = c.r;
      col[idx + 1] = c.g;
      col[idx + 2] = c.b;
      col[idx + 3] = 1;
      col[idx + 4] = 1;
      col[idx + 5] = 1;
    }
    return [pos, col];
  }, [color]);

  useFrame((_, delta) => {
    if (!streaksRef.current || !active) return;
    const posAttr = streaksRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const speed = 140 * delta;

    for (let i = 0; i < arr.length; i += 6) {
      arr[i + 2] += speed;
      arr[i + 5] += speed * 1.5;

      if (arr[i + 2] > 20) {
        arr[i + 2] = -90;
        arr[i + 5] = -75;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <lineSegments ref={streaksRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[streakColors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// 7. Cinematic Camera Flight Controller (Real-Time Dynamic Tracking)
// ---------------------------------------------------------------------------
function SolarSystemCameraController({
  targetPlanetGroup,
  isFlying,
  controlsRef,
}: {
  targetPlanetGroup: THREE.Group | null;
  isFlying: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const worldPosRef = useRef(new THREE.Vector3());

  useFrame(() => {
    if (isFlying && targetPlanetGroup && controlsRef.current) {
      // Fetch LIVE world position of the moving planet
      targetPlanetGroup.getWorldPosition(worldPosRef.current);
      const targetPos = worldPosRef.current;

      // Smoothly swoop camera to close orbital view (approaching atmosphere)
      const desiredCamPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + 0.35,
        targetPos.z + 2.85
      );

      camera.position.lerp(desiredCamPos, 0.082);
      controlsRef.current.target.lerp(targetPos, 0.1);
      controlsRef.current.update();
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
// 8. Main Solar System Galaxy Component
// ---------------------------------------------------------------------------
export function SolarSystemGalaxy({
  globes,
  activeGlobeId,
  photos,
  onSelectPlanet,
  onOpenCreatePlanet,
  theme = 'dark',
}: SolarSystemGalaxyProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const planetGroupsRef = useRef<Map<string, THREE.Group>>(new Map());

  const [activeWarpGroup, setActiveWarpGroup] = useState<THREE.Group | null>(null);
  const [isWarping, setIsWarping] = useState(false);
  const [warpingPlanetName, setWarpingPlanetName] = useState<string>('');
  const [warpingPlanetColor, setWarpingPlanetColor] = useState<string>('#F59E0B');
  const [warpVelocity, setWarpVelocity] = useState(2400);
  const [warpDistance, setWarpDistance] = useState(148000);

  const registerPlanetGroup = (id: string, group: THREE.Group | null) => {
    if (group) {
      planetGroupsRef.current.set(id, group);
    } else {
      planetGroupsRef.current.delete(id);
    }
  };

  const getGlobePhotos = (globeId: string) => {
    return photos.filter(
      (p) => !p.inTrash && (p.globeId === globeId || (!p.globeId && globeId === 'globe_main'))
    );
  };

  // Warp Countdown & Speedometer Simulator during flight
  useEffect(() => {
    if (!isWarping) return;
    const interval = setInterval(() => {
      setWarpVelocity((v) => Math.min(186000, v + 24000));
      setWarpDistance((d) => Math.max(120, Math.floor(d * 0.45)));
    }, 120);

    return () => clearInterval(interval);
  }, [isWarping]);

  const handlePlanetClick = (globe: MemoryGlobe) => {
    vaultAudio.playWhoosh();
    vaultAudio.playChime(659.25);

    const group = planetGroupsRef.current.get(globe.id) || null;
    setActiveWarpGroup(group);
    setWarpingPlanetName(globe.name);
    setWarpingPlanetColor(globe.customColor || THEME_HEX[globe.themeColor] || '#F59E0B');
    setWarpVelocity(2400);
    setWarpDistance(148000);
    setIsWarping(true);

    // Cinematic 3-stage dive into the 3D memory dome
    setTimeout(() => {
      onSelectPlanet(globe.id);
    }, 1250);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#030407]">
      {/* ------------------------------------------------------------- */}
      {/* Luxury Interstellar Telemetry & Orbital Warp HUD */}
      {/* ------------------------------------------------------------- */}
      {isWarping && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-12 pointer-events-none bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
          {/* Top Flight Computer Status Bar */}
          <div className="flex items-center justify-between w-full max-w-4xl px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-vault-gold/40 text-xs font-mono shadow-glow">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-vault-gold animate-pulse" />
              <span className="text-vault-gold font-bold">WARP DRIVE ENGAGED</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <span>NAV-AI: KEPLER 108</span>
              <span className="text-vault-gold">•</span>
              <span className="text-emerald-400 font-bold">HORIZON LOCKED</span>
            </div>
          </div>

          {/* Center Holographic Target Brackets & Telemetry */}
          <div className="flex flex-col items-center justify-center my-auto">
            {/* Sci-Fi Targeting Brackets */}
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
              {/* Corner brackets */}
              <div
                className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2"
                style={{ borderColor: warpingPlanetColor }}
              />
              <div
                className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2"
                style={{ borderColor: warpingPlanetColor }}
              />
              <div
                className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2"
                style={{ borderColor: warpingPlanetColor }}
              />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2"
                style={{ borderColor: warpingPlanetColor }}
              />

              {/* Pulsing Core Target Reticle */}
              <div
                className="w-20 h-20 rounded-full border border-dashed animate-spin-slow"
                style={{ borderColor: warpingPlanetColor, boxShadow: `0 0 40px ${warpingPlanetColor}66` }}
              />
              <div
                className="absolute w-2.5 h-2.5 rounded-full animate-ping"
                style={{ backgroundColor: warpingPlanetColor }}
              />
            </div>

            {/* Target Planet Heading */}
            <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-vault-gold mb-1 text-center">
              Target Planetary Vector
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-extrabold text-white tracking-widest uppercase drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)] text-center px-4">
              {warpingPlanetName}
            </h2>
            <div className="text-xs text-amber-200/90 font-mono tracking-wider mt-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-vault-gold animate-bounce" />
              <span>ATMOSPHERIC PENETRATION IN PROGRESS</span>
            </div>
          </div>

          {/* Bottom Telemetry Flight Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl text-center font-mono">
            <div className="px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase">Velocity</div>
              <div className="text-sm sm:text-base font-bold text-vault-gold">
                {warpVelocity.toLocaleString()} <span className="text-[10px]">KM/H</span>
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase">Distance</div>
              <div className="text-sm sm:text-base font-bold text-white">
                {warpDistance.toLocaleString()} <span className="text-[10px]">KM</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-400 uppercase">Orbit Slots</div>
              <div className="text-sm sm:text-base font-bold text-emerald-400">
                108 SYNCHRONIZED
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Three.js 3D Solar System Canvas */}
      {/* ------------------------------------------------------------- */}
      <Canvas
        camera={{ position: [0, 34, 46], fov: 50, near: 0.1, far: 1200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#030407']} />
        <ambientLight intensity={0.85} />

        {/* Surrounding Galactic Starfield */}
        <ParticleStarfield count={1400} />

        {/* 3D Hyperspace Warp Lines */}
        <HyperspaceWarpStreaks active={isWarping} color={warpingPlanetColor} />

        {/* Central Sun / Core Archive */}
        <GalacticSunCore />

        {/* Concentric Planetary Orbits */}
        <OrbitalPathRings count={globes.length} />

        {/* 3D Asteroid Belt between Orbits */}
        <AsteroidBelt count={240} innerRadius={21} outerRadius={25} />

        {/* Orbiting Celestial Planets */}
        {globes.map((globe, index) => {
          const globePhotos = getGlobePhotos(globe.id);
          return (
            <CelestialPlanetMesh
              key={globe.id}
              globe={globe}
              index={index}
              totalPlanets={globes.length}
              photoCount={globePhotos.length}
              globePhotos={globePhotos}
              isSelected={globe.id === activeGlobeId}
              onSelect={() => handlePlanetClick(globe)}
              onRegisterGroup={registerPlanetGroup}
            />
          );
        })}

        {/* Dynamic Real-Time Camera Flight Controller */}
        <SolarSystemCameraController
          targetPlanetGroup={activeWarpGroup}
          isFlying={isWarping}
          controlsRef={controlsRef}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={9}
          maxDistance={95}
          maxPolarAngle={Math.PI / 2 + 0.12}
          autoRotate={!isWarping}
          autoRotateSpeed={0.35}
        />
      </Canvas>

      {/* ------------------------------------------------------------- */}
      {/* Floating Galaxy HUD Legend & Controls */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/85 backdrop-blur-2xl border border-vault-gold/45 shadow-glow text-xs text-white max-w-[95vw] overflow-x-auto no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-vault-gold animate-pulse flex-shrink-0" />
        <span className="font-serif whitespace-nowrap">
          Click any celestial planet to warp into its 3D Memory Dome
        </span>
        <button
          onClick={onOpenCreatePlanet}
          className="ml-2 flex items-center gap-1 px-3 py-1 rounded-full bg-vault-gold hover:bg-amber-400 text-black font-bold text-[11px] transition-all cursor-pointer shadow-md flex-shrink-0 active:scale-95"
        >
          <Plus className="w-3 h-3 text-black" />
          <span>+ Birth Planet</span>
        </button>
      </div>
    </div>
  );
}
