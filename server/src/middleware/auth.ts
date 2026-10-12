import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../index';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from public.users to get rbac_role_id
    let publicUser: any = null;

    const { data: userById } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (userById) {
      publicUser = userById;
    } else if (user.email) {
      // Try matching by exact email only — no fuzzy matching (security risk)
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (userByEmail) {
        publicUser = userByEmail;
      }
    }

    const roleLower = publicUser?.role ? publicUser.role.toLowerCase() : '';
    const resolvedRole = publicUser?.rbac_role_id || (roleLower === 'admin' ? 'Admin' : roleLower === 'project manager' ? 'Manager' : publicUser?.role || 'User');

    req.user = {
      ...user,
      ...(publicUser || {}),
      rbac_role_id: resolvedRole,
      role: publicUser?.role || resolvedRole
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { rbacService } from '../services/rbac';

export const requirePermission = (destination: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.rbac_role_id) {
        return res.status(403).json({ error: 'Forbidden: No role assigned' });
      }

      const roleId = req.user.rbac_role_id;

      // Check permissions using the database RBAC matrix
      const hasPerm = await rbacService.hasPermission(roleId, destination, action);
      if (!hasPerm) {
        return res.status(403).json({ error: `Forbidden: Requires ${action} permission on ${destination}` });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
