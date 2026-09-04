import { useEffect, useState, useMemo } from 'react';
import { Search, X, Filter, ScrollText, Brain, ShieldCheck, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/types';
import { formatDateTime, timeAgo } from '@/lib/aiEngine';

const actionConfig: Record<string, { icon: typeof Brain; color: string; bg: string }> = {
  recovery_executed: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  recovery_rejected: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
  analysis_completed: { icon: Brain, color: 'text-purple-light', bg: 'bg-purple-500/10' },
  safety_check_passed: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  safety_check_failed: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
  payment_succeeded: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  payment_failed: { icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
};

const actionFilters = [
  { value: 'all', label: 'All' },
  { value: 'recovery_executed', label: 'Recoveries' },
  { value: 'analysis_completed', label: 'AI Analysis' },
  { value: 'safety_check_passed', label: 'Safety Passed' },
  { value: 'safety_check_failed', label: 'Safety Failed' },
  { value: 'recovery_rejected', label: 'Rejected' },
];

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (search) {
        const text = `${log.description} ${log.actor} ${log.action}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, actionFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple/30 border-t-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-white mb-1">Audit Logs</h1>
        <p className="text-sm text-gray-400">{filtered.length} entries · Full recovery trail and system events</p>
      </div>

      {/* Search + filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-850 border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {actionFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActionFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                actionFilter === f.value
                  ? 'bg-purple/20 text-purple-light border border-purple/40'
                  : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-purple-light" />
          <h3 className="font-semibold text-white">Event Timeline</h3>
        </div>

        <div className="space-y-1">
          {filtered.map((log, i) => {
            const config = actionConfig[log.action] ?? { icon: ScrollText, color: 'text-gray-400', bg: 'bg-gray-500/10' };
            const Icon = config.icon;
            return (
              <div key={log.id} className="flex gap-4 group">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.bg} shrink-0 z-10`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  {i < filtered.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-white font-medium leading-snug">{log.description}</p>
                    <span className="text-xs text-gray-500 shrink-0">{timeAgo(log.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">{log.actor}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
                  </div>

                  {/* Metadata */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-navy-950/50 border border-white/5">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-gray-500">{key}: </span>
                            <span className="text-gray-300 font-mono">
                              {typeof value === 'number' && key === 'amount' ? `$${Number(value).toFixed(2)}` : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No audit logs match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
