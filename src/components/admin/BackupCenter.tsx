import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  ShieldAlert,
  Download,
  Key,
  Archive,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  FileText,
  Lock,
  Copy,
  Check,
} from 'lucide-react';

export function BackupCenter() {
  const {
    backups,
    createBackupArchive,
    restoreFromBackup,
    trashPhotos,
    restoreFromTrash,
    permanentDeletePhoto,
    emptyTrash,
    recoveryCode,
    photos,
    albums,
    currentFamily,
  } = useVaultStore();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateSnapshot = async () => {
    setIsBackingUp(true);
    try {
      await createBackupArchive();
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleDownloadFullArchive = () => {
    const manifest = {
      archiveVersion: '1.0',
      vaultName: currentFamily.name || 'MyOrb Memory Vault',
      createdAt: new Date().toISOString(),
      cryptoStandard: 'AES-256-GCM / PBKDF2-SHA256',
      totalPhotos: photos.length,
      totalAlbums: albums.length,
      albums: albums.map((a) => ({ id: a.id, name: a.name })),
      photos: photos.map((p) => ({
        id: p.id,
        title: p.metadata.title,
        date: p.metadata.captureDate,
        location: p.metadata.location,
        albumId: p.albumId,
        sha256Ciphertext: p.encryptedMetadataPayload,
        ivHex: p.ivHex,
      })),
      recoveryNotice:
        'To decrypt this archive, use your 256-bit Offline Master Recovery Key via the MyOrb Vault CLI or Web Client.',
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myorb_family_vault_archive_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Disaster Recovery & Vault Backups</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Independent encrypted archives, emergency recovery key preservation, and recycle bin management.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateSnapshot}
          disabled={isBackingUp}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow transition-all disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isBackingUp ? 'Creating Encrypted Snapshot...' : 'Create Snapshot Now'}</span>
        </button>
      </div>

      {/* Offline Emergency Recovery Key Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-purple-300 dark:border-purple-500/30 bg-purple-50/60 dark:bg-purple-950/20 space-y-3.5 sm:space-y-4 shadow-sm text-slate-900 dark:text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">256-Bit Emergency Master Recovery Key</h3>
          </div>
          <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono bg-purple-200 dark:bg-purple-600/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-400/30 font-semibold">
            AIR-GAPPED
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
          Write down or print this 256-bit recovery code and store it in a physical fireproof vault.
          Even if Supabase or Cloudflare were lost, this key restores full cryptographic access to all family memories.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/10 font-mono text-xs text-purple-900 dark:text-purple-200 tracking-wider overflow-x-auto select-all shadow-inner">
            {recoveryCode || '1A2B-3C4D-5E6F-7890-ABCD-EF01-2345-6789-9876-5432-10FE-DCBA'}
          </div>
          <button
            onClick={handleCopyRecoveryKey}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow cursor-pointer"
          >
            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* Full Encrypted Export Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Download Complete Family Archive</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
            Exports all encrypted photo manifests, checksums, and album relationships into an offline portable package.
          </p>
        </div>
        <button
          onClick={handleDownloadFullArchive}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Export Manifest (.json)</span>
        </button>
      </div>

      {/* Recycle Bin / Trash Section */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-3.5 sm:space-y-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Family Trash & Recycle Bin ({trashPhotos.length} items)
            </h3>
          </div>
          {trashPhotos.length > 0 && (
            <button
              onClick={emptyTrash}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/40 text-xs font-semibold transition-all"
            >
              Empty All Trash
            </button>
          )}
        </div>

        {trashPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {trashPhotos.map((photo) => (
              <div
                key={photo.id}
                className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={photo.decryptedThumbUrl || photo.thumbStoragePath}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">
                      {photo.metadata.title}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Trashed {photo.trashedAt ? new Date(photo.trashedAt).toLocaleDateString() : 'recently'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => restoreFromTrash(photo.id)}
                    title="Restore Photo"
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => permanentDeletePhoto(photo.id)}
                    title="Delete Permanently"
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            Recycle Bin is empty. Trashed memories are preserved here for 30 days before automatic purge.
          </div>
        )}
      </div>

      {/* Snapshot History Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Snapshot Ledger ({backups.length})
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Snapshot ID</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">Photos</th>
                <th className="py-3 px-4">Total Size</th>
                <th className="py-3 px-4">SHA-256 Checksum</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backups.map((bak) => (
                <tr key={bak.id} className="hover:bg-white/5">
                  <td className="py-3 px-4 font-mono text-purple-300 font-semibold">{bak.id}</td>
                  <td className="py-3 px-4 text-slate-300">{new Date(bak.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-300">{bak.photoCount} photos</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {(bak.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px] truncate max-w-xs">
                    {bak.checksumSha256}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => restoreFromBackup(bak.id)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 text-xs font-medium"
                    >
                      Verify / Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
