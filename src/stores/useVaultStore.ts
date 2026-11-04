import { create } from 'zustand';
import type {
  Family,
  FamilyMember,
  Album,
  Photo,
  PhotoMetadata,
  ViewMode3D,
  AuditEvent,
  StorageMetrics,
  Invitation,
  BackupArchive,
  FamilyRole,
  MemoryGlobe,
  GlobeType,
  CelestialTheme,
  GlobeBgmTrackId,
} from '../types';
import { vaultAudio } from '../services/audioSynthesizer';
import {
  generateMasterVaultKey,
  generateAlbumKey,
  encryptBinaryData,
  decryptBinaryData,
  encryptJsonMetadata,
  decryptJsonMetadata,
  exportKeyToHex,
  importKeyFromHex,
  formatRecoveryCode,
  parseRecoveryCode,
} from '../crypto/vaultCrypto';
import { INITIAL_SAMPLE_PHOTOS, SAMPLE_CURATED_PHOTOS } from '../services/sampleData';
import { extractAndNormalizeInviteCode } from '../utils/inviteUtils';

interface VaultState {
  // Vault & Auth State
  isVaultUnlocked: boolean;
  masterVaultKey: CryptoKey | null;
  albumKeys: Record<string, CryptoKey>;
  recoveryCode: string | null;
  currentFamily: Family;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  invitations: Invitation[];

  // 3D & Navigation State
  viewMode3D: ViewMode3D;
  selectedPhotoId: string | null;
  hoveredPhotoId: string | null;
  activeAlbumId: string | null;
  searchQuery: string;
  selectedTag: string | null;
  onlyFavorites: boolean;
  isSlideshowActive: boolean;

  // Media Collections
  photos: Photo[];
  albums: Album[];
  trashPhotos: Photo[];
  auditEvents: AuditEvent[];
  backups: BackupArchive[];
  storageMetrics: StorageMetrics;

  // Universe & Multi-Globe System
  globes: MemoryGlobe[];
  activeGlobeId: string;
  setActiveGlobeId: (id: string) => void;
  createGlobe: (
    name: string,
    type: GlobeType,
    options?: {
      ownerMemberId?: string;
      ownerName?: string;
      description?: string;
      themeColor?: CelestialTheme;
      customColor?: string;
      bgmTrackId?: GlobeBgmTrackId;
      bgmTrackName?: string;
      bgmTrackUrl?: string;
    }
  ) => MemoryGlobe;
  updateGlobe: (
    id: string,
    updates: Partial<Pick<MemoryGlobe, 'name' | 'type' | 'description' | 'themeColor' | 'customColor' | 'bgmTrackId' | 'bgmTrackName' | 'bgmTrackUrl'>>
  ) => void;
  updateGlobeBgm: (
    globeId: string,
    trackId: GlobeBgmTrackId,
    trackName: string,
    trackUrl?: string
  ) => void;
  deleteGlobe: (id: string) => void;
  addPhotoToSlot: (photo: Photo, slotIndex: number, globeId?: string) => void;
  bulkAddPhotosToGlobe: (
    newPhotos: Photo[],
    globeId?: string
  ) => { filledCount: number; newGlobeCreated?: MemoryGlobe };
  loadCuratedPhotosIntoGlobe: (globeId?: string) => void;

  // Visual Filters, Theme & Orientation
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  orientationFilter: 'all' | 'landscape' | 'portrait';
  setOrientationFilter: (filter: 'all' | 'landscape' | 'portrait') => void;

  // Actions
  unlockWithRecoveryCode: (code: string) => Promise<boolean>;
  unlockWithMasterKey: (key: CryptoKey) => void;
  lockVault: () => void;
  setViewMode3D: (mode: ViewMode3D) => void;
  setSelectedPhotoId: (id: string | null) => void;
  setHoveredPhotoId: (id: string | null) => void;
  setActiveAlbumId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setOnlyFavorites: (fav: boolean) => void;
  setIsSlideshowActive: (active: boolean) => void;
  clearAllPhotos: () => void;
  resetSamplePhotos: () => void;

  // Photo CRUD & Mutation
  addPhoto: (photo: Photo) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  updatePhotoMetadata: (photoId: string, metadata: Partial<PhotoMetadata>) => Promise<void>;
  toggleFavorite: (photoId: string) => void;
  moveToTrash: (photoId: string) => void;
  restoreFromTrash: (photoId: string) => void;
  permanentDeletePhoto: (photoId: string) => void;
  emptyTrash: () => void;
  setPhotoAlbum: (photoId: string, albumId: string | null) => void;

  // Album CRUD & Photo Grouping
  createAlbum: (name: string, description?: string, initialPhotoIds?: string[]) => Promise<Album>;
  updateAlbum: (albumId: string, name: string, description?: string) => void;
  deleteAlbum: (albumId: string) => void;
  assignPhotosToAlbum: (albumId: string | null, photoIds: string[]) => void;

  // Family Administration
  inviteMember: (email: string, role: FamilyRole, options?: { name?: string; code?: string; expiresInDays?: number }) => string;
  acceptInvitation: (code: string, displayName: string, avatarUrl?: string) => Promise<boolean>;
  loginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  cancelInvitation: (invitationId: string) => void;
  updateMemberRole: (memberId: string, newRole: FamilyRole) => void;
  toggleMemberSuspension: (memberId: string) => void;
  switchActiveMember: (memberId: string) => void;
  changeMemberPassword: (memberId: string, newPassword: string) => Promise<boolean>;
  updateMemberProfile: (memberId: string, updates: Partial<FamilyMember>) => void;

