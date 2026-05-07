-- ==========================================
-- Cleanup Duplicate Accounts
-- ==========================================
-- Run this BEFORE applying the UNIQUE constraint on accounts(user_id, name)
-- This script:
--   1. Identifies duplicate accounts (same user_id + name)
--   2. Keeps the OLDEST one (by created_at) per group
--   3. Reassigns trades & goals from duplicates to the kept account
--   4. Deletes the duplicate rows
--
-- SAFE: No user data (trades/goals) is deleted — only reassigned.
-- ==========================================

-- Step 0: Preview duplicates (run this SELECT first to see what will be cleaned)
SELECT 
  user_id, 
  name, 
  COUNT(*) as duplicate_count,
  MIN(created_at) as oldest_created,
  MAX(created_at) as newest_created
FROM public.accounts
GROUP BY user_id, name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ==========================================
-- Step 1: Reassign trades from duplicate accounts to the kept (oldest) account
-- ==========================================
UPDATE public.trades t
SET account_id = keeper.id
FROM (
  -- Subquery: for each (user_id, name) group, find the account to DELETE
  SELECT a.id AS dup_id, keeper.keeper_id
  FROM public.accounts a
  INNER JOIN (
    -- The keeper: oldest account per (user_id, name)
    SELECT user_id, name, MIN(created_at) AS min_created,
           (SELECT id FROM public.accounts a2 
            WHERE a2.user_id = a_group.user_id 
              AND a2.name = a_group.name 
              AND a2.created_at = MIN(a_group.created_at)
            LIMIT 1) AS keeper_id
    FROM public.accounts a_group
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) keeper ON a.user_id = keeper.user_id 
          AND a.name = keeper.name 
          AND a.id != keeper.keeper_id
) keeper
WHERE t.account_id = keeper.dup_id;

-- ==========================================
-- Step 2: Reassign goals from duplicate accounts to the kept (oldest) account
-- ==========================================
UPDATE public.goals g
SET account_id = keeper.keeper_id
FROM (
  SELECT a.id AS dup_id, keeper.keeper_id
  FROM public.accounts a
  INNER JOIN (
    SELECT user_id, name, MIN(created_at) AS min_created,
           (SELECT id FROM public.accounts a2 
            WHERE a2.user_id = a_group.user_id 
              AND a2.name = a_group.name 
              AND a2.created_at = MIN(a_group.created_at)
            LIMIT 1) AS keeper_id
    FROM public.accounts a_group
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) keeper ON a.user_id = keeper.user_id 
          AND a.name = keeper.name 
          AND a.id != keeper.keeper_id
) keeper
WHERE g.account_id = keeper.dup_id;

-- ==========================================
-- Step 3: Delete the duplicate accounts (keep the oldest per group)
-- ==========================================
DELETE FROM public.accounts
WHERE id IN (
  SELECT a.id
  FROM public.accounts a
  INNER JOIN (
    SELECT user_id, name, MIN(created_at) AS min_created
    FROM public.accounts
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) dups ON a.user_id = dups.user_id 
        AND a.name = dups.name 
        AND a.created_at > dups.min_created
);

-- ==========================================
-- Step 4: Verify — should return 0 rows if cleanup was successful
-- ==========================================
SELECT 
  user_id, 
  name, 
  COUNT(*) as remaining_duplicates
FROM public.accounts
GROUP BY user_id, name
HAVING COUNT(*) > 1;

-- ==========================================
-- Step 5: Now you can safely add the unique constraint
-- Run this in migration.sql or here:
-- ==========================================
-- ALTER TABLE public.accounts
--   ADD CONSTRAINT accounts_user_id_name_unique UNIQUE (user_id, name);
