-- Seed script for RBAC Destinations
-- Run this in your Supabase SQL Editor

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
