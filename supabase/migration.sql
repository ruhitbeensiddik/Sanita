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