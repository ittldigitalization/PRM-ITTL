-- ============================================================
-- SECURITY FIX: Migrate RBAC Matrix from local JSON to Database
-- ============================================================

-- 1. Create RBAC Roles table (Using VARCHAR for IDs to maintain compatibility with existing app)
CREATE TABLE IF NOT EXISTS public.rbac_roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create RBAC Destinations (Modules) table
CREATE TABLE IF NOT EXISTS public.rbac_destinations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create RBAC Permissions table
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id VARCHAR(255) REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
    destination VARCHAR(255) REFERENCES public.rbac_destinations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(role_id, destination, action)
);

-- Enable RLS
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and manage RBAC (API will enforce admin checks)
DROP POLICY IF EXISTS "Allow authenticated on rbac_roles" ON public.rbac_roles;
CREATE POLICY "Allow authenticated on rbac_roles" ON public.rbac_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated on rbac_destinations" ON public.rbac_destinations;
CREATE POLICY "Allow authenticated on rbac_destinations" ON public.rbac_destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated on rbac_permissions" ON public.rbac_permissions;
CREATE POLICY "Allow authenticated on rbac_permissions" ON public.rbac_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert Default Roles
INSERT INTO public.rbac_roles (id, name, description, is_system) VALUES
('Admin', 'Admin', 'Administrator with full system access across all resources and operations', TRUE),
('Manager', 'Manager', 'Management role with View-only access across modules', TRUE),
('Employee', 'Employee', 'Standard employee access with View, Create, Edit, and Update permissions. No Delete.', TRUE),
('Supervisor', 'Supervisor', 'Operational access with Read and Update permissions.', TRUE),
('User', 'User', 'Standard application access with Create and Read permissions.', TRUE),
('Viewer', 'Viewer', 'Read-only access across all general resources.', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Destinations
INSERT INTO public.rbac_destinations (id, name, description, category) VALUES
('projects', 'Projects', 'Project portfolio and budgets', 'Planning'),
('milestones', 'Milestones', 'Project stages and milestones', 'Planning'),
('tasks', 'Tasks', 'Task assignments and tracking', 'Planning'),
('gantt', 'Gantt Chart', 'Timeline and schedule visualization', 'Planning'),
('dpr', 'Daily Progress Report (DPR)', 'Daily labor, materials, and machinery logs', 'Operations'),
('issues', 'Daily Issues', 'Site blockers and incident management', 'Operations'),
('team', 'Team Management', 'Team members and directory', 'Operations'),
('billing', 'Billing & Invoices', 'Client billing and payment tracking', 'Financials'),
('documents', 'Documents', 'Drawings, contracts, and attachments', 'Management'),
('amc', 'AMC Management', 'Annual maintenance contracts and visits', 'Services'),
('access_hub', 'Access Hub', 'User management, roles, and security matrix', 'Administration')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Admin Permissions (Admin gets all actions on all destinations)
INSERT INTO public.rbac_permissions (role_id, destination, action)
SELECT r.id, d.id, a.action
FROM public.rbac_roles r
CROSS JOIN public.rbac_destinations d
CROSS JOIN (VALUES ('CREATE'), ('READ'), ('UPDATE'), ('DELETE')) AS a(action)
WHERE r.id = 'Admin'
ON CONFLICT (role_id, destination, action) DO NOTHING;
