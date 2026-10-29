import { z } from 'zod';

export type FamilyRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
  storageBudgetBytes: number;
  storageUsedBytes: number;
  settings: {
    allowMemberInvites: boolean;
    requireMFA: boolean;
    autoTrashDays: number;
    defaultTheme: string;
  };
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  email: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
  status: 'active' | 'suspended';
  storageUsedBytes: number;
  passwordLastChanged?: string;
}

export interface Invitation {
  id: string;
  familyId: string;
  email: string;
  role: FamilyRole;
  invitedBy: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface Album {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  coverPhotoId?: string;
  coverPhotoUrl?: string;
  createdBy: string;
  createdAt: string;
  photoCount: number;
  isPrivate?: boolean;
}

export interface EncryptedLocation {
  latitude: number;
  longitude: number;
  label: string;
  city?: string;
  country?: string;
  isApproximate?: boolean;
}

export interface PhotoMetadata {
  title: string;
  description?: string;
  story?: string;
  captureDate: string; // ISO string or YYYY-MM-DD
  captureTime?: string;
  location?: EncryptedLocation;
  photographer?: string;
  eventName?: string;
  tags: string[];
  mood?: string;
  notes?: string;
  voiceNoteUrl?: string;
}

export interface Photo {
  id: string;
  familyId: string;
  albumId: string;
  uploaderId: string;
  uploaderName: string;
  storagePath: string;
  thumbStoragePath: string;
  fileSizeBytes: number;
  thumbSizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  orientation?: 'landscape' | 'portrait';
  ivHex: string;
  thumbIvHex: string;
  // Decrypted in-memory client-side
  metadata: PhotoMetadata;
  // Encrypted ciphertext representation stored in db
  encryptedMetadataPayload?: string;
  // Local object URLs for active in-memory decrypted previews
  decryptedThumbUrl?: string;
  decryptedFullUrl?: string;
  isFavorite: boolean;
  inTrash: boolean;
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode3D = 
  | 'orb' 
  | 'galaxy' 
  | 'curved_wall' 
  | 'spiral' 
  | 'tunnel' 
  | 'matrix' 
  | 'museum' 
  | 'constellation';

export type UploadState =
  | 'queued'
  | 'processing'
  | 'encrypting'
  | 'authorized'
  | 'uploading'
  | 'verifying'
  | 'saved'
  | 'failed'
  | 'canceled';

export interface UploadBatchItem {
  id: string;
  file: File;
  previewUrl: string;
  state: UploadState;
  progress: number; // 0 to 100
  error?: string;
  metadata: Partial<PhotoMetadata>;
  targetAlbumId: string;
  fileSizeBytes: number;
}

export interface AuditEvent {
  id: string;
  familyId: string;
  actorId: string;
  actorName: string;
  actorRole: FamilyRole;
  action: string;
  resourceType: 'photo' | 'album' | 'member' | 'invitation' | 'backup' | 'storage' | 'security';
  resourceId: string;
  resourceName?: string;
  status: 'success' | 'failure';
  details?: Record<string, any>;
  createdAt: string;
}

export interface StorageMetrics {
  budgetBytes: number;
  usedBytes: number;
  originalBytes: number;
  thumbBytes: number;
  trashBytes: number;
  backupBytes: number;
  photoCount: number;
  albumCount: number;
  memberCount: number;
  warningLevel: 'normal' | 'warning_70' | 'alert_85' | 'critical_95';
  estimatedCostMonthly: number;
}

export interface BackupArchive {
  id: string;
  familyId: string;
  createdAt: string;
  createdByName: string;
  photoCount: number;
  albumCount: number;
  totalSizeBytes: number;
  checksumSha256: string;
  downloadUrl?: string;
  status: 'completed' | 'in_progress' | 'failed';
}

// Zod Schemas for Validation
export const PhotoMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional(),
  story: z.string().max(5000).optional(),
  captureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Valid date (YYYY-MM-DD) required'),
  captureTime: z.string().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    label: z.string().min(1),
    city: z.string().optional(),
    country: z.string().optional(),
    isApproximate: z.boolean().optional(),
  }).optional(),
  photographer: z.string().max(80).optional(),
  eventName: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).default([]),
  mood: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export const InvitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer'] as const),
});
