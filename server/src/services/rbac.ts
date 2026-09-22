import fs from 'fs';
import path from 'path';

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
}

export interface Destination {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface RolePermission {
  role_id: string;
  destination: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
}

export const ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;

export const DEFAULT_DESTINATIONS: Destination[] = [
  { id: 'projects', name: 'Projects', description: 'Project portfolio and budgets', category: 'Planning' },
  { id: 'milestones', name: 'Milestones', description: 'Project stages and milestones', category: 'Planning' },
  { id: 'tasks', name: 'Tasks', description: 'Task assignments and tracking', category: 'Planning' },
  { id: 'gantt', name: 'Gantt Chart', description: 'Timeline and schedule visualization', category: 'Planning' },
  { id: 'dpr', name: 'Daily Progress Report (DPR)', description: 'Daily labor, materials, and machinery logs', category: 'Operations' },
  { id: 'issues', name: 'Daily Issues', description: 'Site blockers and incident management', category: 'Operations' },
  { id: 'team', name: 'Team Management', description: 'Team members and directory', category: 'Operations' },
  { id: 'billing', name: 'Billing & Invoices', description: 'Client billing and payment tracking', category: 'Financials' },
  { id: 'documents', name: 'Documents', description: 'Drawings, contracts, and attachments', category: 'Management' },
  { id: 'amc', name: 'AMC Management', description: 'Annual maintenance contracts and visits', category: 'Services' },
  { id: 'access_hub', name: 'Access Hub', description: 'User management, roles, and security matrix', category: 'Administration' },
];

export const DEFAULT_ROLES: Role[] = [
  { id: 'Admin', name: 'Admin', description: 'Full system access across all resources and operations', is_system: true },
  { id: 'Manager', name: 'Manager', description: 'Can create, read, and update assigned resources. Delete is restricted.', is_system: true },
  { id: 'Supervisor', name: 'Supervisor', description: 'Operational access with Read and Update permissions.', is_system: true },
  { id: 'User', name: 'User', description: 'Standard application access with Create and Read permissions.', is_system: true },
  { id: 'Viewer', name: 'Viewer', description: 'Read-only access across all general resources.', is_system: true },
  { id: 'Employee', name: 'Employee', description: 'Basic employee view-only access to relevant project tasks.', is_system: true },
];

// Generate default permission matrix based on user's core specifications
const generateDefaultPermissions = (): RolePermission[] => {
  const perms: RolePermission[] = [];

  DEFAULT_ROLES.forEach(role => {
    DEFAULT_DESTINATIONS.forEach(dest => {
      if (role.id === 'Admin') {
        ACTIONS.forEach(act => perms.push({ role_id: 'Admin', destination: dest.id, action: act }));
      } else if (role.id === 'Manager') {
        if (['projects', 'milestones', 'tasks', 'gantt', 'dpr', 'issues', 'documents', 'access_hub'].includes(dest.id)) {
          perms.push({ role_id: 'Manager', destination: dest.id, action: 'CREATE' });
          perms.push({ role_id: 'Manager', destination: dest.id, action: 'READ' });
          perms.push({ role_id: 'Manager', destination: dest.id, action: 'UPDATE' });
        } else {
          perms.push({ role_id: 'Manager', destination: dest.id, action: 'READ' });
        }
      } else if (role.id === 'Supervisor') {
        if (dest.id !== 'access_hub' && dest.id !== 'billing') {
          perms.push({ role_id: 'Supervisor', destination: dest.id, action: 'READ' });
          perms.push({ role_id: 'Supervisor', destination: dest.id, action: 'UPDATE' });
        }
      } else if (role.id === 'User') {
        if (dest.id !== 'access_hub' && dest.id !== 'billing' && dest.id !== 'amc') {
          perms.push({ role_id: 'User', destination: dest.id, action: 'CREATE' });
          perms.push({ role_id: 'User', destination: dest.id, action: 'READ' });
        }
      } else if (role.id === 'Viewer' || role.id === 'Employee') {
        if (dest.id !== 'access_hub') {
          perms.push({ role_id: role.id, destination: dest.id, action: 'READ' });
        }
      }
    });
  });

  return perms;
};

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORAGE_FILE = path.join(DATA_DIR, 'rbac_matrix.json');

interface RbacData {
  roles: Role[];
  destinations: Destination[];
  permissions: RolePermission[];
}

function loadData(): RbacData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.roles && parsed.destinations && parsed.permissions) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading RBAC storage file, using defaults:', err);
  }

  const initial: RbacData = {
    roles: DEFAULT_ROLES,
    destinations: DEFAULT_DESTINATIONS,
    permissions: generateDefaultPermissions(),
  };
  saveData(initial);
  return initial;
}

function saveData(data: RbacData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing RBAC storage file:', err);
  }
}

export const rbacService = {
  getRoles(): Role[] {
    const data = loadData();
    return data.roles;
  },

  createRole(name: string, description: string): Role {
    const data = loadData();
    const id = name.trim();
    if (data.roles.some(r => r.id.toLowerCase() === id.toLowerCase())) {
      throw new Error(`Role "${name}" already exists`);
    }
    const newRole: Role = {
      id,
      name,
      description: description || `${name} role`,
      is_system: false
    };
    data.roles.push(newRole);
    saveData(data);
    return newRole;
  },

  updateRole(id: string, name: string, description: string): Role {
    const data = loadData();
    const index = data.roles.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Role not found');
    data.roles[index].name = name || data.roles[index].name;
    data.roles[index].description = description || data.roles[index].description;
    saveData(data);
    return data.roles[index];
  },

  deleteRole(id: string) {
    const data = loadData();
    const role = data.roles.find(r => r.id === id);
    if (!role) throw new Error('Role not found');
    data.roles = data.roles.filter(r => r.id !== id);
    data.permissions = data.permissions.filter(p => p.role_id !== id);
    saveData(data);
    return { success: true };
  },

  getDestinations(): Destination[] {
    const data = loadData();
    return data.destinations;
  },

  getRolePermissions(roleId: string): RolePermission[] {
    const data = loadData();
    return data.permissions.filter(p => p.role_id === roleId);
  },

  updateRolePermissions(roleId: string, perms: Array<{ destination: string; action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' }>): { success: boolean } {
    const data = loadData();
    data.permissions = data.permissions.filter(p => p.role_id !== roleId);
    perms.forEach(p => {
      data.permissions.push({
        role_id: roleId,
        destination: p.destination,
        action: p.action
      });
    });
    saveData(data);
    return { success: true };
  },

  getFullMatrix(): { roles: Role[]; destinations: Destination[]; permissions: RolePermission[] } {
    return loadData();
  },

  hasPermission(roleId: string, destination: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'): boolean {
    if (roleId === 'Admin') return true;
    const data = loadData();
    return data.permissions.some(p => p.role_id === roleId && p.destination === destination && p.action === action);
  }
};
