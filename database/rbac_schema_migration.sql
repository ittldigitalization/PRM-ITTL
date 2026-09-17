CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create RBAC Roles table
CREATE TABLE IF NOT EXISTS rbac_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default roles
INSERT INTO rbac_roles (name, description, is_system) VALUES 
('Admin', 'Administrator with full system access', TRUE),
('Manager', 'Management role with elevated privileges', FALSE),
('Supervisor', 'Supervisor role for operational oversight', FALSE),
('User', 'Standard application user', FALSE),
('Viewer', 'Read-only access', FALSE)
ON CONFLICT (name) DO NOTHING;

-- 2. Create Modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    has_context BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(category, name)
);

-- Insert default modules based on specification
INSERT INTO modules (category, name, has_context) VALUES
('PLANNING', 'Projects', TRUE),
('PLANNING', 'Milestones', TRUE),
('PLANNING', 'Gantt Chart', TRUE),
('PLANNING', 'Tasks', TRUE),
('OPERATIONS', 'Issue Tracker', FALSE),
('OPERATIONS', 'Team', FALSE),
('OPERATIONS', 'DPR', FALSE),
('OPERATIONS', 'Documents', TRUE),
('FINANCE', 'Budget', FALSE),
('FINANCE', 'Billing', TRUE),
('AMC MANAGEMENT', 'Vendor', FALSE),
('AMC MANAGEMENT', 'AMC Dashboard', FALSE),
('AMC MANAGEMENT', 'Contracts', FALSE),
('AMC MANAGEMENT', 'Payments', FALSE),
('AMC MANAGEMENT', 'Documents', FALSE),
('AMC MANAGEMENT', 'AMC History', FALSE),
('ACCESS HUB', 'Users', FALSE),
('ACCESS HUB', 'Roles', FALSE),
('ACCESS HUB', 'Audit Logs', FALSE)
ON CONFLICT (category, name) DO UPDATE SET has_context = EXCLUDED.has_context;

-- 3. Create Permissions Matrix table
CREATE TABLE IF NOT EXISTS rbac_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    context VARCHAR(20) DEFAULT 'none', -- 'internal', 'external', 'none'
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(role_id, module_id, context)
);

-- 4. Audit logs for RBAC
CREATE TABLE IF NOT EXISTS rbac_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    actor_id UUID, -- References users(id) but kept loose in case users table varies
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45)
);

-- Fix the rbac_role_id in users if necessary (assuming it was created as text previously)
-- We will leave users.rbac_role_id as TEXT and just store the UUID string in it to avoid complex CAST migration issues if there's existing string data.

-- IMPORTANT: Disable RLS for these new tables to ensure the server can access them seamlessly, 
-- or enable them and set policies as needed. For now, we will allow all access for authenticated roles if RLS is on.
ALTER TABLE rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON rbac_roles FOR ALL USING (true);
CREATE POLICY "Allow full access to authenticated users" ON modules FOR ALL USING (true);
CREATE POLICY "Allow full access to authenticated users" ON rbac_permissions FOR ALL USING (true);
CREATE POLICY "Allow full access to authenticated users" ON rbac_audit_logs FOR ALL USING (true);

