import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Database,
  Layers,
  Users,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { vaultAudio } from '../../services/audioSynthesizer';

export function StorageDashboard() {
  const { storageMetrics, photos, trashPhotos, emptyTrash, stories, pruneExpiredStories } = useVaultStore();
  const [pruneNotice, setPruneNotice] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleManualPrune = () => {
    vaultAudio.playSnap();
    const count = pruneExpiredStories();
    setPruneNotice(`Pruned ${count} expired stories from ephemeral bucket.`);
    setTimeout(() => setPruneNotice(null), 3500);
  };

  const usedPercent = Math.min(
    100,
    parseFloat(((storageMetrics.usedBytes / storageMetrics.budgetBytes) * 100).toFixed(1))
  );

  const availableBytes = Math.max(0, storageMetrics.budgetBytes - storageMetrics.usedBytes);

  const getWarningBadge = () => {
    switch (storageMetrics.warningLevel) {
      case 'critical_95':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>95% Critical Capacity Reached</span>
          </div>
        );
      case 'alert_85':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>85% Storage Budget Warning</span>
          </div>
        );
      case 'warning_70':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>70% Budget Approaching</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Optimal Free-Tier Headroom</span>
          </div>
        );
    }
  };

  // Find 5 largest memories
  const largestPhotos = [...photos]
    .sort((a, b) => b.fileSizeBytes - a.fileSizeBytes)
    .slice(0, 5);

  const handleExportStorageReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      provider: 'Cloudflare R2 Standard (10GB-month free tier)',
      metrics: storageMetrics,
      breakdown: {
        totalPhotos: storageMetrics.photoCount,
        totalAlbums: storageMetrics.albumCount,
        originalBytesFormatted: formatBytes(storageMetrics.originalBytes),
        thumbBytesFormatted: formatBytes(storageMetrics.thumbBytes),
        trashBytesFormatted: formatBytes(storageMetrics.trashBytes),
        storyBytesFormatted: formatBytes(storageMetrics.storyBytes || 0),
        activeStoriesCount: storageMetrics.storyCount || 0,
        usedBytesFormatted: formatBytes(storageMetrics.usedBytes),
        budgetBytesFormatted: formatBytes(storageMetrics.budgetBytes),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myorb_storage_audit_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Storage Governance & Cloud Limits</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Cloudflare R2 private bucket with zero egress fees and automated quota protection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {getWarningBadge()}
          <button
            onClick={handleExportStorageReport}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 w-full sm:w-auto transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* Main Meter Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-3.5 sm:space-y-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-300">Vault Capacity Utilization</span>
          <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
            {formatBytes(storageMetrics.usedBytes)} / {formatBytes(storageMetrics.budgetBytes)} ({usedPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3.5 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden p-0.5 border border-slate-300 dark:border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usedPercent > 85
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400'
            }`}
            style={{ width: `${Math.max(usedPercent, 2)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4 pt-2 text-xs">
          <div>
            <span className="text-slate-500 block">Available Headroom</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatBytes(availableBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Original Photos</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatBytes(storageMetrics.originalBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">WebP Thumbnails</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{formatBytes(storageMetrics.thumbBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">24h Stories Bucket</span>
            <span className="font-semibold text-amber-600 dark:text-vault-gold font-mono">
              {formatBytes(storageMetrics.storyBytes || 0)} ({storageMetrics.storyCount || 0})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Estimated Cloud Cost</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">$0.00 / mo (Free Tier)</span>
          </div>
        </div>
      </div>

      {/* Storage Buckets Breakdown & Optimization Architecture */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-Bucket Storage Architecture & Quota Optimization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segmented buckets isolate permanent vault assets from ephemeral media to prevent quota bloat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleManualPrune}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-vault-gold border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer w-full sm:w-auto"
              title="Scan and immediately purge any expired 24-hour story from storage"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Purge Expired Stories</span>
            </button>
          </div>
        </div>

        {pruneNotice && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-vault-gold text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{pruneNotice}</span>
          </div>
        )}

        {/* 4 Storage Buckets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Bucket 1: permanent-vault */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider text-[10px]">
                  Bucket: permanent-vault
                </span>
                <span className="text-[10px] font-mono text-slate-400">AES-256</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Permanent Family Memories</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Full-resolution master photographs and WebP thumbnails preserved indefinitely across memory planets.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">{storageMetrics.photoCount} photos</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {formatBytes(storageMetrics.originalBytes + storageMetrics.thumbBytes)}
              </span>
            </div>
          </div>

          {/* Bucket 2: ephemeral-stories */}
          <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] dark:bg-vault-gold/[0.04] border border-amber-500/25 dark:border-vault-gold/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-amber-700 dark:text-vault-gold font-semibold uppercase tracking-wider text-[10px]">
                  Bucket: ephemeral-stories
                </span>
                <span className="text-[9px] font-mono text-amber-600 dark:text-vault-gold bg-amber-500/15 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                  24h TTL
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">24-Hour Ephemeral Stories</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Optimized web-compressed snapshots. Automatically purged exactly after 24 hours to reclaim 100% of storage.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-amber-500/15 dark:border-vault-gold/20 flex items-center justify-between font-mono text-xs">
              <span className="text-amber-700 dark:text-amber-300">{storageMetrics.storyCount || 0} active</span>
              <span className="font-semibold text-amber-600 dark:text-vault-gold">
                {formatBytes(storageMetrics.storyBytes || 0)}
              </span>
            </div>
          </div>

          {/* Bucket 3: trash-staging */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-rose-500 font-semibold uppercase tracking-wider text-[10px]">
                  Bucket: trash-staging
                </span>
                <span className="text-[10px] font-mono text-slate-400">30d Purge</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Recycle Bin Staging</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Soft-deleted memories held for 30 days before permanent zero-trace deletion.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">{trashPhotos.length} items</span>
              <span className="font-semibold text-rose-500">{formatBytes(storageMetrics.trashBytes)}</span>
            </div>
          </div>

          {/* Bucket 4: vault-backups */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold uppercase tracking-wider text-[10px]">
                  Bucket: vault-backups
                </span>
                <span className="text-[10px] font-mono text-slate-400">Cold Store</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Encrypted Snapshots</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Cryptographically sealed full-vault disaster recovery archives with SHA-256 integrity validation.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-500">Immutable</span>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">{formatBytes(storageMetrics.backupBytes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Storage Distribution */}
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Object Distribution</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-transparent">
              <span className="text-slate-700 dark:text-slate-300">Active Photos</span>
              <span className="font-mono text-purple-700 dark:text-purple-300 font-semibold">{storageMetrics.photoCount} items</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-transparent">
              <span className="text-slate-700 dark:text-slate-300">Albums</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">{storageMetrics.albumCount} collections</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-transparent">
              <span className="text-slate-700 dark:text-slate-300">Recycle Bin Items</span>
              <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">{trashPhotos.length} items</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-transparent">
              <span className="text-slate-700 dark:text-slate-300">Snapshots & Backups</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{formatBytes(storageMetrics.backupBytes)}</span>
            </div>
          </div>
        </div>

        {/* Center: Largest Memories */}
        <div className="glass-panel p-5 rounded-3xl border border-black/10 dark:border-white/10 space-y-4 md:col-span-2 bg-white dark:glass-panel text-slate-900 dark:text-white shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Largest Preserved Memory Files</span>
            </h3>
            {trashPhotos.length > 0 && (
              <button
                onClick={emptyTrash}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash ({formatBytes(storageMetrics.trashBytes)})</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {largestPhotos.length > 0 ? (
              largestPhotos.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={p.decryptedThumbUrl || p.thumbStoragePath}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                    />
                    <div className="truncate">
                      <div className="font-medium text-slate-200 truncate">{p.metadata.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.mimeType} • {p.metadata.captureDate}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-purple-400 font-semibold flex-shrink-0">
                    {formatBytes(p.fileSizeBytes)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Upload photographs to generate storage profiling.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
