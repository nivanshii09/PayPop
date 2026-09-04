import { X, Brain, Zap, Mail, Building2, Calendar, CreditCard } from 'lucide-react';
import type { Payment, Customer } from '@/types';
import { StatusBadge, RiskBadge, RecoveryBadge } from '@/components/Badges';
import { Avatar } from '@/components/Avatar';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/aiEngine';

interface PaymentDrawerProps {
  payment: Payment;
  customer?: Customer;
  onClose: () => void;
  onRecovery: () => void;
}

export function PaymentDrawer({ payment, customer, onClose, onRecovery }: PaymentDrawerProps) {
  const canRecover = payment.status === 'failed' || payment.status === 'abandoned';

  return (
    <div className="fixed inset-0 z-40 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-navy-900 border-l border-white/5 overflow-y-auto animate-slide-in-right h-full">
        <div className="sticky top-0 bg-navy-900/95 backdrop-blur-xl border-b border-white/5 p-5 flex items-center justify-between z-10">
          <h2 className="font-display font-bold text-white">Payment Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold font-display gradient-text mb-2">{formatCurrency(payment.amount)}</p>
            <div className="flex items-center justify-center gap-2">
              <StatusBadge status={payment.status} />
              <RiskBadge level={payment.risk_level} />
            </div>
          </div>

          {/* Customer */}
          {customer && (
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Customer</p>
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} color={customer.avatar_color} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                  <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <Building2 className="w-3.5 h-3.5" />
                  {customer.company}
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <CreditCard className="w-3.5 h-3.5" />
                  LTV: {formatCurrency(customer.lifetime_value)} · {customer.total_payments} payments
                </div>
              </div>
            </div>
          )}

          {/* Payment info */}
          <div className="glass-card p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Payment Info</p>
            <InfoRow label="Gateway" value={payment.gateway.charAt(0).toUpperCase() + payment.gateway.slice(1)} />
            <InfoRow label="Currency" value={payment.currency} />
            <InfoRow label="Created" value={formatDate(payment.created_at)} />
            {payment.recovered_at && <InfoRow label="Recovered At" value={formatDateTime(payment.recovered_at)} />}
            {payment.failure_reason && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1">Failure Reason</p>
                <p className="text-sm text-red-300">{payment.failure_reason}</p>
              </div>
            )}
          </div>

          {/* Recovery info */}
          {payment.recovery_status !== 'none' && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-gray-500">Recovery Status</p>
                <RecoveryBadge status={payment.recovery_status} />
              </div>
              {payment.recovery_strategy && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Strategy</p>
                  <p className="text-sm text-white">{payment.recovery_strategy}</p>
                </div>
              )}
              {payment.recovery_confidence !== null && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple to-cyan"
                        style={{ width: `${payment.recovery_confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-white font-medium">{payment.recovery_confidence}%</span>
                  </div>
                </div>
              )}
              {payment.recovery_summary && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI Summary</p>
                  <p className="text-xs text-gray-300 leading-relaxed">{payment.recovery_summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          {canRecover && (
            <button
              onClick={onRecovery}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple to-cyan text-white font-semibold text-sm hover:opacity-90 transition-opacity glow-purple flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Run AI Recovery Analysis
            </button>
          )}

          {payment.status === 'recovered' && (
            <div className="glass-card p-4 text-center border-cyan-500/20">
              <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-sm text-cyan-300 font-medium">Payment Successfully Recovered</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}
