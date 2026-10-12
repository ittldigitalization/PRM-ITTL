import express from 'express';
import { rbacService } from '../services/rbac';
import { logAudit } from './audit';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';

const router = express.Router();

// GET /: List roles
router.get('/', requirePermission('access_hub', 'READ'), async (req, res) => {
  try {
    const roles = await rbacService.getRoles();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /matrix: Get full role-permission-destination matrix
router.get('/matrix', requirePermission('access_hub', 'READ'), async (req, res) => {
  try {
    const matrix = await rbacService.getFullMatrix();
    res.json(matrix);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch permission matrix' });
  }
});

// POST /: Create role
router.post('/', requirePermission('access_hub', 'CREATE'), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    const role = await rbacService.createRole(name, description);

    await logAudit(
      req.user?.id || null,
      'CREATE',
      'roles',
      role.id,
      null,
      role,
      (req.ip as string) || null
    );

    res.status(201).json(role);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /:id: Edit role details
router.put('/:id', requirePermission('access_hub', 'UPDATE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    const rolesList = await rbacService.getRoles();
    const oldData = rolesList.find(r => r.id === id);
    const updated = await rbacService.updateRole(id, name, description);

    await logAudit(
      req.user?.id || null,
      'UPDATE',
      'roles',
      id,
      oldData,
      updated,
      (req.ip as string) || null
    );

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /:id: Delete custom role
router.delete('/:id', requirePermission('access_hub', 'DELETE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const rolesList = await rbacService.getRoles();
    const oldData = rolesList.find(r => r.id === id);
    await rbacService.deleteRole(id);

    await logAudit(
      req.user?.id || null,
      'DELETE',
      'roles',
      id,
      oldData,
      null,
      (req.ip as string) || null
    );

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /:id/permissions: Get permissions for a role
router.get('/:id/permissions', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const perms = await rbacService.getRolePermissions(id);
    // Return with destination_id for frontend compatibility
    const mapped = perms.map(p => ({
      destination_id: p.destination,
      destination: p.destination,
      action: p.action
    }));
    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// PUT /:id/permissions: Replace permissions for a role
router.put('/:id/permissions', requirePermission('access_hub', 'UPDATE'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { permissions } = req.body; // Expecting array of { destination_id / destination, action }

    const oldPerms = await rbacService.getRolePermissions(id);
    const formatted = (permissions || []).map((p: any) => ({
      destination: p.destination || p.destination_id,
      action: p.action
    }));

    await rbacService.updateRolePermissions(id, formatted);

    await logAudit(
      req.user?.id || null,
      'UPDATE',
      'role_permissions',
      id,
      oldPerms,
      formatted,
      (req.ip as string) || null
    );

    res.json({ success: true, message: 'Permissions saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

export default router;
