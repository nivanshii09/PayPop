import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Brain, Zap, AlertCircle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Payment, Customer } from '@/types';
import { StatCard } from '@/components/StatCard';
import { formatCurrency, formatCompactCurrency } from '@/lib/aiEngine';

export function Analytics() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: payData }, { data: custData }] = await Promise.all([
        supabase.from('payments').select('*'),
        supabase.from('customers').select('*'),
      ]);
      setPayments(payData ?? []);
      setCustomers(custData ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const succeeded = payments.filter((p) => p.status === 'succeeded');
    const failed = payments.filter((p) => p.status === 'failed');
    const abandoned = payments.filter((p) => p.status === 'abandoned');
    const recovered = payments.filter((p) => p.status === 'recovered');
    const pending = payments.filter((p) => p.status === 'pending');

    const totalRevenue = [...succeeded, ...recovered].reduce((s, p) => s + Number(p.amount), 0);
    const lostRevenue = [...failed, ...abandoned].reduce((s, p) => s + Number(p.amount), 0);
    const recoveredRevenue = recovered.reduce((s, p) => s + Number(p.amount), 0);
    const recoveryRate = failed.length + recovered.length > 0
      ? Math.round((recovered.length / (failed.length + recovered.length)) * 100)
      : 0;

    // Gateway breakdown
    const gatewayMap = new Map<string, { count: number; amount: number }>();
    payments.forEach((p) => {
      const g = p.gateway;
      const cur = gatewayMap.get(g) ?? { count: 0, amount: 0 };
      gatewayMap.set(g, { count: cur.count + 1, amount: cur.amount + Number(p.amount) });
    });
    const gatewayData = Array.from(gatewayMap.entries()).map(([name, val]) => ({ name, ...val })).sort((a, b) => b.amount - a.amount);

    // Failure reasons
    const reasonMap = new Map<string, number>();
    payments.filter((p) => p.failure_reason).forEach((p) => {
      const reason = p.failure_reason!;
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    });
    const reasonData = Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);

    // Risk distribution
    const riskCounts = { low: 0, medium: 0, high: 0 };
    payments.forEach((p) => { riskCounts[p.risk_level]++; });

    // Daily trend (last 7 days)
    const dayMap = new Map<string, { revenue: number; failed: number; recovered: number }>();
    payments.forEach((p) => {
      const day = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const cur = dayMap.get(day) ?? { revenue: 0, failed: 0, recovered: 0 };
      if (p.status === 'succeeded' || p.status === 'recovered') cur.revenue += Number(p.amount);
      if (p.status === 'failed' || p.status === 'abandoned') cur.failed += Number(p.amount);
      if (p.status === 'recovered') cur.recovered += Number(p.amount);
      dayMap.set(day, cur);
    });
    const trendData = Array.from(dayMap.entries()).slice(-7).map(([day, val]) => ({ day, ...val }));

    return {
      totalRevenue, lostRevenue, recoveredRevenue, recoveryRate,
      gatewayData, reasonData, riskCounts,
      succeeded: succeeded.length, failed: failed.length, abandoned: abandoned.length,
      recovered: recovered.length, pending: pending.length,
      trendData,
    };
  }, [payments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple/30 border-t-purple animate-spin" />
      </div>
    );
  }

  const maxGatewayAmount = Math.max(...stats.gatewayData.map((g) => g.amount), 1);
  const maxReasonCount = Math.max(...stats.reasonData.map((r) => r.count), 1);
  const maxTrendRevenue = Math.max(...stats.trendData.map((t) => t.revenue), 1);
  const totalRisk = stats.riskCounts.low + stats.riskCounts.medium + stats.riskCounts.high;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-white mb-1">Analytics</h1>
        <p className="text-sm text-gray-400">Deep insights into payment performance and recovery</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCompactCurrency(stats.totalRevenue)} icon={DollarSign} gradient="from-emerald-500 to-cyan" glow="glow-cyan" />
        <StatCard label="Lost Revenue" value={formatCompactCurrency(stats.lostRevenue)} icon={AlertCircle} gradient="from-red-500 to-pink" glow="glow-pink" />
        <StatCard label="Recovered" value={formatCompactCurrency(stats.recoveredRevenue)} icon={Zap} trend={`${stats.recoveryRate}% rate`} trendUp gradient="from-purple to-cyan" glow="glow-purple" />
        <StatCard label="AI Recoveries" value={String(stats.recovered)} icon={Brain} gradient="from-cyan to-purple" glow="glow-cyan" />
      </div>

      {/* Revenue trend */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-light" />
          <h3 className="font-semibold text-white">Revenue Trend</h3>
        </div>
        <div className="flex items-end justify-between gap-2 h-40">
          {stats.trendData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-purple to-cyan transition-all duration-1000 hover:opacity-80"
                  style={{ height: `${(d.revenue / maxTrendRevenue) * 100}%`, minHeight: '4px' }}
                  title={formatCurrency(d.revenue)}
                />
              </div>
              <span className="text-[10px] text-gray-500 truncate">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway breakdown */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Revenue by Gateway</h3>
          <div className="space-y-3">
            {stats.gatewayData.map((g) => (
              <div key={g.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white capitalize">{g.name}</span>
                  <span className="text-sm text-gray-400">{formatCurrency(g.amount)} · {g.count} txns</span>
                </div>
                <div className="w-full h-2 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple to-cyan transition-all duration-1000"
                    style={{ width: `${(g.amount / maxGatewayAmount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failure reasons */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Failure Reasons</h3>
          <div className="space-y-3">
            {stats.reasonData.map((r) => (
              <div key={r.reason}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate pr-2">{r.reason}</span>
                  <span className="text-sm text-gray-400 shrink-0">{r.count}x</span>
                </div>
                <div className="w-full h-2 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink to-red-500 transition-all duration-1000"
                    style={{ width: `${(r.count / maxReasonCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk distribution */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Risk Distribution</h3>
          <div className="space-y-4">
            {(['high', 'medium', 'low'] as const).map((level) => {
              const count = stats.riskCounts[level];
              const pct = totalRisk > 0 ? Math.round((count / totalRisk) * 100) : 0;
              const colors = {
                high: 'from-red-500 to-pink',
                medium: 'from-amber-500 to-orange-400',
                low: 'from-emerald-500 to-cyan',
              };
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white capitalize">{level} Risk</span>
                    <span className="text-sm text-gray-400">{count} payments · {pct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-navy-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors[level]} transition-all duration-1000`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment status breakdown */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Payment Status Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatusTile label="Succeeded" count={stats.succeeded} color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatusTile label="Failed" count={stats.failed} color="text-red-400" bg="bg-red-500/10" />
            <StatusTile label="Abandoned" count={stats.abandoned} color="text-orange-400" bg="bg-orange-500/10" />
            <StatusTile label="Recovered" count={stats.recovered} color="text-cyan-400" bg="bg-cyan-500/10" />
            <StatusTile label="Pending" count={stats.pending} color="text-amber-400" bg="bg-amber-500/10" />
            <StatusTile label="Total" count={payments.length} color="text-purple-light" bg="bg-purple-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusTile({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className={`p-3 rounded-xl ${bg} text-center`}>
      <p className={`text-2xl font-bold font-display ${color}`}>{count}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
