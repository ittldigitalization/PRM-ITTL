-- ==============================================================================
-- P0 SECURITY FIX: Implement Database-Level RBAC Enforcement via RLS
-- ==============================================================================
-- This script replaces the vulnerable `USING (true)` policies with strict
-- Row Level Security (RLS) policies that query the `rbac_permissions` table.
-- This ensures that frontend Supabase JS calls are completely secured by the
-- exact same RBAC matrix used by the Node.js backend.

-- 1. Create a SECURITY DEFINER function to evaluate permissions
CREATE OR REPLACE FUNCTION public.has_permission(_destination VARCHAR, _action VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to read rbac tables
SET search_path = public -- Secure the search path
AS $$
DECLARE
    _user_role VARCHAR;
    _has_access BOOLEAN;
BEGIN
    -- 1. Get the user's role from the users table based on their auth.uid()
    SELECT rbac_role_id INTO _user_role FROM public.users WHERE id = auth.uid();
    
    -- If they don't exist in our users table, deny access
    IF _user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Admin always gets access
    IF _user_role = 'Admin' THEN
        RETURN TRUE;
    END IF;

    -- 3. Check the rbac_permissions matrix
    SELECT EXISTS (
        SELECT 1 FROM public.rbac_permissions
        WHERE role_id = _user_role 
          AND destination = _destination 
          AND action = _action
    ) INTO _has_access;

    RETURN _has_access;
END;
$$;

-- Secure the function execution to prevent PUBLIC access
REVOKE EXECUTE ON FUNCTION public.has_permission(VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(VARCHAR, VARCHAR) TO service_role;

-- ==============================================================================
-- 2. Recreate Policies for core tables
-- ==============================================================================

-- ---- Projects ----
DROP POLICY IF EXISTS "Allow authenticated on projects" ON public.projects;
CREATE POLICY "Allow read if authorized on projects" ON public.projects FOR SELECT TO authenticated USING (public.has_permission('projects', 'READ'));
CREATE POLICY "Allow insert if authorized on projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_permission('projects', 'CREATE'));
CREATE POLICY "Allow update if authorized on projects" ON public.projects FOR UPDATE TO authenticated USING (public.has_permission('projects', 'UPDATE')) WITH CHECK (public.has_permission('projects', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on projects" ON public.projects FOR DELETE TO authenticated USING (public.has_permission('projects', 'DELETE'));

-- ---- Tasks ----
DROP POLICY IF EXISTS "Allow authenticated on tasks" ON public.tasks;
CREATE POLICY "Allow read if authorized on tasks" ON public.tasks FOR SELECT TO authenticated USING (public.has_permission('tasks', 'READ'));
CREATE POLICY "Allow insert if authorized on tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_permission('tasks', 'CREATE'));
CREATE POLICY "Allow update if authorized on tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.has_permission('tasks', 'UPDATE')) WITH CHECK (public.has_permission('tasks', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_permission('tasks', 'DELETE'));

-- ---- Milestones ----
DROP POLICY IF EXISTS "Allow authenticated on milestones" ON public.milestones;
CREATE POLICY "Allow read if authorized on milestones" ON public.milestones FOR SELECT TO authenticated USING (public.has_permission('milestones', 'READ'));
CREATE POLICY "Allow insert if authorized on milestones" ON public.milestones FOR INSERT TO authenticated WITH CHECK (public.has_permission('milestones', 'CREATE'));
CREATE POLICY "Allow update if authorized on milestones" ON public.milestones FOR UPDATE TO authenticated USING (public.has_permission('milestones', 'UPDATE')) WITH CHECK (public.has_permission('milestones', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on milestones" ON public.milestones FOR DELETE TO authenticated USING (public.has_permission('milestones', 'DELETE'));

-- ---- Documents ----
DROP POLICY IF EXISTS "Allow authenticated on documents" ON public.documents;
CREATE POLICY "Allow read if authorized on documents" ON public.documents FOR SELECT TO authenticated USING (public.has_permission('documents', 'READ'));
CREATE POLICY "Allow insert if authorized on documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_permission('documents', 'CREATE'));
CREATE POLICY "Allow update if authorized on documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_permission('documents', 'UPDATE')) WITH CHECK (public.has_permission('documents', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on documents" ON public.documents FOR DELETE TO authenticated USING (public.has_permission('documents', 'DELETE'));

-- ---- DPRs ----
DROP POLICY IF EXISTS "Allow authenticated on dprs" ON public.dprs;
CREATE POLICY "Allow read if authorized on dprs" ON public.dprs FOR SELECT TO authenticated USING (public.has_permission('dpr', 'READ'));
CREATE POLICY "Allow insert if authorized on dprs" ON public.dprs FOR INSERT TO authenticated WITH CHECK (public.has_permission('dpr', 'CREATE'));
CREATE POLICY "Allow update if authorized on dprs" ON public.dprs FOR UPDATE TO authenticated USING (public.has_permission('dpr', 'UPDATE')) WITH CHECK (public.has_permission('dpr', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on dprs" ON public.dprs FOR DELETE TO authenticated USING (public.has_permission('dpr', 'DELETE'));

-- ---- Teams ----
DROP POLICY IF EXISTS "Allow authenticated on teams" ON public.teams;
CREATE POLICY "Allow read if authorized on teams" ON public.teams FOR SELECT TO authenticated USING (public.has_permission('team', 'READ'));
CREATE POLICY "Allow insert if authorized on teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_permission('team', 'CREATE'));
CREATE POLICY "Allow update if authorized on teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_permission('team', 'UPDATE')) WITH CHECK (public.has_permission('team', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on teams" ON public.teams FOR DELETE TO authenticated USING (public.has_permission('team', 'DELETE'));

-- ---- Team Members ----
DROP POLICY IF EXISTS "Allow authenticated on team_members" ON public.team_members;
CREATE POLICY "Allow read if authorized on team_members" ON public.team_members FOR SELECT TO authenticated USING (public.has_permission('team', 'READ'));
CREATE POLICY "Allow insert if authorized on team_members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.has_permission('team', 'CREATE'));
CREATE POLICY "Allow update if authorized on team_members" ON public.team_members FOR UPDATE TO authenticated USING (public.has_permission('team', 'UPDATE')) WITH CHECK (public.has_permission('team', 'UPDATE'));
CREATE POLICY "Allow delete if authorized on team_members" ON public.team_members FOR DELETE TO authenticated USING (public.has_permission('team', 'DELETE'));

-- ---- Billings (if exists) ----
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated on billings" ON public.billings';
  EXECUTE 'CREATE POLICY "Allow read if authorized on billings" ON public.billings FOR SELECT TO authenticated USING (public.has_permission(''billing'', ''READ''))';
  EXECUTE 'CREATE POLICY "Allow insert if authorized on billings" ON public.billings FOR INSERT TO authenticated WITH CHECK (public.has_permission(''billing'', ''CREATE''))';
  EXECUTE 'CREATE POLICY "Allow update if authorized on billings" ON public.billings FOR UPDATE TO authenticated USING (public.has_permission(''billing'', ''UPDATE'')) WITH CHECK (public.has_permission(''billing'', ''UPDATE''))';
  EXECUTE 'CREATE POLICY "Allow delete if authorized on billings" ON public.billings FOR DELETE TO authenticated USING (public.has_permission(''billing'', ''DELETE''))';
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ---- Daily Issues (if exists) ----
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated on daily_issues" ON public.daily_issues';
  EXECUTE 'CREATE POLICY "Allow read if authorized on daily_issues" ON public.daily_issues FOR SELECT TO authenticated USING (public.has_permission(''issues'', ''READ''))';
  EXECUTE 'CREATE POLICY "Allow insert if authorized on daily_issues" ON public.daily_issues FOR INSERT TO authenticated WITH CHECK (public.has_permission(''issues'', ''CREATE''))';
  EXECUTE 'CREATE POLICY "Allow update if authorized on daily_issues" ON public.daily_issues FOR UPDATE TO authenticated USING (public.has_permission(''issues'', ''UPDATE'')) WITH CHECK (public.has_permission(''issues'', ''UPDATE''))';
  EXECUTE 'CREATE POLICY "Allow delete if authorized on daily_issues" ON public.daily_issues FOR DELETE TO authenticated USING (public.has_permission(''issues'', ''DELETE''))';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