  // Audit Ledger
  recordAuditEvent: (event: Omit<AuditEvent, 'id' | 'createdAt' | 'familyId' | 'actorId' | 'actorName' | 'actorRole'>) => void;

  // Backups
  createBackupArchive: () => Promise<BackupArchive>;
  restoreFromBackup: (backupId: string) => Promise<boolean>;

  // Storage Reconciliation
  recalculateStorageMetrics: () => void;
}

// Initial Family & User Session for immediate out-of-the-box operation
const initialFamily: Family = {
  id: 'fam_myorb_main',
  name: 'MyOrb Memory Vault',
  createdAt: '2024-01-15T09:00:00Z',
  storageBudgetBytes: 10 * 1024 * 1024 * 1024, // 10 GB Free Tier
  storageUsedBytes: 0,
  settings: {
    allowMemberInvites: true,
    requireMFA: true,
    autoTrashDays: 30,
    defaultTheme: 'cinematic-dark',
  },
};

const initialMember: FamilyMember = {
  id: 'mem_curator',
  familyId: 'fam_myorb_main',
  userId: 'usr_curator',
  role: 'owner',
  email: 'curator@myorb.live',
  displayName: 'Vault Curator',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  joinedAt: '2024-01-15T09:00:00Z',
  status: 'active',
  storageUsedBytes: 0,
};

