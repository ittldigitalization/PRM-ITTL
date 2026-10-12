-- ============================================================
-- SECURITY FIX: Enable RLS on ALL core tables
-- Previously disabled "for easy testing" — this was the #1 critical vulnerability.
-- With RLS disabled, anyone with the public anon key could directly
-- read/write/delete any row in the database bypassing the server API.
--
-- These policies allow all operations for authenticated users only.
-- The anon role (used by the public anon key) is blocked.
-- ============================================================

-- ---- users ----
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on users" ON public.users;
CREATE POLICY "Allow authenticated on users" ON public.users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- projects ----
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on projects" ON public.projects;
CREATE POLICY "Allow authenticated on projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- milestones ----
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on milestones" ON public.milestones;
CREATE POLICY "Allow authenticated on milestones" ON public.milestones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- tasks ----
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on tasks" ON public.tasks;
CREATE POLICY "Allow authenticated on tasks" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- teams ----
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on teams" ON public.teams;
CREATE POLICY "Allow authenticated on teams" ON public.teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- team_members ----
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on team_members" ON public.team_members;
CREATE POLICY "Allow authenticated on team_members" ON public.team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- dprs ----
ALTER TABLE public.dprs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on dprs" ON public.dprs;
CREATE POLICY "Allow authenticated on dprs" ON public.dprs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- documents ----
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on documents" ON public.documents;
CREATE POLICY "Allow authenticated on documents" ON public.documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- notifications ----
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on notifications" ON public.notifications;
CREATE POLICY "Allow authenticated on notifications" ON public.notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- budget_config ----
ALTER TABLE public.budget_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated on budget_config" ON public.budget_config;
CREATE POLICY "Allow authenticated on budget_config" ON public.budget_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- billings (if exists) ----
DO $$ BEGIN
  ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated on billings" ON public.billings';
  EXECUTE 'CREATE POLICY "Allow authenticated on billings" ON public.billings FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- audit_logs (if exists) ----
DO $$ BEGIN
  ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated on audit_logs" ON public.audit_logs';
  EXECUTE 'CREATE POLICY "Allow authenticated on audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---- daily_issues (if exists) ----
DO $$ BEGIN
  ALTER TABLE public.daily_issues ENABLE ROW LEVEL SECURITY;
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated on daily_issues" ON public.daily_issues';
  EXECUTE 'CREATE POLICY "Allow authenticated on daily_issues" ON public.daily_issues FOR ALL TO authenticated USING (true) WITH CHECK (true)';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
