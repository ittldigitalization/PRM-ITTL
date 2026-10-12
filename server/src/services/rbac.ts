import { supabaseAdmin } from '../index';

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

export const rbacService = {
  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabaseAdmin.from('rbac_roles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createRole(name: string, description: string): Promise<Role> {
    const id = name.trim();
    const { data, error } = await supabaseAdmin.from('rbac_roles').insert({
      id,
      name,
      description: description || `${name} role`,
      is_system: false
    }).select().single();
    
    if (error) throw new Error(`Failed to create role: ${error.message}`);
    return data;
  },

  async updateRole(id: string, name: string, description: string): Promise<Role> {
    const updatePayload: any = {};
    if (name) updatePayload.name = name;
    if (description) updatePayload.description = description;

    const { data, error } = await supabaseAdmin.from('rbac_roles').update(updatePayload).eq('id', id).select().single();
    if (error) throw new Error(`Failed to update role: ${error.message}`);
    return data;
  },

  async deleteRole(id: string): Promise<{ success: boolean }> {
    const { error } = await supabaseAdmin.from('rbac_roles').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete role: ${error.message}`);
    return { success: true };
  },

  async getDestinations(): Promise<Destination[]> {
    const { data, error } = await supabaseAdmin.from('rbac_destinations').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const { data, error } = await supabaseAdmin.from('rbac_permissions').select('*').eq('role_id', roleId);
    if (error) throw error;
    return data || [];
  },

  async updateRolePermissions(roleId: string, perms: Array<{ destination: string; action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' }>): Promise<{ success: boolean }> {
    // Delete existing permissions for this role
    await supabaseAdmin.from('rbac_permissions').delete().eq('role_id', roleId);
    
    if (perms.length > 0) {
      const inserts = perms.map(p => ({
        role_id: roleId,
        destination: p.destination,
        action: p.action
      }));
      const { error } = await supabaseAdmin.from('rbac_permissions').insert(inserts);
      if (error) throw new Error(`Failed to update permissions: ${error.message}`);
    }
    return { success: true };
  },

  async getFullMatrix(): Promise<{ roles: Role[]; destinations: Destination[]; permissions: RolePermission[] }> {
    const [roles, destinations, permissions] = await Promise.all([
      this.getRoles(),
      this.getDestinations(),
      supabaseAdmin.from('rbac_permissions').select('*').then(res => res.data || [])
    ]);
    return { roles, destinations, permissions };
  },

  async hasPermission(roleId: string, destination: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'): Promise<boolean> {
    if (roleId === 'Admin') return true;
    const { data, error } = await supabaseAdmin
      .from('rbac_permissions')
      .select('*')
      .eq('role_id', roleId)
      .eq('destination', destination)
      .eq('action', action)
      .maybeSingle();
      
    if (error || !data) return false;
    return true;
  }
};
