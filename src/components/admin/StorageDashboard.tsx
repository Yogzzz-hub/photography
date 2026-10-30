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
} from 'lucide-react';

export function StorageDashboard() {
  const { storageMetrics, photos, trashPhotos, emptyTrash } = useVaultStore();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Storage Governance & Cloud Limits</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cloudflare R2 private bucket with zero egress fees and automated quota protection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {getWarningBadge()}
          <button
            onClick={handleExportStorageReport}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl glass-panel-interactive text-xs font-medium text-slate-200 w-full sm:w-auto"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* Main Meter Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 space-y-3.5 sm:space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">Vault Capacity Utilization</span>
          <span className="text-sm font-bold font-mono text-purple-400">
            {formatBytes(storageMetrics.usedBytes)} / {formatBytes(storageMetrics.budgetBytes)} ({usedPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3.5 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usedPercent > 85
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400'
            }`}
            style={{ width: `${Math.max(usedPercent, 2)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-2 text-xs">
          <div>
            <span className="text-slate-500 block">Available Headroom</span>
            <span className="font-semibold text-slate-200 font-mono">{formatBytes(availableBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Original Photos</span>
            <span className="font-semibold text-slate-200 font-mono">{formatBytes(storageMetrics.originalBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">WebP Thumbnails</span>
            <span className="font-semibold text-slate-200 font-mono">{formatBytes(storageMetrics.thumbBytes)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Estimated Cloud Cost</span>
            <span className="font-semibold text-emerald-400 font-mono">$0.00 / mo (Free Tier)</span>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Storage Distribution */}
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Object Distribution</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <span className="text-slate-300">Active Photos</span>
              <span className="font-mono text-purple-300">{storageMetrics.photoCount} items</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <span className="text-slate-300">Albums</span>
              <span className="font-mono text-cyan-300">{storageMetrics.albumCount} collections</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <span className="text-slate-300">Recycle Bin Items</span>
              <span className="font-mono text-amber-300">{trashPhotos.length} items</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <span className="text-slate-300">Snapshots & Backups</span>
              <span className="font-mono text-slate-300">{formatBytes(storageMetrics.backupBytes)}</span>
            </div>
          </div>
        </div>

        {/* Center: Largest Memories */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
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
