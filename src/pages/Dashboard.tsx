import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Zap, DollarSign, ArrowUpRight, Brain, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Payment, Customer, AuditLog } from '@/types';
import { StatCard } from '@/components/StatCard';
import { StatusBadge, RiskBadge } from '@/components/Badges';
import { Avatar } from '@/components/Avatar';
import { formatCurrency, formatCompactCurrency, timeAgo } from '@/lib/aiEngine';
import type { PageId } from '@/components/Sidebar';

interface DashboardProps {
  onNavigate: (page: PageId) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: payData }, { data: custData }, { data: logData }] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
      ]);
      setPayments(payData ?? []);
      setCustomers(custData ?? []);
      setAuditLogs(logData ?? []);
      setLoading(false);
    })();
  }, []);

  const failedPayments = payments.filter((p) => p.status === 'failed' || p.status === 'abandoned');
  const recoveredPayments = payments.filter((p) => p.status === 'recovered');
  const totalRevenue = payments.filter((p) => p.status === 'succeeded' || p.status === 'recovered').reduce((s, p) => s + Number(p.amount), 0);
  const atRiskRevenue = failedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const recoveredRevenue = recoveredPayments.reduce((s, p) => s + Number(p.amount), 0);
  const recoveryRate = failedPayments.length + recoveredPayments.length > 0
    ? Math.round((recoveredPayments.length / (failedPayments.length + recoveredPayments.length)) * 100)
    : 0;

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const recentPayments = payments.slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 rounded-full border-2 border-purple/30 border-t-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white mb-1">Dashboard</h1>
        <p className="text-sm text-gray-400">Revenue recovery overview at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue Processed" value={formatCompactCurrency(totalRevenue)} icon={DollarSign} trend="+12.4%" trendUp gradient="from-emerald-500 to-cyan" glow="glow-cyan" />
        <StatCard label="Revenue at Risk" value={formatCompactCurrency(atRiskRevenue)} icon={AlertCircle} trend={`${failedPayments.length} payments`} trendUp={false} gradient="from-red-500 to-pink" glow="glow-pink" />
        <StatCard label="Recovered Revenue" value={formatCompactCurrency(recoveredRevenue)} icon={Zap} trend={`${recoveryRate}% rate`} trendUp gradient="from-purple to-cyan" glow="glow-purple" />
        <StatCard label="Active Customers" value={String(customers.length)} icon={TrendingUp} trend="+3 this month" trendUp gradient="from-cyan to-purple" glow="glow-cyan" />
      </div>

      {/* Recovery rate bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-light" />
            <h3 className="font-semibold text-white">AI Recovery Rate</h3>
          </div>
          <span className="text-2xl font-bold font-display gradient-text">{recoveryRate}%</span>
        </div>
        <div className="w-full h-3 rounded-full bg-navy-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple via-cyan to-pink transition-all duration-1000"
            style={{ width: `${recoveryRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{recoveredPayments.length} recovered</span>
          <span>{failedPayments.length} still at risk</span>
        </div>
      </div>

      {/* Recent payments + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent payments */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Payments</h3>
            <button onClick={() => onNavigate('payments')} className="text-xs text-purple-light hover:text-purple flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentPayments.map((payment) => {
              const customer = customerMap.get(payment.customer_id);
              return (
                <div key={payment.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  {customer && <Avatar name={customer.name} color={customer.avatar_color} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{customer?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{payment.gateway} · {timeAgo(payment.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={payment.risk_level} />
                    <StatusBadge status={payment.status} />
                    <span className="text-sm font-semibold text-white w-20 text-right">{formatCurrency(Number(payment.amount))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-light" />
            <h3 className="font-semibold text-white">Activity Feed</h3>
          </div>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-purple mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white leading-snug">{log.description}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{log.actor} · {timeAgo(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
