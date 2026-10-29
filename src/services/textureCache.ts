import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();
const pendingLoads = new Map<string, Promise<THREE.Texture>>();

export function getLoadedTexture(url: string, onUpdate?: (tex: THREE.Texture) => void): THREE.Texture | null {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }

  if (!pendingLoads.has(url)) {
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          textureCache.set(url, tex);
          resolve(tex);
        },
        undefined,
        (err) => {
          console.warn('Failed to load shared texture:', url, err);
          reject(err);
        }
      );
    });

    pendingLoads.set(url, promise);
  }

  pendingLoads.get(url)?.then((tex) => {
    if (onUpdate) onUpdate(tex);
  });

  return null;
}
