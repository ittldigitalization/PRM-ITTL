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
      // Try matching by email
      const { data: userByEmail } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (userByEmail) {
        publicUser = userByEmail;
      } else {
        // Try matching by username prefix
        const prefix = user.email.split('@')[0];
        const { data: userByName } = await supabaseAdmin
          .from('users')
          .select('*')
          .ilike('username', `%${prefix}%`)
          .limit(1);

        if (userByName && userByName.length > 0) {
          publicUser = userByName[0];
        }
      }
    }

    const resolvedRole = publicUser?.rbac_role_id || (publicUser?.role === 'Admin' ? 'Admin' : publicUser?.role === 'Project Manager' ? 'Manager' : publicUser?.role || 'User');

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

export const requirePermission = (destination: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.rbac_role_id) {
        return res.status(403).json({ error: 'Forbidden: No role assigned' });
      }

      const roleId = req.user.rbac_role_id;

      // Check permissions
      const { data: permission, error } = await supabaseAdmin
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('destination', destination)
        .eq('action', action)
        .single();

      if (error || !permission) {
        return res.status(403).json({ error: `Forbidden: Requires ${action} permission on ${destination}` });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
