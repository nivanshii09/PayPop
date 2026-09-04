import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Brain, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Payment, Customer, PaymentStatus, RiskLevel } from '@/types';
import { StatusBadge, RiskBadge } from '@/components/Badges';
import { Avatar } from '@/components/Avatar';
import { PaymentDrawer } from '@/components/PaymentDrawer';
import { RecoveryModal } from '@/components/RecoveryModal';
import { formatCurrency, timeAgo } from '@/lib/aiEngine';

const statusFilters: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'recovered', label: 'Recovered' },
];

const riskFilters: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Risk' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [recoveryPayment, setRecoveryPayment] = useState<Payment | null>(null);

  const loadData = async () => {
    const [{ data: payData }, { data: custData }] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*'),
    ]);
    setPayments(payData ?? []);
    setCustomers(custData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (riskFilter !== 'all' && p.risk_level !== riskFilter) return false;
      if (search) {
        const customer = customerMap.get(p.customer_id);
        const searchText = `${customer?.name ?? ''} ${customer?.email ?? ''} ${customer?.company ?? ''} ${p.failure_reason ?? ''} ${p.gateway}`.toLowerCase();
        if (!searchText.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [payments, statusFilter, riskFilter, search, customerMap]);

  const handleRecovered = async () => {
    setRecoveryPayment(null);
    setSelectedPayment(null);
    await loadData();
  };

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
        <h1 className="font-display font-bold text-2xl text-white mb-1">Payments</h1>
        <p className="text-sm text-gray-400">{filtered.length} payments · {formatCurrency(filtered.reduce((s, p) => s + Number(p.amount), 0))} total</p>
      </div>

      {/* Search + filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by customer, email, company, or failure reason..."
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Status:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? 'bg-purple/20 text-purple-light border border-purple/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-gray-500 ml-8">Risk:</span>
          <div className="flex flex-wrap gap-2">
            {riskFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setRiskFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  riskFilter === f.value
                    ? 'bg-cyan/20 text-cyan-light border border-cyan/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Gateway</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium hidden sm:table-cell">Status</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Risk</th>
                <th className="text-left p-4 font-medium hidden xl:table-cell">Date</th>
                <th className="text-right p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => {
                const customer = customerMap.get(payment.customer_id);
                const canRecover = payment.status === 'failed' || payment.status === 'abandoned';
                return (
                  <tr
                    key={payment.id}
                    onClick={() => setSelectedPayment(payment)}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {customer && <Avatar name={customer.name} color={customer.avatar_color} size="sm" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{customer?.name ?? 'Unknown'}</p>
                          <p className="text-xs text-gray-500 truncate">{customer?.company ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="text-sm text-gray-300 capitalize">{payment.gateway}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold text-white">{formatCurrency(Number(payment.amount))}</span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <RiskBadge level={payment.risk_level} />
                    </td>
                    <td className="p-4 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{timeAgo(payment.created_at)}</span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {canRecover ? (
                        <button
                          onClick={() => setRecoveryPayment(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple/15 text-purple-light text-xs font-medium hover:bg-purple/25 transition-colors"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          Recover
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No payments match your filters</p>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedPayment && (
        <PaymentDrawer
          payment={selectedPayment}
          customer={customerMap.get(selectedPayment.customer_id)}
          onClose={() => setSelectedPayment(null)}
          onRecovery={() => {
            setRecoveryPayment(selectedPayment);
            setSelectedPayment(null);
          }}
        />
      )}

      {/* Recovery modal */}
      {recoveryPayment && (
        <RecoveryModal
          payment={recoveryPayment}
          customer={customerMap.get(recoveryPayment.customer_id)}
          onClose={() => setRecoveryPayment(null)}
          onRecovered={handleRecovered}
        />
      )}
    </div>
  );
}