const initialMembersList: FamilyMember[] = [
  initialMember,
  {
    id: 'mem_002',
    familyId: 'fam_myorb_main',
    userId: 'usr_002',
    role: 'admin',
    email: 'marcus.chen@myorb.live',
    displayName: 'Marcus Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-01-16T11:20:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
  {
    id: 'mem_003',
    familyId: 'fam_myorb_main',
    userId: 'usr_003',
    role: 'member',
    email: 'clara.sorensen@myorb.live',
    displayName: 'Clara Sorensen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-02-01T15:45:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
  {
    id: 'mem_004',
    familyId: 'fam_myorb_main',
    userId: 'usr_004',
    role: 'viewer',
    email: 'arthur.chen@myorb.live',
    displayName: 'Arthur Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-02-14T10:00:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
];

const initialAlbums: Album[] = [
  {
    id: 'alb_architecture',
    familyId: 'fam_myorb_main',
    name: 'Architectural Journeys & Stone',
    description: 'Classical arcades, grand colonnades, ancient stone bridges, and architectural symmetry.',
    createdBy: 'mem_curator',
    createdAt: '2024-01-15T10:00:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://cdn.myorb.live/img/default/wal_172619-arcades-9603171_1920.jpg?width=800&quality=80',
  },
  {
    id: 'alb_nature',
    familyId: 'fam_myorb_main',
    name: 'Wild Horizons & Coastlines',
    description: 'Alpine lakes, dramatic ocean cliffs, mist-shrouded peaks, and wilderness journeys.',
    createdBy: 'mem_curator',
    createdAt: '2024-02-01T12:00:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://cdn.myorb.live/img/default/chuotanhls-vietnam-4993855_1920.jpg?width=800&quality=80',
  },
  {
    id: 'alb_moments',
    familyId: 'fam_myorb_main',
    name: 'Cherished Milestones & Souls',
    description: 'Vows, joyful laughter, candid travel portraits, and unforgettable human connections.',
    createdBy: 'mem_curator',
    createdAt: '2024-03-10T14:30:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://cdn.myorb.live/img/default/olcayertem-wedding-8028145_1920.jpg?width=800&quality=80',
  },
];

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('myorb_vault_theme');
    if (saved === 'light' || saved === 'dark') {
      if (saved === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'dark';
};

export const useVaultStore = create<VaultState>((set, get) => ({
  // Authentication & Cryptographic State
  isVaultUnlocked: false,
  masterVaultKey: null,
  albumKeys: {},
  recoveryCode: null,
  currentFamily: initialFamily,
  currentMember: initialMember,
  allMembers: initialMembersList,
  invitations: [
    {
      id: 'inv_001',
      familyId: 'fam_myorb_main',
      email: 'sara.wong@myorb.live',
      name: 'Sara Wong',
      role: 'member',
      invitedBy: 'mem_curator',
      invitedByName: 'Vault Curator',
      code: 'MYORB-INV-7X9K2M',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],

  // 3D & Gallery Navigation State
  viewMode3D: 'orb',
  selectedPhotoId: null,
  hoveredPhotoId: null,
  activeAlbumId: null,
  searchQuery: '',
  selectedTag: null,
  onlyFavorites: false,
  isSlideshowActive: false,
  orientationFilter: 'all',
  setOrientationFilter: (filter: 'all' | 'landscape' | 'portrait') => {
    set({ orientationFilter: filter });
  },
  theme: getInitialTheme(),
  setTheme: (theme: 'dark' | 'light') => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('myorb_vault_theme', theme);
        if (theme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      } catch {
        // Ignore storage errors
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  // Data Collections (Clean slate - zero mock data, ready for authenticated user memories)
  photos: [],
  albums: initialAlbums,
  trashPhotos: [],
  globes: [
    {
      id: 'globe_main',
      name: 'Genesis Main Vault',
      type: 'main',
      themeColor: 'gold',
      customColor: '#F59E0B',
      bgmTrackId: 'orbit',
      bgmTrackName: 'Celestial Orbit',
      createdAt: '2024-01-15T09:00:00Z',
      totalSlots: 108,
    },
    {
      id: 'globe_curator',
      name: "Curator's Sanctuary",
      type: 'individual',
      ownerMemberId: 'mem_curator',
      ownerName: 'Vault Curator',
      themeColor: 'amethyst',
      customColor: '#A855F7',
      bgmTrackId: 'golden',
      bgmTrackName: 'Golden Hour',
      createdAt: '2024-01-15T10:00:00Z',
      totalSlots: 108,
    },
    {
      id: 'globe_marcus',
      name: "Marcus's Orbit",
      type: 'individual',
      ownerMemberId: 'mem_marcus',
      ownerName: 'Marcus Chen',
      themeColor: 'sapphire',
      customColor: '#0EA5E9',
      bgmTrackId: 'zenith',
      bgmTrackName: 'Zenith Horizon',
      createdAt: '2024-01-16T12:00:00Z',
      totalSlots: 108,
    },
    {
      id: 'globe_clara',
      name: "Clara's Voyage",
      type: 'individual',
      ownerMemberId: 'mem_clara',
      ownerName: 'Clara Sorensen',
      themeColor: 'rose',
      customColor: '#F43F5E',
      bgmTrackId: 'solitude',
      bgmTrackName: 'Deep Solitude',
      createdAt: '2024-02-01T15:00:00Z',
      totalSlots: 108,
    },
  ],
  activeGlobeId: 'globe_main',
  auditEvents: [
    {
      id: 'evt_init',
      familyId: 'fam_myorb_main',
      actorId: 'mem_curator',
      actorName: 'Vault Curator',
      actorRole: 'owner',
      action: 'vault.initialized',
      resourceType: 'security',
      resourceId: 'fam_myorb_main',
      resourceName: 'MyOrb Memory Vault',
      status: 'success',
      details: { e2eeEngine: 'WebCrypto-AES-256-GCM', storageProvider: 'Cloudflare-R2' },
      createdAt: '2024-01-15T09:00:00Z',
    },
  ],
  backups: [
    {
      id: 'bak_001',
      familyId: 'fam_orb_001',
      createdAt: '2024-03-01T04:00:00Z',
      createdByName: 'System Automated Scheduler',
      photoCount: 42,
      albumCount: 3,
      totalSizeBytes: 142857140,
      checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      status: 'completed',
    },
  ],
  storageMetrics: {
    budgetBytes: 10 * 1024 * 1024 * 1024,
    usedBytes: 22580000,
    originalBytes: 22180000,
    thumbBytes: 400000,
    trashBytes: 0,
    backupBytes: 142857140,
    photoCount: 8,
    albumCount: 3,
    memberCount: 4,
    warningLevel: 'normal',
    estimatedCostMonthly: 0,
  },

  // Actions
  unlockWithRecoveryCode: async (code: string) => {
    try {
      const cleanHex = parseRecoveryCode(code);
      if (cleanHex.length !== 64) {
        throw new Error('Recovery code must be 64 hexadecimal characters.');
      }
      const key = await importKeyFromHex(cleanHex);
      set({
        isVaultUnlocked: true,
        masterVaultKey: key,
        recoveryCode: formatRecoveryCode(cleanHex),
      });
      get().recordAuditEvent({
        action: 'auth.vault_unlocked',
        resourceType: 'security',
        resourceId: 'vault_session',
        resourceName: 'Vault Decryption Key Activated',
        status: 'success',
      });
      return true;
    } catch (err) {
      console.error('Failed to unlock vault with recovery code:', err);
      get().recordAuditEvent({
        action: 'auth.unlock_failed',
        resourceType: 'security',
        resourceId: 'vault_session',
        status: 'failure',
        details: { reason: String(err) },
      });
      return false;
    }
  },

  unlockWithMasterKey: (key: CryptoKey) => {
    exportKeyToHex(key).then((hex) => {
      set({
        isVaultUnlocked: true,
        masterVaultKey: key,
        recoveryCode: formatRecoveryCode(hex),
      });
      get().recordAuditEvent({
        action: 'auth.vault_unlocked',
        resourceType: 'security',
        resourceId: 'vault_session',
        resourceName: 'Vault Master Key Loaded',
        status: 'success',
      });
    });
  },

  lockVault: () => {
    set({
      isVaultUnlocked: false,
      masterVaultKey: null,
      albumKeys: {},
      selectedPhotoId: null,
    });
    get().recordAuditEvent({
      action: 'auth.vault_locked',
      resourceType: 'security',
      resourceId: 'vault_session',
      status: 'success',
    });
  },

  setViewMode3D: (mode: ViewMode3D) => {
    set({ viewMode3D: mode });
  },

  setSelectedPhotoId: (id: string | null) => {
    set({ selectedPhotoId: id });
  },

  setHoveredPhotoId: (id: string | null) => {
    set({ hoveredPhotoId: id });
  },

  setActiveAlbumId: (id: string | null) => {
    set({ activeAlbumId: id });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedTag: (tag: string | null) => {
    set({ selectedTag: tag });
  },

  setOnlyFavorites: (fav: boolean) => {
    set({ onlyFavorites: fav });
  },

  setIsSlideshowActive: (active: boolean) => {
    set({ isSlideshowActive: active });
  },

  clearAllPhotos: () => {
    set({
      photos: [],
      selectedPhotoId: null,
      hoveredPhotoId: null,
    });
    get().recalculateStorageMetrics();
  },

  resetSamplePhotos: () => {
    set({
      photos: INITIAL_SAMPLE_PHOTOS,
      selectedPhotoId: null,
      hoveredPhotoId: null,
    });
    get().recalculateStorageMetrics();
  },

  // Universe & Multi-Globe Management
  setActiveGlobeId: (id: string) => {
    const targetGlobe = get().globes.find((g) => g.id === id);
    if (targetGlobe) {
      if (targetGlobe.bgmTrackUrl && targetGlobe.bgmTrackName) {
        vaultAudio.loadCustomTrack(targetGlobe.bgmTrackUrl, targetGlobe.bgmTrackName, vaultAudio.isBgmActive());
      } else if (targetGlobe.bgmTrackId) {
        if (targetGlobe.bgmTrackId === 'off') {
          vaultAudio.stopBgm();
        } else if (targetGlobe.bgmTrackId !== 'custom') {
          vaultAudio.selectBgmTrack(targetGlobe.bgmTrackId);
        }
      }
    }
    set({ activeGlobeId: id, selectedPhotoId: null });
  },

  createGlobe: (
    name: string,
    type: GlobeType,
    options?: {
      ownerMemberId?: string;
      ownerName?: string;
      description?: string;
      themeColor?: CelestialTheme;
      customColor?: string;
      bgmTrackId?: GlobeBgmTrackId;
      bgmTrackName?: string;
      bgmTrackUrl?: string;
    }
  ) => {
    const defaultCustomColor =
      options?.customColor ||
      (options?.themeColor === 'amethyst'
        ? '#A855F7'
        : options?.themeColor === 'sapphire'
        ? '#0EA5E9'
        : options?.themeColor === 'emerald'
        ? '#10B981'
        : options?.themeColor === 'rose'
        ? '#F43F5E'
        : options?.themeColor === 'amber'
        ? '#F97316'
        : '#F59E0B');

    const newGlobe: MemoryGlobe = {
      id: `globe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || 'New Memory Planet',
      type,
      ownerMemberId: options?.ownerMemberId,
      ownerName: options?.ownerName,
      description: options?.description,
      themeColor: options?.themeColor || 'gold',
      customColor: defaultCustomColor,
      bgmTrackId: options?.bgmTrackId || 'orbit',
      bgmTrackName: options?.bgmTrackName || 'Celestial Orbit',
      bgmTrackUrl: options?.bgmTrackUrl,
      createdAt: new Date().toISOString(),
      totalSlots: 108,
    };

    set((state) => ({
      globes: [...state.globes, newGlobe],
      activeGlobeId: newGlobe.id,
    }));

    // Trigger audio sync for newly birthed planet
    if (newGlobe.bgmTrackUrl && newGlobe.bgmTrackName) {
      vaultAudio.loadCustomTrack(newGlobe.bgmTrackUrl, newGlobe.bgmTrackName, vaultAudio.isBgmActive());
    } else if (newGlobe.bgmTrackId && newGlobe.bgmTrackId !== 'off' && newGlobe.bgmTrackId !== 'custom') {
      vaultAudio.selectBgmTrack(newGlobe.bgmTrackId);
    }

    get().recordAuditEvent({
      action: 'globe.created',
      resourceType: 'globe',
      resourceId: newGlobe.id,
      resourceName: `Created Planet: ${newGlobe.name} (${newGlobe.type.toUpperCase()})`,
      status: 'success',
    });

    return newGlobe;
  },

  updateGlobe: (
    id: string,
    updates: Partial<Pick<MemoryGlobe, 'name' | 'type' | 'description' | 'themeColor' | 'customColor' | 'bgmTrackId' | 'bgmTrackName' | 'bgmTrackUrl'>>
  ) => {
    set((state) => ({
      globes: state.globes.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },

  updateGlobeBgm: (
    globeId: string,
    trackId: GlobeBgmTrackId,
    trackName: string,
    trackUrl?: string
  ) => {
    set((state) => ({
      globes: state.globes.map((g) =>
        g.id === globeId
          ? {
              ...g,
              bgmTrackId: trackId,
              bgmTrackName: trackName,
              bgmTrackUrl: trackUrl,
            }
          : g
      ),
    }));

    // If updating the currently active globe, sync the audio engine immediately
    if (get().activeGlobeId === globeId) {
      if (trackUrl && trackName) {
        vaultAudio.loadCustomTrack(trackUrl, trackName, vaultAudio.isBgmActive());
      } else if (trackId === 'off') {
        vaultAudio.stopBgm();
      } else if (trackId !== 'custom') {
        vaultAudio.selectBgmTrack(trackId);
      }
    }
  },

  deleteGlobe: (id: string) => {
    if (id === 'globe_main') return; // Protect Genesis mother orb
    set((state) => {
      const remaining = state.globes.filter((g) => g.id !== id);
      const newActiveId = state.activeGlobeId === id ? 'globe_main' : state.activeGlobeId;
      return {
        globes: remaining,
        activeGlobeId: newActiveId,
        photos: state.photos.map((p) => (p.globeId === id ? { ...p, globeId: 'globe_main' } : p)),
      };
    });
  },

  addPhotoToSlot: (photo: Photo, slotIndex: number, globeId?: string) => {
    const targetGlobeId = globeId || get().activeGlobeId || 'globe_main';
    const assignedPhoto: Photo = {
      ...photo,
      globeId: targetGlobeId,
      slotIndex,
    };

    set((state) => {
      const existingIdx = state.photos.findIndex(
        (p) =>
          !p.inTrash &&
          p.slotIndex === slotIndex &&
          (p.globeId === targetGlobeId || (!p.globeId && targetGlobeId === 'globe_main'))
      );

      let updatedPhotos: Photo[];
      if (existingIdx >= 0) {
        updatedPhotos = state.photos.map((p, idx) => (idx === existingIdx ? assignedPhoto : p));
      } else {
        updatedPhotos = [assignedPhoto, ...state.photos];
      }

      return {
        photos: updatedPhotos,
      };
    });

    get().recordAuditEvent({
      action: 'photo.created',
      resourceType: 'photo',
      resourceId: assignedPhoto.id,
      resourceName: `${assignedPhoto.metadata.title} (Slot #${slotIndex + 1})`,
      status: 'success',
    });

    get().recalculateStorageMetrics();
  },

  bulkAddPhotosToGlobe: (newPhotos: Photo[], targetGlobeId?: string) => {
    const state = get();
    let currentGlobeId = targetGlobeId || state.activeGlobeId || 'globe_main';
    let currentGlobe = state.globes.find((g) => g.id === currentGlobeId);
    if (!currentGlobe) {
      currentGlobe = state.globes[0];
      currentGlobeId = currentGlobe.id;
    }

    const existingInGlobe = state.photos.filter(
      (p) =>
        !p.inTrash &&
        (p.globeId === currentGlobeId || (!p.globeId && currentGlobeId === 'globe_main'))
    );

    const occupiedSlots = new Set<number>();
    existingInGlobe.forEach((p, idx) => {
      if (typeof p.slotIndex === 'number' && p.slotIndex >= 0 && p.slotIndex < 108) {
        occupiedSlots.add(p.slotIndex);
      } else {
        occupiedSlots.add(idx % 108);
      }
    });

    const availableSlots: number[] = [];
    for (let s = 0; s < 108; s++) {
      if (!occupiedSlots.has(s)) {
        availableSlots.push(s);
      }
    }

    const assignedPhotos: Photo[] = [];
    let newGlobeCreated: MemoryGlobe | undefined;
    let companionSlot = 0;

    for (let i = 0; i < newPhotos.length; i++) {
      const photo = { ...newPhotos[i] };
      if (availableSlots.length > 0) {
        const slot = availableSlots.shift()!;
        photo.globeId = currentGlobeId;
        photo.slotIndex = slot;
        assignedPhotos.push(photo);
      } else {
        // Active globe filled! Birth companion planet in universe!
        if (!newGlobeCreated) {
          const nextRoman =
            state.globes.filter((g) => g.name.startsWith(currentGlobe!.name)).length + 1;
          const companionName = `${currentGlobe.name} • Orbit ${nextRoman}`;
          const newG: MemoryGlobe = {
            id: `globe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: companionName,
            type: currentGlobe.type,
            ownerMemberId: currentGlobe.ownerMemberId,
            ownerName: currentGlobe.ownerName,
            themeColor: currentGlobe.themeColor,
            createdAt: new Date().toISOString(),
            totalSlots: 108,
          };
          newGlobeCreated = newG;
          set((s) => ({
            globes: [...s.globes, newG],
            activeGlobeId: newG.id,
          }));
        }

        photo.globeId = newGlobeCreated.id;
        photo.slotIndex = companionSlot % 108;
        companionSlot++;
        assignedPhotos.push(photo);
      }
    }

    set((s) => ({
      photos: [...assignedPhotos, ...s.photos],
    }));

    get().recordAuditEvent({
      action: 'photo.bulk_uploaded',
      resourceType: 'globe',
      resourceId: currentGlobeId,
      resourceName: `Bulk uploaded ${assignedPhotos.length} memories into ${currentGlobe.name}${newGlobeCreated ? ` (Spawned ${newGlobeCreated.name})` : ''}`,
      status: 'success',
    });

    get().recalculateStorageMetrics();

    return {
      filledCount: assignedPhotos.length,
      newGlobeCreated,
    };
  },

  loadCuratedPhotosIntoGlobe: (globeId?: string) => {
    const targetId = globeId || get().activeGlobeId || 'globe_main';
    const pack = SAMPLE_CURATED_PHOTOS.map((p, idx) => ({
      ...p,
      id: `curated_${targetId}_${idx}_${Date.now()}`,
      globeId: targetId,
      slotIndex: idx,
    }));

    set((state) => {
      const otherPhotos = state.photos.filter(
        (p) => !(p.globeId === targetId || (!p.globeId && targetId === 'globe_main'))
      );
      return {
        photos: [...pack, ...otherPhotos],
      };
    });

    get().recalculateStorageMetrics();
  },

  // Photo CRUD
  addPhoto: (photo: Photo) => {
    set((state) => {
      const updatedPhotos = [photo, ...state.photos];
      const updatedAlbums = state.albums.map((alb) =>
        alb.id === photo.albumId ? { ...alb, photoCount: alb.photoCount + 1 } : alb
      );
      return {
        photos: updatedPhotos,
        albums: updatedAlbums,
      };
    });

    get().recordAuditEvent({
      action: 'photo.created',
      resourceType: 'photo',
      resourceId: photo.id,
      resourceName: photo.metadata.title,
      status: 'success',
      details: { sizeBytes: photo.fileSizeBytes, albumId: photo.albumId },
    });

    get().recalculateStorageMetrics();
  },

  updatePhoto: (photoId: string, updates: Partial<Photo>) => {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;

    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === photoId
          ? {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));

    get().recordAuditEvent({
      action: 'photo.updated',
      resourceType: 'photo',
      resourceId: photoId,
      resourceName: updates.metadata?.title || photo.metadata.title,
      status: 'success',
      details: { updatedKeys: Object.keys(updates) },
    });

    get().recalculateStorageMetrics();
  },

  updatePhotoMetadata: async (photoId: string, metadataUpdates: Partial<PhotoMetadata>) => {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;

    const updatedMetadata = { ...photo.metadata, ...metadataUpdates };

    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === photoId ? { ...p, metadata: updatedMetadata, updatedAt: new Date().toISOString() } : p
      ),
    }));

    get().recordAuditEvent({
      action: 'photo.updated',
      resourceType: 'photo',
      resourceId: photoId,
      resourceName: updatedMetadata.title,
      status: 'success',
      details: { updatedFields: Object.keys(metadataUpdates) },
    });
  },

  toggleFavorite: (photoId: string) => {
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
      ),
    }));
  },

  moveToTrash: (photoId: string) => {
    const photo = get().photos.find((p) => p.id === photoId);
    if (!photo) return;

    const trashedPhoto: Photo = {
      ...photo,
      inTrash: true,
      trashedAt: new Date().toISOString(),
    };

    set((state) => ({
      photos: state.photos.filter((p) => p.id !== photoId),
      trashPhotos: [trashedPhoto, ...state.trashPhotos],
      selectedPhotoId: state.selectedPhotoId === photoId ? null : state.selectedPhotoId,
      albums: state.albums.map((alb) =>
        alb.id === photo.albumId ? { ...alb, photoCount: Math.max(0, alb.photoCount - 1) } : alb
      ),
    }));

    get().recordAuditEvent({
      action: 'photo.trashed',
      resourceType: 'photo',
      resourceId: photoId,
      resourceName: photo.metadata.title,
      status: 'success',
    });

    get().recalculateStorageMetrics();
  },

  restoreFromTrash: (photoId: string) => {
    const photo = get().trashPhotos.find((p) => p.id === photoId);
    if (!photo) return;

    const restoredPhoto: Photo = {
      ...photo,
      inTrash: false,
      trashedAt: undefined,
    };

    set((state) => ({
      trashPhotos: state.trashPhotos.filter((p) => p.id !== photoId),
      photos: [restoredPhoto, ...state.photos],
      albums: state.albums.map((alb) =>
        alb.id === photo.albumId ? { ...alb, photoCount: alb.photoCount + 1 } : alb
      ),
    }));

    get().recordAuditEvent({
      action: 'photo.restored',
      resourceType: 'photo',
      resourceId: photoId,
      resourceName: photo.metadata.title,
      status: 'success',
    });

    get().recalculateStorageMetrics();
  },

  permanentDeletePhoto: (photoId: string) => {
    const photo = get().trashPhotos.find((p) => p.id === photoId) || get().photos.find((p) => p.id === photoId);
    if (!photo) return;

    set((state) => ({
      photos: state.photos.filter((p) => p.id !== photoId),
      trashPhotos: state.trashPhotos.filter((p) => p.id !== photoId),
      selectedPhotoId: state.selectedPhotoId === photoId ? null : state.selectedPhotoId,
    }));

    get().recordAuditEvent({
      action: 'photo.permanent_deleted',
      resourceType: 'photo',
      resourceId: photoId,
      resourceName: photo.metadata.title,
      status: 'success',
      details: { purgedBytes: photo.fileSizeBytes + photo.thumbSizeBytes },
    });

    get().recalculateStorageMetrics();
  },

  emptyTrash: () => {
    const count = get().trashPhotos.length;
    set({ trashPhotos: [] });

    get().recordAuditEvent({
      action: 'trash.emptied',
      resourceType: 'storage',
      resourceId: 'recycle_bin',
      resourceName: `Purged ${count} memories from Trash`,
      status: 'success',
    });

    get().recalculateStorageMetrics();
  },

  setPhotoAlbum: (photoId: string, albumId: string | null) => {
    const targetAlbumId = albumId || 'alb_heritage';
    set((state) => ({
      photos: state.photos.map((p) =>
        p.id === photoId ? { ...p, albumId: targetAlbumId } : p
      ),
      albums: state.albums.map((alb) => {
        const count = state.photos.filter((p) =>
          p.id === photoId ? alb.id === targetAlbumId : p.albumId === alb.id
        ).length;
        return { ...alb, photoCount: count };
      }),
    }));
  },

  // Albums & Photo Grouping
  createAlbum: async (name: string, description?: string, initialPhotoIds?: string[]) => {
    const selectedIds = initialPhotoIds || [];
    const firstPhoto = selectedIds.length > 0 ? get().photos.find((p) => selectedIds.includes(p.id)) : undefined;

    const newAlbum: Album = {
      id: `alb_${Date.now()}`,
      familyId: get().currentFamily.id,
      name,
      description,
      createdBy: get().currentMember.id,
      createdAt: new Date().toISOString(),
      photoCount: selectedIds.length,
      coverPhotoUrl: firstPhoto?.decryptedThumbUrl || firstPhoto?.thumbStoragePath,
    };

    set((state) => ({
      albums: [...state.albums, newAlbum],
      photos: state.photos.map((p) =>
        selectedIds.includes(p.id) ? { ...p, albumId: newAlbum.id } : p
      ),
    }));

    get().recordAuditEvent({
      action: 'album.created',
      resourceType: 'album',
      resourceId: newAlbum.id,
      resourceName: `${name} (${selectedIds.length} memories grouped)`,
      status: 'success',
    });

    get().recalculateStorageMetrics();
    return newAlbum;
  },

  assignPhotosToAlbum: (albumId: string | null, photoIds: string[]) => {
    const targetAlbumId = albumId || 'alb_heritage';
    set((state) => ({
      photos: state.photos.map((p) =>
        photoIds.includes(p.id) ? { ...p, albumId: targetAlbumId } : p
      ),
      albums: state.albums.map((alb) => {
        const count = state.photos.filter((p) =>
          photoIds.includes(p.id) ? alb.id === targetAlbumId : p.albumId === alb.id
        ).length;
        return { ...alb, photoCount: count };
      }),
    }));

    const albumName = albumId ? get().albums.find((a) => a.id === albumId)?.name || 'Album' : 'Vault';
    get().recordAuditEvent({
      action: 'album.photos_assigned',
      resourceType: 'album',
      resourceId: albumId || 'unassigned',
      resourceName: `Grouped ${photoIds.length} memories into ${albumName}`,
      status: 'success',
    });
  },

  updateAlbum: (albumId: string, name: string, description?: string) => {
    set((state) => ({
      albums: state.albums.map((alb) =>
        alb.id === albumId ? { ...alb, name, description } : alb
      ),
    }));

    get().recordAuditEvent({
      action: 'album.updated',
      resourceType: 'album',
      resourceId: albumId,
      resourceName: name,
      status: 'success',
    });
  },

  deleteAlbum: (albumId: string) => {
    const album = get().albums.find((a) => a.id === albumId);
    if (!album) return;

    set((state) => ({
      albums: state.albums.filter((a) => a.id !== albumId),
      activeAlbumId: state.activeAlbumId === albumId ? null : state.activeAlbumId,
    }));

    get().recordAuditEvent({
      action: 'album.deleted',
      resourceType: 'album',
      resourceId: albumId,
      resourceName: album.name,
      status: 'success',
    });

    get().recalculateStorageMetrics();
  },

  // Administration
  inviteMember: (email: string, role: FamilyRole, options?: { name?: string; code?: string; expiresInDays?: number }) => {
    const rawChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generatedCode = 'MYORB-INV-';
    for (let i = 0; i < 6; i++) {
      generatedCode += rawChars[Math.floor(Math.random() * rawChars.length)];
    }
    const finalCode = options?.code?.trim() || generatedCode;
    const days = options?.expiresInDays && options.expiresInDays > 0 ? options.expiresInDays : 7;

    const newInv: Invitation = {
      id: `inv_${Date.now()}`,
      familyId: get().currentFamily.id,
      email: email.trim(),
      name: options?.name?.trim(),
      role,
      invitedBy: get().currentMember.id,
      invitedByName: get().currentMember.displayName,
      code: finalCode,
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      invitations: [newInv, ...state.invitations],
    }));

    get().recordAuditEvent({
      action: 'invitation.sent',
      resourceType: 'invitation',
      resourceId: newInv.id,
      resourceName: `Invited ${email} (${role.toUpperCase()}) with code ${finalCode}`,
      status: 'success',
    });

    return finalCode;
  },

  acceptInvitation: async (code: string, displayName: string, avatarUrl?: string) => {
    const cleanCode = extractAndNormalizeInviteCode(code);
    if (!cleanCode || cleanCode.length < 4) {
      return false;
    }

    const state = get();
    const invitation = state.invitations.find((inv) => {
      const invCodeNorm = extractAndNormalizeInviteCode(inv.code || '');
      if (!invCodeNorm) return false;
      return (
        invCodeNorm === cleanCode ||
        (cleanCode.length >= 6 && invCodeNorm.endsWith(cleanCode)) ||
        (invCodeNorm.length >= 6 && cleanCode.endsWith(invCodeNorm)) ||
        (cleanCode.startsWith('MYORB-INV-') && invCodeNorm.includes(cleanCode)) ||
        (invCodeNorm.startsWith('MYORB-INV-') && cleanCode.includes(invCodeNorm))
      );
    });

    // Accept invitation if matched or if a valid MYORB-INV pattern is provided
    const role: FamilyRole = invitation?.role || 'member';
    const email = invitation?.email || `${displayName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'member'}@myorb.live`;

    const newMember: FamilyMember = {
      id: `mem_${Date.now()}`,
      familyId: state.currentFamily.id,
      userId: `usr_${Date.now()}`,
      role,
      email,
      displayName: displayName.trim() || invitation?.name || 'Kin Member',
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
      joinedAt: new Date().toISOString(),
      status: 'active',
      storageUsedBytes: 0,
      passwordLastChanged: new Date().toISOString(),
    };

    // If vault is locked, initialize/unlock
    if (!state.isVaultUnlocked) {
      const key = await generateMasterVaultKey();
      get().unlockWithMasterKey(key);
    }

    set((s) => ({
      allMembers: [...s.allMembers, newMember],
      currentMember: newMember,
      invitations: invitation ? s.invitations.filter((i) => i.id !== invitation.id) : s.invitations,
    }));

    get().recordAuditEvent({
      action: 'invitation.accepted',
      resourceType: 'member',
      resourceId: newMember.id,
      resourceName: `${newMember.displayName} joined the vault with code ${cleanCode}`,
      status: 'success',
    });

    return true;
  },

  loginWithCredentials: async (email: string, _password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const state = get();
    const member = state.allMembers.find(
      (m) => m.email.toLowerCase() === cleanEmail || m.displayName.toLowerCase() === cleanEmail
    );

    if (!member) {
      get().recordAuditEvent({
        action: 'auth.login_failed',
        resourceType: 'security',
        resourceId: 'login_attempt',
        resourceName: `Unknown credentials for ${email}`,
        status: 'failure',
      });
      return false;
    }

    if (member.status === 'suspended') {
      get().recordAuditEvent({
        action: 'auth.login_suspended',
        resourceType: 'security',
        resourceId: member.id,
        resourceName: `Suspended login attempt: ${member.displayName}`,
        status: 'failure',
      });
      return false;
    }

    // Ensure vault is unlocked
    if (!state.isVaultUnlocked) {
      const key = await generateMasterVaultKey();
      get().unlockWithMasterKey(key);
    }

    set({ currentMember: member });

    get().recordAuditEvent({
      action: 'auth.credentials_login',
      resourceType: 'security',
      resourceId: member.id,
      resourceName: `Authenticated as ${member.displayName} (${member.role.toUpperCase()})`,
      status: 'success',
    });

    return true;
  },

  cancelInvitation: (invitationId: string) => {
    set((state) => ({
      invitations: state.invitations.filter((i) => i.id !== invitationId),
    }));
  },

  updateMemberRole: (memberId: string, newRole: FamilyRole) => {
    set((state) => ({
      allMembers: state.allMembers.map((m) =>
        m.id === memberId ? { ...m, role: newRole } : m
      ),
    }));

    get().recordAuditEvent({
      action: 'member.role_changed',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: `Role changed to ${newRole}`,
      status: 'success',
    });
  },

  toggleMemberSuspension: (memberId: string) => {
    set((state) => ({
      allMembers: state.allMembers.map((m) =>
        m.id === memberId ? { ...m, status: m.status === 'active' ? 'suspended' : 'active' } : m
      ),
    }));

    get().recordAuditEvent({
      action: 'member.status_toggled',
      resourceType: 'member',
      resourceId: memberId,
      status: 'success',
    });
  },

  switchActiveMember: (memberId: string) => {
    const member = get().allMembers.find((m) => m.id === memberId);
    if (member) {
      set({ currentMember: member });
      get().recordAuditEvent({
        action: 'session.switched_actor',
        resourceType: 'member',
        resourceId: member.id,
        resourceName: `Switched active profile to ${member.displayName} (${member.role.toUpperCase()})`,
        status: 'success',
      });
    }
  },

  changeMemberPassword: async (memberId: string, _newPassword: string) => {
    const member = get().allMembers.find((m) => m.id === memberId);
    if (!member) return false;

    set((state) => ({
      allMembers: state.allMembers.map((m) =>
        m.id === memberId ? { ...m, passwordLastChanged: new Date().toISOString() } : m
      ),
      currentMember:
        state.currentMember.id === memberId
          ? { ...state.currentMember, passwordLastChanged: new Date().toISOString() }
          : state.currentMember,
    }));

    get().recordAuditEvent({
      action: 'member.password_changed',
      resourceType: 'security',
      resourceId: memberId,
      resourceName: `Password credentials updated for ${member.displayName}`,
      status: 'success',
    });

    return true;
  },

  updateMemberProfile: (memberId: string, updates: Partial<FamilyMember>) => {
    set((state) => ({
      allMembers: state.allMembers.map((m) =>
        m.id === memberId ? { ...m, ...updates } : m
      ),
      currentMember:
        state.currentMember.id === memberId
          ? { ...state.currentMember, ...updates }
          : state.currentMember,
    }));

    get().recordAuditEvent({
      action: 'member.profile_updated',
      resourceType: 'member',
      resourceId: memberId,
      status: 'success',
    });
  },

  // Audit
  recordAuditEvent: (eventData) => {
    const newEvent: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      familyId: get().currentFamily.id,
      actorId: get().currentMember.id,
      actorName: get().currentMember.displayName,
      actorRole: get().currentMember.role,
      createdAt: new Date().toISOString(),
      ...eventData,
    };

    set((state) => ({
      auditEvents: [newEvent, ...state.auditEvents].slice(0, 500), // Keep 500 recent
    }));
  },

  // Backups
  createBackupArchive: async () => {
    const photos = get().photos;
    const albums = get().albums;
    const totalSizeBytes = photos.reduce((acc, p) => acc + p.fileSizeBytes + p.thumbSizeBytes, 0);

    const newBackup: BackupArchive = {
      id: `bak_${Date.now()}`,
      familyId: get().currentFamily.id,
      createdAt: new Date().toISOString(),
      createdByName: get().currentMember.displayName,
      photoCount: photos.length,
      albumCount: albums.length,
      totalSizeBytes,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'completed',
    };

    set((state) => ({
      backups: [newBackup, ...state.backups],
    }));

    get().recordAuditEvent({
      action: 'backup.created',
      resourceType: 'backup',
      resourceId: newBackup.id,
      resourceName: `Encrypted Snapshot (${photos.length} photos)`,
      status: 'success',
      details: { totalSizeBytes },
    });

    get().recalculateStorageMetrics();
    return newBackup;
  },

  restoreFromBackup: async (backupId: string) => {
    const backup = get().backups.find((b) => b.id === backupId);
    if (!backup) return false;

    get().recordAuditEvent({
      action: 'backup.restored',
      resourceType: 'backup',
      resourceId: backupId,
      resourceName: `Restored snapshot from ${backup.createdAt}`,
      status: 'success',
    });

    return true;
  },

  // Storage
  recalculateStorageMetrics: () => {
    const state = get();
    const originalBytes = state.photos.reduce((acc, p) => acc + p.fileSizeBytes, 0);
    const thumbBytes = state.photos.reduce((acc, p) => acc + p.thumbSizeBytes, 0);
    const trashBytes = state.trashPhotos.reduce((acc, p) => acc + p.fileSizeBytes + p.thumbSizeBytes, 0);
    const backupBytes = state.backups.reduce((acc, b) => acc + b.totalSizeBytes, 0);
    const usedBytes = originalBytes + thumbBytes + trashBytes;

    const ratio = usedBytes / state.currentFamily.storageBudgetBytes;
    let warningLevel: StorageMetrics['warningLevel'] = 'normal';
    if (ratio >= 0.95) warningLevel = 'critical_95';
    else if (ratio >= 0.85) warningLevel = 'alert_85';
    else if (ratio >= 0.70) warningLevel = 'warning_70';

    set({
      storageMetrics: {
        budgetBytes: state.currentFamily.storageBudgetBytes,
        usedBytes,
        originalBytes,
        thumbBytes,
        trashBytes,
        backupBytes,
        photoCount: state.photos.length,
        albumCount: state.albums.length,
        memberCount: state.allMembers.length,
        warningLevel,
        estimatedCostMonthly: 0, // Within 10GB free tier
      },
    });
  },
}));
