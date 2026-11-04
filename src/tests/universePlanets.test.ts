import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultStore } from '../stores/useVaultStore';
import type { Photo } from '../types';

function createDummyPhoto(id: string, globeId?: string, slotIndex?: number): Photo {
  return {
    id,
    familyId: 'fam_myorb_main',
    albumId: 'alb_heritage',
    uploaderId: 'mem_curator',
    uploaderName: 'Vault Curator',
    storagePath: `vault/photos/${id}.jpg`,
    thumbStoragePath: `vault/thumbs/${id}.jpg`,
    fileSizeBytes: 1024000,
    thumbSizeBytes: 32000,
    mimeType: 'image/jpeg',
    width: 1600,
    height: 900,
    orientation: 'landscape',
    ivHex: 'abcdef123456',
    thumbIvHex: '123456abcdef',
    isFavorite: false,
    inTrash: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    globeId,
    slotIndex,
    metadata: {
      title: `Memory ${id}`,
      captureDate: '2023-01-01',
      tags: ['test'],
    },
  };
}

describe('Memory Universe & Multi-Globe Planet System', () => {
  beforeEach(() => {
    // Reset store
    const store = useVaultStore.getState();
    store.clearAllPhotos();
    store.setActiveGlobeId('globe_main');
  });

  it('starts with Genesis Main Vault as default mother globe and zero mock photos', () => {
    const store = useVaultStore.getState();
    expect(store.activeGlobeId).toBe('globe_main');
    expect(store.globes.length).toBeGreaterThanOrEqual(1);
    expect(store.globes[0].id).toBe('globe_main');
    expect(store.photos.length).toBe(0);
  });

  it('births a new individual or group memory planet', () => {
    const store = useVaultStore.getState();
    const planet = store.createGlobe('Marcus Travel Orbit', 'individual', {
      ownerMemberId: 'mem_marcus',
      ownerName: 'Marcus Chen',
      themeColor: 'sapphire',
      description: 'Photos from Kyoto and Osaka voyages',
    });

    expect(planet).toBeDefined();
    expect(planet.name).toBe('Marcus Travel Orbit');
    expect(planet.type).toBe('individual');
    expect(planet.themeColor).toBe('sapphire');
    expect(planet.totalSlots).toBe(108);

    const updated = useVaultStore.getState();
    expect(updated.activeGlobeId).toBe(planet.id);
    expect(updated.globes.find((g) => g.id === planet.id)).toBeDefined();
  });

  it('assigns photo directly to a specific slot index on the active globe', () => {
    const store = useVaultStore.getState();
    const dummy = createDummyPhoto('pho_slot_42');

    store.addPhotoToSlot(dummy, 41, 'globe_main'); // 0-based index 41 = Slot #42

    const updated = useVaultStore.getState();
    const saved = updated.photos.find((p) => p.id === 'pho_slot_42');
    expect(saved).toBeDefined();
    expect(saved?.slotIndex).toBe(41);
    expect(saved?.globeId).toBe('globe_main');
  });

  it('bulk adds photos and populates available vacant slots', () => {
    const store = useVaultStore.getState();
    const batch = Array.from({ length: 10 }, (_, i) =>
      createDummyPhoto(`bulk_photo_${i}`)
    );

    store.bulkAddPhotosToGlobe(batch, 'globe_main');

    const updated = useVaultStore.getState();
    const globePhotos = updated.photos.filter((p) => p.globeId === 'globe_main');
    expect(globePhotos.length).toBe(10);

    // Ensure all 10 have unique slot indexes
    const slotSet = new Set(globePhotos.map((p) => p.slotIndex));
    expect(slotSet.size).toBe(10);
  });

  it('auto-spawns a new companion orbit when a globe exceeds 108 slots', () => {
    const store = useVaultStore.getState();
    const initialGlobe = store.globes.find((g) => g.id === 'globe_main')!;

    // Create 112 photos (108 to fill current globe + 4 overflow)
    const largeBatch = Array.from({ length: 112 }, (_, i) =>
      createDummyPhoto(`overflow_photo_${i}`)
    );

    store.bulkAddPhotosToGlobe(largeBatch, 'globe_main');

    const updated = useVaultStore.getState();
    // Verify a new companion globe was birthed
    const companionGlobe = updated.globes.find((g) =>
      g.name.includes(`${initialGlobe.name} • Orbit`)
    );
    expect(companionGlobe).toBeDefined();

    // Verify exactly 108 photos in main globe, and 4 in companion globe
    const mainPhotos = updated.photos.filter((p) => p.globeId === 'globe_main');
    const companionPhotos = updated.photos.filter(
      (p) => p.globeId === companionGlobe?.id
    );

    expect(mainPhotos.length).toBe(108);
    expect(companionPhotos.length).toBe(4);
    expect(updated.activeGlobeId).toBe(companionGlobe?.id);
  });

  it('loads curated demo pack of 108 non-duplicate fine art photos on demand', () => {
    const store = useVaultStore.getState();
    store.loadCuratedPhotosIntoGlobe('globe_main');

    const updated = useVaultStore.getState();
    const mainPhotos = updated.photos.filter((p) => p.globeId === 'globe_main');
    expect(mainPhotos.length).toBe(108);

    // Verify all 108 have unique slots 0..107
    const uniqueSlots = new Set(mainPhotos.map((p) => p.slotIndex));
    expect(uniqueSlots.size).toBe(108);
  });
});
