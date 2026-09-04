import type { Payment, Customer, RecoveryAnalysis, SafetyCheck, RiskLevel } from '@/types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const FAILURE_STRATEGIES: Record<string, { strategy: string; confidence: number }> = {
  'insufficient funds': {
    strategy: 'Retry with reduced amount + payment plan',
    confidence: 72,
  },
  'expired card': {
    strategy: 'Send update-payment-method email + dunning reminder',
    confidence: 85,
  },
  'authentication required': {
    strategy: 'Trigger 3DS challenge via Smart Retries',
    confidence: 70,
  },
  'network error': {
    strategy: 'Auto-retry within 6 hours (off-peak window)',
    confidence: 92,
  },
  'do not honor': {
    strategy: 'Escalate to manual review — fraud risk detected',
    confidence: 40,
  },
  'closed checkout': {
    strategy: 'Send cart-recovery email with 10% discount',
    confidence: 65,
  },
  'session timeout': {
    strategy: 'Send cart-recovery email + one-click checkout link',
    confidence: 73,
  },
};

export function analyzeRecovery(payment: Payment, customer?: Customer): RecoveryAnalysis {
  const reasonLower = (payment.failure_reason || '').toLowerCase();
  let base = FAILURE_STRATEGIES['network error'];

  for (const [key, val] of Object.entries(FAILURE_STRATEGIES)) {
    if (reasonLower.includes(key)) {
      base = val;
      break;
    }
  }

  let confidence = base.confidence;
  let riskLevel: RiskLevel = payment.risk_level;

  if (customer) {
    if (customer.lifetime_value > 50000) confidence += 8;
    else if (customer.lifetime_value < 5000) confidence -= 10;
    if (customer.failed_payments > 6) {
      confidence -= 8;
      riskLevel = 'high';
    }
    if (customer.failed_payments <= 1 && customer.total_payments > 100) {
      confidence += 5;
      riskLevel = 'low';
    }
  }

  if (payment.status === 'abandoned') {
    confidence += 3;
  }

  confidence = Math.max(5, Math.min(98, confidence));

  const safetyChecks: SafetyCheck[] = [
    {
      id: 'ltv',
      label: 'Customer LTV threshold',
      passed: (customer?.lifetime_value ?? 0) >= 500,
      detail: `LTV: ${formatCurrency(customer?.lifetime_value ?? 0)} (min $500)`,
    },
    {
      id: 'fraud',
      label: 'Fraud risk screening',
      passed: !reasonLower.includes('do not honor') || confidence > 50,
      detail: reasonLower.includes('do not honor') ? 'Generic decline — elevated fraud indicators' : 'No fraud signals detected',
    },
    {
      id: 'confidence',
      label: 'AI confidence threshold',
      passed: confidence >= 60,
      detail: `Confidence: ${confidence}% (min 60%)`,
    },
    {
      id: 'velocity',
      label: 'Retry velocity check',
      passed: (customer?.failed_payments ?? 0) < 10,
      detail: `${customer?.failed_payments ?? 0} prior failures (max 10)`,
    },
    {
      id: 'amount',
      label: 'Amount within safe range',
      passed: payment.amount <= 10000,
      detail: `Amount: ${formatCurrency(payment.amount)} (max $10,000)`,
    },
  ];

  const allPassed = safetyChecks.every((c) => c.passed);
  const criticalPassed = safetyChecks.filter((c) => c.id === 'fraud' || c.id === 'confidence').every((c) => c.passed);

  let recommendedAction: 'execute' | 'review' | 'reject' = 'execute';
  if (!allPassed && !criticalPassed) recommendedAction = 'reject';
  else if (!allPassed) recommendedAction = 'review';

  const summary = buildSummary(payment, customer, confidence, riskLevel);

  return {
    confidence,
    strategy: base.strategy,
    summary,
    riskLevel,
    safetyChecks,
    estimatedRecoveryValue: payment.amount * (confidence / 100),
    recommendedAction,
  };
}

function buildSummary(payment: Payment, customer: Customer | undefined, confidence: number, riskLevel: RiskLevel): string {
  const ltv = customer ? formatCurrency(customer.lifetime_value) : 'unknown';
  const failures = customer?.failed_payments ?? 0;
  const name = customer?.name ?? 'This customer';

  const parts: string[] = [];
  parts.push(`${name} has ${failures} prior failure${failures !== 1 ? 's' : ''} and a ${ltv} LTV.`);
  parts.push(`Failure reason: "${payment.failure_reason ?? 'unknown'}".`);

  if (riskLevel === 'high') {
    parts.push('Risk is elevated — recovery requires careful sequencing.');
  } else if (riskLevel === 'medium') {
    parts.push('Risk is moderate — standard recovery protocols apply.');
  } else {
    parts.push('Risk is low — safe to proceed with automated recovery.');
  }

  if (confidence >= 80) {
    parts.push(`High confidence (${confidence}%) — recommend immediate execution.`);
  } else if (confidence >= 60) {
    parts.push(`Moderate confidence (${confidence}%) — proceed with monitoring.`);
  } else {
    parts.push(`Low confidence (${confidence}%) — manual review strongly advised.`);
  }

  return parts.join(' ');
}
