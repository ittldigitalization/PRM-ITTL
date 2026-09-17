import express from 'express';
import { rbacService } from '../services/rbac';
import { logAudit } from './audit';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /: List roles
router.get('/', async (req, res) => {
  try {
    const roles = rbacService.getRoles();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /matrix: Get full role-permission-destination matrix
router.get('/matrix', async (req, res) => {
  try {
    const matrix = rbacService.getFullMatrix();
    res.json(matrix);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /: Create role
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    const role = rbacService.createRole(name, description);

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
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const oldData = rbacService.getRoles().find(r => r.id === id);
    const updated = rbacService.updateRole(id, name, description);

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
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const oldData = rbacService.getRoles().find(r => r.id === id);
    rbacService.deleteRole(id);

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
router.get('/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const perms = rbacService.getRolePermissions(id);
    // Return with destination_id for frontend compatibility
    const mapped = perms.map(p => ({
      destination_id: p.destination,
      destination: p.destination,
      action: p.action
    }));
    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id/permissions: Replace permissions for a role
router.put('/:id/permissions', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // Expecting array of { destination_id / destination, action }

    const oldPerms = rbacService.getRolePermissions(id);
    const formatted = (permissions || []).map((p: any) => ({
      destination: p.destination || p.destination_id,
      action: p.action
    }));

    rbacService.updateRolePermissions(id, formatted);

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
    res.status(500).json({ error: error.message });
  }
});

export default router;
