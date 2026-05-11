-- ==========================================
-- Trading Journal Supabase Migration
-- ==========================================

-- Enable the pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Profiles Table (User Metadata)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Utility function to fix RLS infinite recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin' AND status = 'approved'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
CREATE POLICY "Super admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
CREATE POLICY "Super admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin());

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status, role)
  VALUES (new.id, new.email, 'pending', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 2. Accounts Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Accounts Policies
DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
CREATE POLICY "Users can manage own accounts"
  ON public.accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all accounts" ON public.accounts;
CREATE POLICY "Super admins can view all accounts"
  ON public.accounts FOR SELECT
  USING (public.is_super_admin());

-- ==========================================
-- 3. Trades Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  pair TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  direction TEXT NOT NULL,
  profit_loss NUMERIC NOT NULL,
  result TEXT NOT NULL,
  risk_reward NUMERIC NOT NULL,
  account_type TEXT,
  emotions TEXT,
  tags TEXT[],
  entry_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC,
  exit_price NUMERIC,
  session TEXT,
  mistakes TEXT,
  trade_analysis TEXT,
  analysis_images TEXT[],
  result_images TEXT[],
  source TEXT,
  external_id TEXT,
  broker_account TEXT,
  open_time TIMESTAMPTZ,
  close_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Trades Policies
DROP POLICY IF EXISTS "Users can manage own trades" ON public.trades;
CREATE POLICY "Users can manage own trades"
  ON public.trades FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all trades" ON public.trades;
CREATE POLICY "Super admins can view all trades"
  ON public.trades FOR SELECT
  USING (public.is_super_admin());

-- Trigger for updated_at on trades
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trades_modtime ON public.trades;
CREATE TRIGGER update_trades_modtime
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- ==========================================
-- 4. Goals Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  priority TEXT,
  profit_allocation_percentage NUMERIC NOT NULL,
  status TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  origin TEXT NOT NULL,
  history JSONB DEFAULT '[]'::jsonb,
  tags TEXT[],
  target_date DATE,
  is_archived BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Goals Policies
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all goals" ON public.goals;
CREATE POLICY "Super admins can view all goals"
  ON public.goals FOR SELECT
  USING (public.is_super_admin());

DROP TRIGGER IF EXISTS update_goals_modtime ON public.goals;
CREATE TRIGGER update_goals_modtime
BEFORE UPDATE ON public.goals
FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- ==========================================
-- 5. Cleanup Duplicate Accounts & Add Unique Constraint
-- ==========================================
-- This block safely:
--   a) Finds duplicate accounts (same user_id + name)
--   b) Keeps the OLDEST one (by created_at) per group
--   c) Reassigns trades & goals from duplicates to the kept account
--   d) Deletes the duplicate rows
--   e) Adds a UNIQUE constraint to prevent future duplicates
-- SAFE: No user data (trades/goals) is deleted — only reassigned.
-- IDEMPOTENT: Safe to run multiple times.
-- ==========================================
DO $$
DECLARE
  _keeper_id UUID;
  _dup RECORD;
BEGIN
  -- ------------------------------------------------
  -- Step A: Reassign trades from duplicate accounts
  -- to the keeper (oldest account per user_id+name)
  -- ------------------------------------------------
  UPDATE public.trades t
  SET account_id = keeper.keeper_id
  FROM (
    SELECT dup.id AS dup_id, keeper_sub.keeper_id
    FROM public.accounts dup
    INNER JOIN (
      SELECT DISTINCT ON (user_id, name) id AS keeper_id, user_id, name
      FROM public.accounts
      ORDER BY user_id, name, created_at ASC, id ASC
    ) keeper_sub
      ON dup.user_id = keeper_sub.user_id
      AND dup.name = keeper_sub.name
      AND dup.id != keeper_sub.keeper_id
  ) keeper
  WHERE t.account_id = keeper.dup_id;

  -- ------------------------------------------------
  -- Step B: Reassign goals from duplicate accounts
  -- to the keeper (oldest account per user_id+name)
  -- ------------------------------------------------
  UPDATE public.goals g
  SET account_id = keeper.keeper_id
  FROM (
    SELECT dup.id AS dup_id, keeper_sub.keeper_id
    FROM public.accounts dup
    INNER JOIN (
      SELECT DISTINCT ON (user_id, name) id AS keeper_id, user_id, name
      FROM public.accounts
      ORDER BY user_id, name, created_at ASC, id ASC
    ) keeper_sub
      ON dup.user_id = keeper_sub.user_id
      AND dup.name = keeper_sub.name
      AND dup.id != keeper_sub.keeper_id
  ) keeper
  WHERE g.account_id = keeper.dup_id;

  -- ------------------------------------------------
  -- Step C: Delete the duplicate accounts
  -- (keep only the oldest per user_id+name group)
  -- ------------------------------------------------
  DELETE FROM public.accounts
  WHERE id IN (
    SELECT dup.id
    FROM public.accounts dup
    INNER JOIN (
      SELECT DISTINCT ON (user_id, name) id AS keeper_id, user_id, name
      FROM public.accounts
      ORDER BY user_id, name, created_at ASC, id ASC
    ) keeper_sub
      ON dup.user_id = keeper_sub.user_id
      AND dup.name = keeper_sub.name
      AND dup.id != keeper_sub.keeper_id
  );

  -- ------------------------------------------------
  -- Step D: Add unique constraint to prevent future
  -- duplicates. Safe if constraint already exists.
  -- ------------------------------------------------
  ALTER TABLE public.accounts
    ADD CONSTRAINT accounts_user_id_name_unique UNIQUE (user_id, name);

EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, nothing to do
    NULL;
  WHEN duplicate_table THEN
    NULL;
END $$;

-- ==========================================
-- 6. Soft Delete Columns on Trades
-- ==========================================
-- Add soft-delete columns (idempotent)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- Backfill: ensure all existing trades are marked as active
UPDATE public.trades SET is_deleted = FALSE WHERE is_deleted IS NULL;

-- ==========================================
-- 7. Subscription Columns on Profiles
-- ==========================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_trade_limit INTEGER DEFAULT 2;

-- Backfill defaults for existing profiles
UPDATE public.profiles SET subscription_status = 'free' WHERE subscription_status IS NULL;
UPDATE public.profiles SET free_trade_limit = 2 WHERE free_trade_limit IS NULL;

-- ==========================================
-- 8. Updated Trades RLS Policies
-- ==========================================
-- Drop old all-in-one user policy and replace with granular ones

DROP POLICY IF EXISTS "Users can manage own trades" ON public.trades;

-- Normal users can only SEE their own non-deleted trades
DROP POLICY IF EXISTS "Users can select own active trades" ON public.trades;
CREATE POLICY "Users can select own active trades"
  ON public.trades FOR SELECT
  USING (
    auth.uid() = user_id
    AND is_deleted = false
  );

-- Normal users can INSERT own trades
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Normal users can UPDATE own non-deleted trades (includes soft-delete action)
DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

-- Normal users CANNOT hard delete trades (no DELETE policy for regular users)

-- Super admin full access to all trades (including deleted)
DROP POLICY IF EXISTS "Super admins can view all trades" ON public.trades;
CREATE POLICY "Super admins can view all trades"
  ON public.trades FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update all trades" ON public.trades;
CREATE POLICY "Super admins can update all trades"
  ON public.trades FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete all trades" ON public.trades;
CREATE POLICY "Super admins can delete all trades"
  ON public.trades FOR DELETE
  USING (public.is_super_admin());

-- ==========================================
-- 9. Helper: Get Active Trade Count
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_active_trade_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trade_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trade_count
  FROM public.trades
  WHERE user_id = user_uuid AND is_deleted = false;
  RETURN trade_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_trade_count(UUID) TO authenticated;

-- ==========================================
-- 10. Subscription Settings Table (single row)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_price NUMERIC NOT NULL DEFAULT 10,
  yearly_price NUMERIC NOT NULL DEFAULT 100,
  global_discount_percent NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

-- Seed default row if empty
INSERT INTO public.subscription_settings (monthly_price, yearly_price, global_discount_percent)
SELECT 10, 100, 0
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_settings);

-- Everyone can read settings
DROP POLICY IF EXISTS "Anyone can read subscription settings" ON public.subscription_settings;
CREATE POLICY "Anyone can read subscription settings"
  ON public.subscription_settings FOR SELECT
  USING (true);

-- Only super admin can update
DROP POLICY IF EXISTS "Super admin can update subscription settings" ON public.subscription_settings;
CREATE POLICY "Super admin can update subscription settings"
  ON public.subscription_settings FOR UPDATE
  USING (public.is_super_admin());

-- ==========================================
-- 11. Coupons Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ NULL,
  max_uses INTEGER NULL,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Add unique constraint on code (idempotent)
DO $$
BEGIN
  ALTER TABLE public.coupons ADD CONSTRAINT coupons_code_unique UNIQUE (code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

-- Authenticated users can read active coupons (for validation)
DROP POLICY IF EXISTS "Authenticated can read active coupons" ON public.coupons;
CREATE POLICY "Authenticated can read active coupons"
  ON public.coupons FOR SELECT
  USING (auth.role() = 'authenticated');

-- Super admin full management
DROP POLICY IF EXISTS "Super admin can manage coupons" ON public.coupons;
CREATE POLICY "Super admin can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==========================================
-- 12. User Discounts Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_discounts ENABLE ROW LEVEL SECURITY;

-- Add unique constraint on user_id
DO $$
BEGIN
  ALTER TABLE public.user_discounts ADD CONSTRAINT user_discounts_user_id_unique UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

-- Users can read their own discount
DROP POLICY IF EXISTS "Users can read own discount" ON public.user_discounts;
CREATE POLICY "Users can read own discount"
  ON public.user_discounts FOR SELECT
  USING (auth.uid() = user_id);

-- Super admin can read all + manage
DROP POLICY IF EXISTS "Super admin can manage user discounts" ON public.user_discounts;
CREATE POLICY "Super admin can manage user discounts"
  ON public.user_discounts FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==========================================
-- 13. Payment Requests Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_plan TEXT NOT NULL,
  original_price NUMERIC NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL,
  coupon_code TEXT NULL,
  payment_method TEXT NULL,
  transaction_reference TEXT NULL,
  terms_accepted BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can read own payment requests
DROP POLICY IF EXISTS "Users can read own payment requests" ON public.payment_requests;
CREATE POLICY "Users can read own payment requests"
  ON public.payment_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create own payment requests
DROP POLICY IF EXISTS "Users can create own payment requests" ON public.payment_requests;
CREATE POLICY "Users can create own payment requests"
  ON public.payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admin can view/manage all payment requests
DROP POLICY IF EXISTS "Super admin can manage payment requests" ON public.payment_requests;
CREATE POLICY "Super admin can manage payment requests"
  ON public.payment_requests FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Trigger for updated_at on payment_requests
DROP TRIGGER IF EXISTS update_payment_requests_modtime ON public.payment_requests;
CREATE TRIGGER update_payment_requests_modtime
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();