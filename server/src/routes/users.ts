import express from 'express';
import { supabaseAdmin } from '../index';
import { logAudit } from './audit';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /me: Get the currently authenticated user
router.get('/me', async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

// GET /: List all users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Normalize Department / department field
    const normalized = (data || []).map(u => ({
      ...u,
      department: u.department || u.Department || ''
    }));

    res.json(normalized);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /: Create user via supabaseAdmin.auth.admin.createUser
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { email, password, department, Department, rbac_role_id, status } = req.body;
    const dept = department || Department || '';
    const username = email ? email.split('@')[0] : `user_${Date.now()}`;
    const legacyRole = rbac_role_id === 'Admin' ? 'Admin' : rbac_role_id === 'Manager' ? 'Project Manager' : rbac_role_id || 'Team Member';

    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: password || 'TemporaryPassword123!', 
    });

    if (authError) throw authError;

    // Insert into public.users
    const insertPayload: any = {
      id: authUser.user.id,
      username,
      email,
      role: legacyRole,
      rbac_role_id,
      status: status || 'Active',
    };

    if (dept) {
      insertPayload.Department = dept;
    }

    let { data, error } = await supabaseAdmin
      .from('users')
      .insert(insertPayload)
      .select()
      .single();

    // If Department column doesn't match, retry with lowercase department
    if (error && error.message && error.message.toLowerCase().includes('department')) {
      delete insertPayload.Department;
      insertPayload.department = dept;
      let retry = await supabaseAdmin
        .from('users')
        .insert(insertPayload)
        .select()
        .single();
      
      if (retry.error && retry.error.message && retry.error.message.toLowerCase().includes('department')) {
        delete insertPayload.department;
        retry = await supabaseAdmin
          .from('users')
          .insert(insertPayload)
          .select()
          .single();
      }
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      // Cleanup auth user if public insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw error;
    }

    await logAudit(
      req.user?.id || null,
      'CREATE',
      'users',
      data.id,
      null,
      data,
      (req.ip as string) || null
    );

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error?.message || error?.error_description || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Failed to create user' });
  }
});

// PUT /:id: Update public.users and auth.users (email if changed)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, password, department, Department, rbac_role_id, status } = req.body;
    const dept = department !== undefined ? department : Department;
    const legacyRole = rbac_role_id === 'Admin' ? 'Admin' : rbac_role_id === 'Manager' ? 'Project Manager' : rbac_role_id || 'Team Member';

    // Get old user data
    const { data: oldData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    // Update email or password in auth if changed
    const authUpdatePayload: any = {};
    if (email && oldData && email !== oldData.email) {
      authUpdatePayload.email = email;
    }
    if (password && password.trim() !== '') {
      authUpdatePayload.password = password;
    }

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdatePayload);
      if (authError) throw authError;
    }

    const updatePayload: any = { rbac_role_id, status, role: legacyRole };
    if (email) {
      updatePayload.email = email;
      updatePayload.username = email.split('@')[0];
    }
    if (dept !== undefined) {
      updatePayload.Department = dept;
    }

    // Update public.users
    let { data, error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message && error.message.toLowerCase().includes('department')) {
      delete updatePayload.Department;
      updatePayload.department = dept;
      let retry = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (retry.error && retry.error.message && retry.error.message.toLowerCase().includes('department')) {
        delete updatePayload.department;
        retry = await supabaseAdmin
          .from('users')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
      }
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    await logAudit(
      req.user?.id || null,
      'UPDATE',
      'users',
      id,
      oldData,
      data,
      (req.ip as string) || null
    );

    res.json(data);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id: Delete user from public.users and auth
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Get old user data for audit
    const { data: oldData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Delete from public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // Try deleting from auth.users (ignore if not found in auth)
    try {
      await supabaseAdmin.auth.admin.deleteUser(id);
    } catch (authErr) {
      console.warn('Auth user delete warning:', authErr);
    }

    await logAudit(
      req.user?.id || null,
      'DELETE',
      'users',
      id,
      oldData,
      null,
      (req.ip as string) || null
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete user' });
  }
});

export default router;
