import { useState, useMemo } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  Activity,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Shield,
  User,
  Image as ImageIcon,
  Folder,
  Calendar,
} from 'lucide-react';

export function ActivityHistory() {
  const { auditEvents } = useVaultStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    return auditEvents.filter((evt) => {
      if (filterAction !== 'all' && !evt.action.startsWith(filterAction)) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchActor = evt.actorName.toLowerCase().includes(q);
        const matchAction = evt.action.toLowerCase().includes(q);
        const matchResource = evt.resourceName?.toLowerCase().includes(q);
        if (!matchActor && !matchAction && !matchResource) return false;
      }
      return true;
    });
  }, [auditEvents, filterAction, searchTerm]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Resource Type', 'Resource', 'Status'];
    const rows = filteredEvents.map((e) => [
      e.createdAt,
      `"${e.actorName}"`,
      e.actorRole,
      e.action,
      e.resourceType,
      `"${e.resourceName || e.resourceId}"`,
      e.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myorb_audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'security':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'photo':
        return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      case 'album':
        return <Folder className="w-4 h-4 text-amber-400" />;
      case 'member':
        return <User className="w-4 h-4 text-emerald-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Family Activity & Audit Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only tamper-evident event log. Plaintext keys and private media are never logged.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-panel-interactive text-xs font-semibold text-slate-200"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by family member, action, or memory title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-purple-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="glass-input p-2 rounded-xl text-xs w-full sm:w-48"
          >
            <option value="all" className="bg-slate-900">All Operations</option>
            <option value="photo" className="bg-slate-900">Photo Events</option>
            <option value="album" className="bg-slate-900">Album Events</option>
            <option value="member" className="bg-slate-900">Member Events</option>
            <option value="auth" className="bg-slate-900">Auth & Security</option>
            <option value="backup" className="bg-slate-900">Backup Events</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Resource</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{evt.actorName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-300 font-mono">
                          {evt.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(evt.resourceType)}
                        <span className="font-mono text-slate-300">{evt.action}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {evt.resourceName || evt.resourceId}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {evt.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No matching activity events found in vault ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
