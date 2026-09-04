import { useEffect, useState, useMemo } from 'react';
import { Search, X, Building2, Mail, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Customer, Payment } from '@/types';
import { Avatar } from '@/components/Avatar';
import { StatusBadge, RiskBadge } from '@/components/Badges';
import { PaymentDrawer } from '@/components/PaymentDrawer';
import { RecoveryModal } from '@/components/RecoveryModal';
import { formatCurrency, formatDate } from '@/lib/aiEngine';

const tierConfig = {
  low: { label: 'Low Risk', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  medium: { label: 'Medium Risk', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  high: { label: 'High Risk', className: 'text-red-300 bg-red-500/10 border-red-500/30' },
};

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [recoveryPayment, setRecoveryPayment] = useState<Payment | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: custData }, { data: payData }] = await Promise.all([
        supabase.from('customers').select('*').order('lifetime_value', { ascending: false }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
      ]);
      setCustomers(custData ?? []);
      setPayments(payData ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const customerPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return payments.filter((p) => p.customer_id === selectedCustomer.id);
  }, [selectedCustomer, payments]);

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
        <h1 className="font-display font-bold text-2xl text-white mb-1">Customers</h1>
        <p className="text-sm text-gray-400">{customers.length} customers · {formatCurrency(customers.reduce((s, c) => s + Number(c.lifetime_value), 0))} total LTV</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search customers..."
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer) => {
          const tier = tierConfig[customer.risk_tier];
          return (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className="glass-card-hover p-5 text-left"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={customer.name} color={customer.avatar_color} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{customer.name}</p>
                  <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{customer.company}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <p className="text-sm font-bold text-white">{formatCurrency(Number(customer.lifetime_value))}</p>
                  <p className="text-[10px] text-gray-500">LTV</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <p className="text-sm font-bold text-white">{customer.total_payments}</p>
                  <p className="text-[10px] text-gray-500">Payments</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <p className={`text-sm font-bold ${customer.failed_payments > 3 ? 'text-red-400' : 'text-white'}`}>{customer.failed_payments}</p>
                  <p className="text-[10px] text-gray-500">Failed</p>
                </div>
              </div>

              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${tier.className}`}>
                {tier.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Customer detail drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-40 flex justify-end animate-fade-in">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-md bg-navy-900 border-l border-white/5 overflow-y-auto animate-slide-in-right h-full">
            <div className="sticky top-0 bg-navy-900/95 backdrop-blur-xl border-b border-white/5 p-5 flex items-center justify-between z-10">
              <h2 className="font-display font-bold text-white">Customer Details</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar name={selectedCustomer.name} color={selectedCustomer.avatar_color} size="lg" />
                <div>
                  <p className="font-semibold text-lg text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-400">{selectedCustomer.company}</p>
                </div>
              </div>

              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  {selectedCustomer.company}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  Customer since {formatDate(selectedCustomer.created_at)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 text-center">
                  <p className="text-lg font-bold font-display text-cyan-300">{formatCurrency(Number(selectedCustomer.lifetime_value))}</p>
                  <p className="text-xs text-gray-500">Lifetime Value</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className="text-lg font-bold font-display text-white">{selectedCustomer.total_payments}</p>
                  <p className="text-xs text-gray-500">Total Payments</p>
                </div>
                <div className="glass-card p-3 text-center">
                  <p className={`text-lg font-bold font-display ${selectedCustomer.failed_payments > 3 ? 'text-red-400' : 'text-white'}`}>{selectedCustomer.failed_payments}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <RiskBadge level={selectedCustomer.risk_tier} />
                {selectedCustomer.failed_payments > 3 && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Elevated failure rate
                  </span>
                )}
              </div>

              {/* Payment history */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-purple-light" />
                  <h3 className="font-semibold text-white text-sm">Payment History</h3>
                </div>
                <div className="space-y-2">
                  {customerPayments.map((payment) => (
                    <button
                      key={payment.id}
                      onClick={() => setSelectedPayment(payment)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{formatCurrency(Number(payment.amount))}</p>
                        <p className="text-xs text-gray-500">{payment.gateway} · {formatDate(payment.created_at)}</p>
                      </div>
                      <StatusBadge status={payment.status} />
                    </button>
                  ))}
                  {customerPayments.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">No payments yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment drawer */}
      {selectedPayment && (
        <PaymentDrawer
          payment={selectedPayment}
          customer={customers.find((c) => c.id === selectedPayment.customer_id)}
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
          customer={customers.find((c) => c.id === recoveryPayment.customer_id)}
          onClose={() => setRecoveryPayment(null)}
          onRecovered={() => {
            setRecoveryPayment(null);
            setSelectedPayment(null);
            // reload
            (async () => {
              const { data: payData } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
              setPayments(payData ?? []);
            })();
          }}
        />
      )}
    </div>
  );
}
