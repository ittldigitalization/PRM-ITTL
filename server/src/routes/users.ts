import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../index';
import { logAudit } from './audit';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { z } from 'zod';

// Security: Generate a cryptographically random temporary password
const generateTempPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
};

const router = express.Router();

// GET /me: Get the currently authenticated user
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

// GET /: List all users
router.get('/', requireAuth, requirePermission('access_hub', 'READ'), async (req, res) => {
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
router.post('/', requireAuth, requirePermission('access_hub', 'CREATE'), async (req: AuthRequest, res) => {
  try {
    const { email, password, department, Department, rbac_role_id, status } = req.body;

    // Security: Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const dept = department || Department || '';
    const username = email.split('@')[0];
    const legacyRole = rbac_role_id === 'Admin' ? 'Admin' : rbac_role_id === 'Manager' ? 'Project Manager' : rbac_role_id || 'Team Member';

    // Security: Use random temp password instead of hardcoded one
    const userPassword = password || generateTempPassword();

    // Create user in auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: userPassword,
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
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /:id: Update public.users and auth.users (email if changed)
router.put('/:id', requireAuth, requirePermission('access_hub', 'UPDATE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    
    // Zod schema for strict input validation
    const UserUpdateSchema = z.object({
      email: z.string().email().optional(),
      password: z.string().min(8).optional().or(z.literal('')),
      department: z.string().optional(),
      Department: z.string().optional(),
      rbac_role_id: z.string().optional(),
      status: z.enum(['Active', 'Inactive', 'On Leave']).optional()
    }).strict();

    const parsed = UserUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request data', details: parsed.error.issues });
    }

    const { email, password, department, Department, rbac_role_id, status } = parsed.data;
    
    // Security: Only Admins can change a user's role
    if (rbac_role_id !== undefined && req.user?.rbac_role_id !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Only Admins can modify user roles.' });
    }

    const dept = department !== undefined ? department : Department;
    // Use the requested role if provided and authorized; otherwise fall back to old legacy mapping if needed later (handled during update below)
    const newRole = rbac_role_id;

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

    const updatePayload: any = {};
    if (newRole !== undefined) {
      updatePayload.rbac_role_id = newRole;
      updatePayload.role = newRole === 'Admin' ? 'Admin' : newRole === 'Manager' ? 'Project Manager' : newRole || 'Team Member';
    }
    if (status !== undefined) updatePayload.status = status;
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
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /:id: Delete user from public.users and auth
router.delete('/:id', requireAuth, requirePermission('access_hub', 'DELETE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

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
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
