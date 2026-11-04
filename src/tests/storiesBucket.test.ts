import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVaultStore } from '../stores/useVaultStore';

describe('24-Hour Ephemeral Stories Bucket & Storage Optimization', () => {
  beforeEach(() => {
    // Reset store state
    useVaultStore.setState({
      photos: [],
      trashPhotos: [],
      stories: [],
      auditEvents: [],
      selectedPhotoId: null,
      activeAlbumId: null,
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('adds a story to the ephemeral-stories bucket and tracks storage footprint', () => {
    const store = useVaultStore.getState();
    const story = store.addStory({
      title: 'Dusk over Marina Colonnade',
      location: 'Chennai, Tamil Nadu',
      date: 'Today',
      imgUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552',
      story: 'A fleeting sunset captured with family.',
    });

    expect(story.id).toBeDefined();
    expect(story.bucket).toBe('ephemeral-stories');
    expect(story.sizeBytes).toBeGreaterThan(0);
    // Lifespan should be 24 hours from creation
    expect(story.expiresAt - story.createdAt).toBe(24 * 3600 * 1000);

    const updated = useVaultStore.getState();
    expect(updated.stories).toHaveLength(1);
    expect(updated.storageMetrics.storyCount).toBe(1);
    expect(updated.storageMetrics.storyBytes).toBe(story.sizeBytes);
    expect(updated.storageMetrics.usedBytes).toBeGreaterThan(0);
  });

  it('automatically purges and deletes stories older than 24 hours', () => {
    const store = useVaultStore.getState();
    const now = Date.now();

    // Add active story (expires in 20 hours)
    store.addStory({
      id: 'active_story_1',
      title: 'Active Family Brunch',
      createdAt: now,
      expiresAt: now + 20 * 3600 * 1000,
      imgUrl: 'https://images.unsplash.com/photo-1',
      date: 'Today',
      location: 'Home',
    });

    // Add expired story (expired 1 hour ago, >24h old)
    store.addStory({
      id: 'expired_story_1',
      title: 'Yesterday Morning Mist',
      createdAt: now - 25 * 3600 * 1000,
      expiresAt: now - 1 * 3600 * 1000,
      imgUrl: 'https://images.unsplash.com/photo-2',
      date: 'Yesterday',
      location: 'Hilltop',
    });

    expect(useVaultStore.getState().stories).toHaveLength(2);

    // Run pruning
    const purgedCount = useVaultStore.getState().pruneExpiredStories();
    expect(purgedCount).toBe(1);

    const afterPruning = useVaultStore.getState();
    expect(afterPruning.stories).toHaveLength(1);
    expect(afterPruning.stories[0].id).toBe('active_story_1');

    // Storage bytes should be recalculated to only reflect the active story
    expect(afterPruning.storageMetrics.storyCount).toBe(1);

    // Audit log should register the purge
    const purgeAudit = afterPruning.auditEvents.find((e) => e.action === 'story.expired_purged');
    expect(purgeAudit).toBeDefined();
    expect(purgeAudit?.details?.purgedCount).toBe(1);
  });

  it('deletes a story early and frees storage immediately', () => {
    const store = useVaultStore.getState();
    const story = store.addStory({
      title: 'Quick Candid Moment',
      location: 'Garden',
      date: 'Just now',
      imgUrl: 'https://images.unsplash.com/photo-test',
    });

    expect(useVaultStore.getState().stories).toHaveLength(1);
    const usedBefore = useVaultStore.getState().storageMetrics.usedBytes;

    // Delete story
    useVaultStore.getState().deleteStory(story.id);

    const updated = useVaultStore.getState();
    expect(updated.stories).toHaveLength(0);
    expect(updated.storageMetrics.storyCount).toBe(0);
    expect(updated.storageMetrics.storyBytes).toBe(0);
    expect(updated.storageMetrics.usedBytes).toBeLessThan(usedBefore);
  });

  it('allows promoting an ephemeral story to permanent vault photos before 24h expiry', async () => {
    const store = useVaultStore.getState();
    const story = store.addStory({
      title: 'Timeless Family Gathering',
      location: 'Madurai, Tamil Nadu',
      date: 'Today',
      imgUrl: 'https://images.unsplash.com/photo-precious',
      story: 'We want to keep this memory forever.',
    });

    // Save story to permanent vault
    const photo = await useVaultStore.getState().saveStoryToVault(story.id);
    expect(photo).toBeDefined();
    expect(photo?.metadata.title).toBe('Timeless Family Gathering');

    const updated = useVaultStore.getState();
    // Should now exist in permanent photos
    expect(updated.photos.some((p) => p.metadata.title === 'Timeless Family Gathering')).toBe(true);
    // Audit ledger tracks promotion between buckets
    const promotionAudit = updated.auditEvents.find((e) => e.action === 'story.promoted_to_vault');
    expect(promotionAudit).toBeDefined();
    expect(promotionAudit?.details?.fromBucket).toBe('ephemeral-stories');
    expect(promotionAudit?.details?.toBucket).toBe('permanent-vault');
  });
});
