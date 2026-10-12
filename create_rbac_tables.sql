-- 1. Drop the old tables that have UUIDs to start fresh
DROP TABLE IF EXISTS public.rbac_permissions CASCADE;
DROP TABLE IF EXISTS public.rbac_destinations CASCADE;
DROP TABLE IF EXISTS public.rbac_roles CASCADE;

-- 2. Create RBAC Roles Table (Using TEXT for ID so 'Admin' works)
CREATE TABLE public.rbac_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create RBAC Destinations Table (Using TEXT for ID)
CREATE TABLE public.rbac_destinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create RBAC Permissions Table (role_id and destination are TEXT)
CREATE TABLE public.rbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
    destination TEXT NOT NULL REFERENCES public.rbac_destinations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, destination, action)
);

-- Enable Row Level Security
ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read roles, destinations, and permissions
CREATE POLICY "Allow authenticated read on rbac_roles" ON public.rbac_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on rbac_destinations" ON public.rbac_destinations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on rbac_permissions" ON public.rbac_permissions FOR SELECT TO authenticated USING (true);

-- 5. Seed Default Roles
INSERT INTO public.rbac_roles (id, name, description, is_system) VALUES 
('Admin', 'Admin', 'Administrator with full system access', true),
('Manager', 'Manager', 'Management role with elevated privileges', false),
('Supervisor', 'Supervisor', 'Supervisor role for operational oversight', false),
('User', 'User', 'Standard application user', false),
('Viewer', 'Viewer', 'Read-only access', false)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;

-- 6. Seed Destinations
INSERT INTO public.rbac_destinations (id, name, description, category) VALUES 
('projects', 'Projects', 'Manage projects', 'Planning'),
('milestones', 'Milestones', 'Manage project milestones', 'Planning'),
('tasks', 'Tasks', 'Manage tasks', 'Planning'),
('gantt', 'Gantt Chart', 'View and manage gantt charts', 'Planning'),
('dpr', 'Daily Progress Report (DPR)', 'Manage daily progress reports', 'Operations'),
('issues', 'Daily Issues', 'Manage daily issues', 'Operations'),
('team', 'Team Management', 'Manage team members', 'Operations'),
('amc', 'AMC Management', 'Manage AMC contracts and vendors', 'Operations'),
('billing', 'Billing & Invoices', 'Manage billing and invoices', 'Financials'),
('access_hub', 'Access Hub', 'Manage roles and users', 'System')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
