export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'abandoned' | 'recovered';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RecoveryStatus = 'none' | 'pending' | 'recovered' | 'rejected';
export type RiskTier = 'low' | 'medium' | 'high';

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  avatar_color: string;
  lifetime_value: number;
  total_payments: number;
  failed_payments: number;
  risk_tier: RiskTier;
  created_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_reason: string | null;
  gateway: string;
  risk_level: RiskLevel;
  recovery_status: RecoveryStatus;
  recovery_strategy: string | null;
  recovery_confidence: number | null;
  recovery_summary: string | null;
  recovered_at: string | null;
  created_at: string;
}

export interface PaymentWithCustomer extends Payment {
  customer?: Customer;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SafetyCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface RecoveryAnalysis {
  confidence: number;
  strategy: string;
  summary: string;
  riskLevel: RiskLevel;
  safetyChecks: SafetyCheck[];
  estimatedRecoveryValue: number;
  recommendedAction: 'execute' | 'review' | 'reject';
}
