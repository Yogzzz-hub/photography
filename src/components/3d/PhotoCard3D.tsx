import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Photo } from '../../types';
import type { LayoutTransform } from './layouts/layoutCalculators';
import { vaultAudio } from '../../services/audioSynthesizer';
import { getLoadedTexture } from '../../services/textureCache';
import { getInstantProceduralTexture } from '../../services/instantTextures';

interface PhotoCard3DProps {
  slotIndex: number;
  photo: Photo;
  texture?: THREE.Texture | null;
  targetTransform: LayoutTransform;
  isSelected: boolean;
  isHovered: boolean;
  isMonochrome?: boolean;
  onSelect: (photoId: string) => void;
  onHover: (photoId: string | null) => void;
  onSwapSlots?: (sourceIndex: number, targetIndex: number) => void;
}

export function PhotoCard3D({
  slotIndex,
  photo,
  texture: initialTexture,
  targetTransform,
  isSelected,
  isHovered,
  isMonochrome = false,
  onSelect,
  onHover,
  onSwapSlots,
}: PhotoCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Determine orientation dynamically (true to reference myorb.live with distinct portrait & landscape cards)
  const isPortrait = photo.height > photo.width || photo.orientation === 'portrait';

  // Instant 0ms procedural fallback so every card renders on frame 1 without network delay
  const [localTexture, setLocalTexture] = useState<THREE.Texture>(
    () => initialTexture || getInstantProceduralTexture(photo.id, isPortrait)
  );

  useEffect(() => {
    if (initialTexture) {
      setLocalTexture(initialTexture);
      return;
    }
    const url = photo.decryptedThumbUrl || photo.thumbStoragePath;
    if (!url) {
      setLocalTexture(getInstantProceduralTexture(photo.id, isPortrait));
      return;
    }
    const cached = getLoadedTexture(url, (loaded) => {
      setLocalTexture(loaded);
    });
    if (cached) {
      setLocalTexture(cached);
    } else {
      setLocalTexture(getInstantProceduralTexture(photo.id, isPortrait));
    }
  }, [initialTexture, photo.decryptedThumbUrl, photo.thumbStoragePath, photo.id, isPortrait]);

  // Interactive 3D Drag & Drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Strict 16:9 widescreen (Landscape) and 9:16 vertical widescreen (Portrait) card dimensions
  const cardWidth = isPortrait ? 1.44 : 2.56;
  const cardHeight = isPortrait ? 2.56 : 1.44;
  const cornerRadius = 0.09;

  // Reusable rounded-corner squircle geometry
  const roundedGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = cardWidth;
    const h = cardHeight;
    const r = cornerRadius;
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const geom = new THREE.ShapeGeometry(shape, 12);
    // Explicitly compute normalized UV coordinates [0..1] across the entire shape
    const pos = geom.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      uvs[i * 2] = (px + w / 2) / w;
      uvs[i * 2 + 1] = (py + h / 2) / h;
    }
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();
    return geom;
  }, [cardWidth, cardHeight, cornerRadius]);

  // Border outline wireframe
  const borderGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = cardWidth;
    const h = cardHeight;
    const r = cornerRadius;
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const pts = shape.getPoints(24);
    pts.push(pts[0].clone()); // Close loop
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [cardWidth, cardHeight, cornerRadius]);

  // Backplate depth geometry
  const backplateGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = cardWidth + 0.04;
    const h = cardHeight + 0.04;
    const r = cornerRadius + 0.01;
    const x = -w / 2;
    const y = -h / 2;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    return new THREE.ShapeGeometry(shape, 8);
  }, [cardWidth, cardHeight, cornerRadius]);

  // Compute smooth spring motion on every frame
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const lerpSpeed = Math.min(delta * 9.0, 1);
    const [tx, ty, tz] = targetTransform.position;
    const [rx, ry, rz] = targetTransform.rotation;
    const [nx, ny, nz] = targetTransform.normal;

    // Subtle normal-aligned elevation on hover / drag that prevents raycast jitter
    const elevation = isDragging ? 3.6 : isHovered ? 0.25 : isSelected ? 1.8 : 0.0;
    const targetX = tx + nx * elevation + dragOffsetRef.current.x;
    const targetY = ty + ny * elevation + dragOffsetRef.current.y;
    const targetZ = tz + nz * elevation + dragOffsetRef.current.z;

    // Position lerp
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, lerpSpeed);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, lerpSpeed);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, lerpSpeed);

    // Rotation lerp
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rx, lerpSpeed);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, ry, lerpSpeed);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, rz, lerpSpeed);

    // Scale lerp
    const targetScale = isDragging
      ? 1.28
      : isSelected
      ? 1.22
      : isHovered
      ? 1.14
      : (targetTransform.scale || 1.0);

    groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, lerpSpeed * 1.5);
    groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, targetScale, lerpSpeed * 1.5);
    groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, targetScale, lerpSpeed * 1.5);
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    if (Math.hypot(dx, dy) > 8) {
      if (!isDragging) {
        setIsDragging(true);
        vaultAudio.playWhoosh();
      }
      dragOffsetRef.current.set(dx * 0.022, -dy * 0.022, 0.4);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      vaultAudio.playSnap();

      if (onSwapSlots) {
        // Swap slot offset based on drag distance
        const offset = Math.round(dragOffsetRef.current.x * 2.8) || 1;
        onSwapSlots(slotIndex, (slotIndex + offset + 108) % 108);
      }

      dragOffsetRef.current.set(0, 0, 0);
      pointerStartRef.current = null;
      return;
    }

    pointerStartRef.current = null;
    e.stopPropagation();
    onSelect(photo.id);
  };

  const activeTexture = localTexture || initialTexture;

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'grab';
        onHover(photo.id);
        vaultAudio.playHoverChime();
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        onHover(null);
      }}
    >
      {/* Front Photographic Card Surface (Visible from outside) */}
      <mesh ref={meshRef} geometry={roundedGeometry}>
        {activeTexture ? (
          <meshBasicMaterial
            map={activeTexture}
            side={THREE.FrontSide}
            toneMapped={false}
            color={isMonochrome ? '#C0C0C0' : '#FFFFFF'}
          />
        ) : (
          <meshStandardMaterial
            color="#141822"
            roughness={0.25}
            metalness={0.5}
            side={THREE.FrontSide}
          />
        )}
      </mesh>

      {/* Back Photographic Card Surface (Visible from inside the 3D sphere/planetarium, unmirrored) */}
      <mesh position={[0, 0, -0.005]} scale={[-1, 1, 1]} geometry={roundedGeometry}>
        {activeTexture ? (
          <meshBasicMaterial
            map={activeTexture}
            side={THREE.FrontSide}
            toneMapped={false}
            color={isMonochrome ? '#C0C0C0' : '#FFFFFF'}
          />
        ) : (
          <meshStandardMaterial
            color="#141822"
            roughness={0.25}
            metalness={0.5}
            side={THREE.FrontSide}
          />
        )}
      </mesh>

      {/* Luxury Specular Metallic Rim Wireframe */}
      <lineLoop geometry={borderGeometry}>
        <lineBasicMaterial
          color={
            isDragging
              ? '#E5C07B'
              : isSelected
              ? '#E5C07B'
              : isHovered
              ? '#F8FAFC'
              : 'rgba(255, 255, 255, 0.28)'
          }
          linewidth={isDragging || isHovered || isSelected ? 2 : 1}
          transparent
          opacity={isDragging ? 1.0 : isSelected ? 1.0 : isHovered ? 0.95 : 0.35}
        />
      </lineLoop>
    </group>
  );
}
