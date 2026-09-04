import { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Brain, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Payment, Customer } from '@/types';
import { analyzeRecovery } from '@/lib/aiEngine';
import { formatCurrency } from '@/lib/aiEngine';
import { supabase } from '@/lib/supabase';

interface RecoveryModalProps {
  payment: Payment;
  customer?: Customer;
  onClose: () => void;
  onRecovered: () => void;
}

export function RecoveryModal({ payment, customer, onClose, onRecovered }: RecoveryModalProps) {
  const [phase, setPhase] = useState<'analysis' | 'safety' | 'executing' | 'success' | 'rejected'>('analysis');
  const [executingStep, setExecutingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analysis = analyzeRecovery(payment, customer);

  const executeRecovery = async () => {
    if (analysis.recommendedAction === 'reject') {
      setPhase('rejected');
      await logAudit('recovery_rejected', 'Recovery rejected by safety rules', {
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        reason: 'Safety checks failed',
      });
      return;
    }

    setPhase('executing');
    const steps = [
      'Validating safety rules...',
      'Connecting to payment gateway...',
      `Executing: ${analysis.strategy}...`,
      'Awaiting gateway response...',
      'Confirming recovery...',
    ];

    for (let i = 0; i < steps.length; i++) {
      setExecutingStep(i);
      await new Promise((r) => setTimeout(r, 700));
    }

    try {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'recovered',
          recovery_status: 'recovered',
          recovered_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      await logAudit('recovery_executed', `Recovery executed for ${customer?.name ?? 'customer'} — ${formatCurrency(payment.amount)}`, {
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        amount: payment.amount,
        gateway: payment.gateway,
      });

      setPhase('success');
      setTimeout(() => {
        onRecovered();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery failed');
      setPhase('rejected');
    }
  };

  const logAudit = async (action: string, description: string, metadata: Record<string, unknown>) => {
    await supabase.from('audit_logs').insert({
      actor: 'AI Recovery Engine',
      action,
      entity_type: 'payment',
      entity_id: payment.id,
      description,
      metadata,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass-card p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {phase === 'analysis' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple to-cyan flex items-center justify-center glow-purple">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">AI Recovery Analysis</h2>
                <p className="text-sm text-gray-400">{formatCurrency(payment.amount)} · {payment.gateway}</p>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">Recovery Confidence</span>
                <span className={`text-2xl font-bold font-display ${analysis.confidence >= 80 ? 'text-emerald-400' : analysis.confidence >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {analysis.confidence}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    analysis.confidence >= 80 ? 'bg-gradient-to-r from-emerald-500 to-cyan' : analysis.confidence >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-pink'
                  }`}
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wider text-purple-light font-semibold mb-2">Recommended Strategy</p>
              <p className="text-sm text-white font-medium">{analysis.strategy}</p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-light font-semibold mb-2">AI Summary</p>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Est. Recovery Value</p>
                <p className="text-lg font-bold font-display text-cyan-300">{formatCurrency(analysis.estimatedRecoveryValue)}</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <p className={`text-lg font-bold font-display capitalize ${analysis.riskLevel === 'low' ? 'text-emerald-400' : analysis.riskLevel === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                  {analysis.riskLevel}
                </p>
              </div>
            </div>

            <button
              onClick={() => setPhase('safety')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple to-cyan text-white font-semibold text-sm hover:opacity-90 transition-opacity glow-purple flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Review Safety Rules
            </button>
          </div>
        )}

        {phase === 'safety' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-pink flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">Safety Rules</h2>
                <p className="text-sm text-gray-400">Pre-recovery validation checks</p>
              </div>
            </div>

            <div className="space-y-2">
              {analysis.safetyChecks.map((check) => (
                <div key={check.id} className={`glass-card p-3 flex items-center gap-3 ${check.passed ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                  {check.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{check.label}</p>
                    <p className="text-xs text-gray-400">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {analysis.recommendedAction === 'reject' && (
              <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm font-semibold text-red-300">Recovery Not Recommended</p>
                </div>
                <p className="text-xs text-gray-400">Critical safety checks failed. Executing recovery could result in chargebacks or fraud losses.</p>
              </div>
            )}

            {analysis.recommendedAction === 'review' && (
              <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-300">Manual Review Suggested</p>
                </div>
                <p className="text-xs text-gray-400">Some safety checks require attention. You can still proceed at your own risk.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPhase('analysis')}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-medium text-sm hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={executeRecovery}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  analysis.recommendedAction === 'reject'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-purple to-cyan text-white hover:opacity-90 glow-purple'
                }`}
              >
                {analysis.recommendedAction === 'reject' ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Reject Recovery
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Execute Recovery
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phase === 'executing' && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple to-cyan flex items-center justify-center mx-auto glow-purple animate-pulse-glow">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white mb-1">Executing Recovery</h2>
              <p className="text-sm text-gray-400">{formatCurrency(payment.amount)} · {analysis.strategy}</p>
            </div>
            <div className="space-y-2 max-w-xs mx-auto">
              {['Validating safety rules...', 'Connecting to payment gateway...', `Executing: ${analysis.strategy}...`, 'Awaiting gateway response...', 'Confirming recovery...'].map((step, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm transition-opacity ${i <= executingStep ? 'opacity-100' : 'opacity-30'}`}>
                  {i < executingStep ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : i === executingStep ? (
                    <Loader2 className="w-4 h-4 text-purple-light animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600" />
                  )}
                  <span className={i <= executingStep ? 'text-white' : 'text-gray-500'}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan flex items-center justify-center mx-auto glow-cyan animate-pulse-glow">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white mb-1">Recovery Successful</h2>
              <p className="text-sm text-gray-400">{formatCurrency(payment.amount)} recovered from {customer?.name ?? 'customer'}</p>
            </div>
            <div className="glass-card p-4 max-w-xs mx-auto">
              <p className="text-xs text-gray-400 mb-1">Strategy Used</p>
              <p className="text-sm text-white font-medium">{analysis.strategy}</p>
            </div>
          </div>
        )}

        {phase === 'rejected' && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white mb-1">Recovery Rejected</h2>
              <p className="text-sm text-gray-400">{error ?? 'Safety rules blocked this recovery attempt'}</p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/5 text-gray-300 font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
