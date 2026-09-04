/*
# PayPop — AI Revenue Recovery Platform Schema

## Overview
Creates the core database tables for PayPop, an AI-powered revenue recovery platform
for failed and abandoned payments. This is a single-tenant demo app (no sign-in),
so all tables allow anon + authenticated access.

## New Tables

### customers
- `id` (uuid, primary key)
- `name` (text) — customer display name
- `email` (text) — customer email
- `company` (text) — company name
- `avatar_color` (text) — hex color for avatar
- `lifetime_value` (numeric) — total lifetime spend
- `total_payments` (int) — count of all payments
- `failed_payments` (int) — count of failed payments
- `risk_tier` (text) — 'low', 'medium', 'high'
- `created_at` (timestamptz)

### payments
- `id` (uuid, primary key)
- `customer_id` (uuid, FK → customers)
- `amount` (numeric) — payment amount
- `currency` (text, default 'USD')
- `status` (text) — 'succeeded', 'failed', 'pending', 'abandoned', 'recovered'
- `failure_reason` (text, nullable) — reason for failure
- `gateway` (text) — 'stripe', 'paypal', 'adyen', 'braintree'
- `risk_level` (text) — 'low', 'medium', 'high'
- `recovery_status` (text) — 'none', 'pending', 'recovered', 'rejected'
- `recovery_strategy` (text, nullable) — AI recommended strategy
- `recovery_confidence` (int, nullable) — AI confidence 0-100
- `recovery_summary` (text, nullable) — AI analysis summary
- `recovered_at` (timestamptz, nullable)
- `created_at` (timestamptz)

### audit_logs
- `id` (uuid, primary key)
- `actor` (text) — who performed the action
- `action` (text) — action type (e.g. 'recovery_executed', 'payment_viewed')
- `entity_type` (text) — 'payment', 'customer', 'system'
- `entity_id` (uuid, nullable) — related entity ID
- `description` (text) — human-readable description
- `metadata` (jsonb) — additional structured data
- `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Single-tenant demo: anon + authenticated have full CRUD (data is intentionally shared).
*/

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL DEFAULT '',
  avatar_color text NOT NULL DEFAULT '#a855f7',
  lifetime_value numeric(12,2) NOT NULL DEFAULT 0,
  total_payments int NOT NULL DEFAULT 0,
  failed_payments int NOT NULL DEFAULT 0,
  risk_tier text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "anon_select_customers" ON customers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "anon_insert_customers" ON customers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "anon_update_customers" ON customers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "anon_delete_customers" ON customers FOR DELETE
  TO anon, authenticated USING (true);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  gateway text NOT NULL DEFAULT 'stripe',
  risk_level text NOT NULL DEFAULT 'low',
  recovery_status text NOT NULL DEFAULT 'none',
  recovery_strategy text,
  recovery_confidence int,
  recovery_summary text,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE
  TO anon, authenticated USING (true);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT 'system',
  entity_id uuid,
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit_logs" ON audit_logs;
CREATE POLICY "anon_update_audit_logs" ON audit_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_logs" ON audit_logs;
CREATE POLICY "anon_delete_audit_logs" ON audit_logs FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
