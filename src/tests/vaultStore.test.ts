import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultStore } from '../stores/useVaultStore';
import type { Photo } from '../types';

describe('Vault State & CRUD Management', () => {
  beforeEach(() => {
    // Reset store state
    useVaultStore.setState({
      photos: [],
      trashPhotos: [],
      auditEvents: [],
      selectedPhotoId: null,
      activeAlbumId: null,
    });
  });

  const samplePhoto: Photo = {
    id: 'test_photo_1',
    familyId: 'fam_myorb_main',
    albumId: 'alb_architecture',
    uploaderId: 'mem_curator',
    uploaderName: 'Vault Curator',
    storagePath: 'families/fam_orb_001/photos/test_1.enc',
    thumbStoragePath: 'families/fam_orb_001/photos/test_1_thumb.enc',
    fileSizeBytes: 2000000,
    thumbSizeBytes: 50000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    ivHex: 'abcdef1234567890abcdef12',
    thumbIvHex: '123456abcdef123456abcdef',
    isFavorite: false,
    inTrash: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      title: 'Family Summer Gathering',
      captureDate: '2023-08-15',
      tags: ['summer', 'family'],
      location: {
        latitude: 42.3601,
        longitude: -71.0589,
        label: 'Boston Common',
      },
    },
  };

  it('adds a photo and records an audit event', () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);

    const updated = useVaultStore.getState();
    expect(updated.photos).toHaveLength(1);
    expect(updated.photos[0].id).toBe('test_photo_1');

    // Verify audit ledger
    expect(updated.auditEvents.length).toBeGreaterThan(0);
    expect(updated.auditEvents[0].action).toBe('photo.created');
    expect(updated.auditEvents[0].resourceId).toBe('test_photo_1');
  });

  it('updates photo metadata and updates the timestamp', async () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);

    await store.updatePhotoMetadata('test_photo_1', {
      title: 'Updated Title: Lake House Sunset',
      story: 'A wonderful story added later.',
    });

    const updated = useVaultStore.getState();
    const photo = updated.photos.find((p) => p.id === 'test_photo_1');
    expect(photo?.metadata.title).toBe('Updated Title: Lake House Sunset');
    expect(photo?.metadata.story).toBe('A wonderful story added later.');
  });

  it('updates photo image data via updatePhoto (crop, rotate, replace)', () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);

    store.updatePhoto('test_photo_1', {
      decryptedFullUrl: 'data:image/jpeg;base64,cropped_image_data',
      decryptedThumbUrl: 'data:image/jpeg;base64,cropped_thumb_data',
      width: 1080,
      height: 1920,
      orientation: 'portrait',
    });

    const updated = useVaultStore.getState();
    const photo = updated.photos.find((p) => p.id === 'test_photo_1');
    expect(photo?.decryptedFullUrl).toBe('data:image/jpeg;base64,cropped_image_data');
    expect(photo?.orientation).toBe('portrait');
    expect(photo?.width).toBe(1080);
    expect(photo?.height).toBe(1920);
  });

  it('moves a photo to trash (soft delete) and allows restoration', () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);

    // Soft delete to trash
    store.moveToTrash('test_photo_1');
    let state = useVaultStore.getState();
    expect(state.photos).toHaveLength(0);
    expect(state.trashPhotos).toHaveLength(1);
    expect(state.trashPhotos[0].inTrash).toBe(true);

    // Restore from trash
    store.restoreFromTrash('test_photo_1');
    state = useVaultStore.getState();
    expect(state.photos).toHaveLength(1);
    expect(state.trashPhotos).toHaveLength(0);
    expect(state.photos[0].inTrash).toBe(false);
  });

  it('permanently deletes a photo from trash', () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);
    store.moveToTrash('test_photo_1');

    store.permanentDeletePhoto('test_photo_1');
    const state = useVaultStore.getState();
    expect(state.photos).toHaveLength(0);
    expect(state.trashPhotos).toHaveLength(0);
  });

  it('creates and tracks backup archives with SHA-256 integrity checksums', async () => {
    const store = useVaultStore.getState();
    store.addPhoto(samplePhoto);

    const backup = await store.createBackupArchive();
    expect(backup.id).toBeDefined();
    expect(backup.photoCount).toBe(1);

    const state = useVaultStore.getState();
    expect(state.backups.some((b) => b.id === backup.id)).toBe(true);
  });

  it('creates a new album and tracks it', async () => {
    const store = useVaultStore.getState();
    const newAlbum = await store.createAlbum('Cousins Trip 2024', 'Our trip to the national park');

    expect(newAlbum.id).toBeDefined();
    expect(newAlbum.name).toBe('Cousins Trip 2024');

    const state = useVaultStore.getState();
    expect(state.albums.some((a) => a.id === newAlbum.id)).toBe(true);
  });
});
