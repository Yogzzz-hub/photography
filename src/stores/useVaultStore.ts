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
} from '../types';
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
import { INITIAL_SAMPLE_PHOTOS } from '../services/sampleData';

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

  // Photo CRUD & Mutation
  addPhoto: (photo: Photo) => void;
  updatePhotoMetadata: (photoId: string, metadata: Partial<PhotoMetadata>) => Promise<void>;
  toggleFavorite: (photoId: string) => void;
  moveToTrash: (photoId: string) => void;
  restoreFromTrash: (photoId: string) => void;
  permanentDeletePhoto: (photoId: string) => void;
  emptyTrash: () => void;

  // Album CRUD
  createAlbum: (name: string, description?: string) => Promise<Album>;
  updateAlbum: (albumId: string, name: string, description?: string) => void;
  deleteAlbum: (albumId: string) => void;

  // Family Administration
  inviteMember: (email: string, role: FamilyRole) => void;
  cancelInvitation: (invitationId: string) => void;
  updateMemberRole: (memberId: string, newRole: FamilyRole) => void;
  toggleMemberSuspension: (memberId: string) => void;
  switchActiveMember: (memberId: string) => void;
  changeMemberPassword: (memberId: string, newPassword: string) => Promise<boolean>;
  updateMemberProfile: (memberId: string, updates: { displayName?: string; avatarUrl?: string }) => void;

  // Audit Ledger
  recordAuditEvent: (event: Omit<AuditEvent, 'id' | 'createdAt' | 'familyId' | 'actorId' | 'actorName' | 'actorRole'>) => void;

  // Backups
  createBackupArchive: () => Promise<BackupArchive>;
  restoreFromBackup: (backupId: string) => Promise<boolean>;

  // Storage Reconciliation
  recalculateStorageMetrics: () => void;
}

// Initial Mock Family & User Session for immediate out-of-the-box operation
const initialFamily: Family = {
  id: 'fam_orb_001',
  name: 'Vanderbilt Family Vault',
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
  id: 'mem_001',
  familyId: 'fam_orb_001',
  userId: 'usr_001',
  role: 'owner',
  email: 'elena@vanderbilt-family.org',
  displayName: 'Elena Vanderbilt',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
  joinedAt: '2024-01-15T09:00:00Z',
  status: 'active',
  storageUsedBytes: 0,
};

const initialMembersList: FamilyMember[] = [
  initialMember,
  {
    id: 'mem_002',
    familyId: 'fam_orb_001',
    userId: 'usr_002',
    role: 'admin',
    email: 'marcus@vanderbilt-family.org',
    displayName: 'Marcus Vanderbilt',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-01-16T11:20:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
  {
    id: 'mem_003',
    familyId: 'fam_orb_001',
    userId: 'usr_003',
    role: 'member',
    email: 'clara@vanderbilt-family.org',
    displayName: 'Clara Vanderbilt',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-02-01T15:45:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
  {
    id: 'mem_004',
    familyId: 'fam_orb_001',
    userId: 'usr_004',
    role: 'viewer',
    email: 'grandpa.arthur@gmail.com',
    displayName: 'Grandpa Arthur',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80',
    joinedAt: '2024-02-14T10:00:00Z',
    status: 'active',
    storageUsedBytes: 0,
  },
];

const initialAlbums: Album[] = [
  {
    id: 'alb_heritage',
    familyId: 'fam_orb_001',
    name: 'Ancestral Heritage & Roots',
    description: 'Generations of memories, vintage portraits, and historic estate gatherings.',
    createdBy: 'mem_001',
    createdAt: '2024-01-15T10:00:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'alb_travels',
    familyId: 'fam_orb_001',
    name: 'Wanderlust & Grand Expeditions',
    description: 'Adventures across continents, alpine trails, coastal sunsets, and ancient cities.',
    createdBy: 'mem_002',
    createdAt: '2024-02-01T12:00:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'alb_celebrations',
    familyId: 'fam_orb_001',
    name: 'Milestones & Celebrations',
    description: 'Weddings, golden anniversaries, graduations, and joyful reunions.',
    createdBy: 'mem_001',
    createdAt: '2024-03-10T14:30:00Z',
    photoCount: 0,
    coverPhotoUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  },
];

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
      familyId: 'fam_orb_001',
      email: 'cousin.julian@outlook.com',
      role: 'member',
      invitedBy: 'mem_001',
      invitedByName: 'Elena Vanderbilt',
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

  // Data Collections
  photos: INITIAL_SAMPLE_PHOTOS,
  albums: initialAlbums,
  trashPhotos: [],
  auditEvents: [
    {
      id: 'evt_init',
      familyId: 'fam_orb_001',
      actorId: 'mem_001',
      actorName: 'Elena Vanderbilt',
      actorRole: 'owner',
      action: 'vault.initialized',
      resourceType: 'security',
      resourceId: 'fam_orb_001',
      resourceName: 'Vanderbilt Family Vault',
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

  // Albums
  createAlbum: async (name: string, description?: string) => {
    const newAlbum: Album = {
      id: `alb_${Date.now()}`,
      familyId: get().currentFamily.id,
      name,
      description,
      createdBy: get().currentMember.id,
      createdAt: new Date().toISOString(),
      photoCount: 0,
    };

    set((state) => ({
      albums: [...state.albums, newAlbum],
    }));

    get().recordAuditEvent({
      action: 'album.created',
      resourceType: 'album',
      resourceId: newAlbum.id,
      resourceName: name,
      status: 'success',
    });

    get().recalculateStorageMetrics();
    return newAlbum;
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
  inviteMember: (email: string, role: FamilyRole) => {
    const newInv: Invitation = {
      id: `inv_${Date.now()}`,
      familyId: get().currentFamily.id,
      email,
      role,
      invitedBy: get().currentMember.id,
      invitedByName: get().currentMember.displayName,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      invitations: [newInv, ...state.invitations],
    }));

    get().recordAuditEvent({
      action: 'invitation.sent',
      resourceType: 'invitation',
      resourceId: newInv.id,
      resourceName: `Invited ${email} (${role})`,
      status: 'success',
    });
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

  updateMemberProfile: (memberId: string, updates: { displayName?: string; avatarUrl?: string }) => {
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
