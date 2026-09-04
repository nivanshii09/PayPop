import type { PaymentStatus, RiskLevel, RecoveryStatus } from '@/types';

const statusConfig: Record<PaymentStatus, { label: string; className: string; dot: string }> = {
  succeeded: { label: 'Succeeded', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  abandoned: { label: 'Abandoned', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30', dot: 'bg-orange-400' },
  recovered: { label: 'Recovered', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-400' },
};

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: 'Low Risk', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  medium: { label: 'Medium Risk', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  high: { label: 'High Risk', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

const recoveryConfig: Record<RecoveryStatus, { label: string; className: string }> = {
  none: { label: 'No Recovery', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  pending: { label: 'Recovery Pending', className: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  recovered: { label: 'Recovered', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config = riskConfig[level];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export function RecoveryBadge({ status }: { status: RecoveryStatus }) {
  const config = recoveryConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
