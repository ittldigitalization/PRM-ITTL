import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export type Action = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'APPROVE' | 'READ' | 'UPDATE';

export interface Permission {
  destination_id: string;
  destination: string;
  action: Action | string;
}

interface RbacContextType {
  permissions: Permission[];
  loading: boolean;
  userRole: string;
  refreshPermissions: () => Promise<void>;
  hasPermission: (destinationId: string, action: Action | string) => boolean;
}

const RbacContext = createContext<RbacContextType>({
  permissions: [],
  loading: true,
  userRole: '',
  refreshPermissions: async () => {},
  hasPermission: () => false
});

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:5000/api` 
  : 'http://localhost:5000/api';

// Cross-browser & real-time notification trigger when admin changes roles or permissions
export const notifyRbacChange = async () => {
  // 1. In-page event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rbac-permissions-updated'));
    
    // 2. BroadcastChannel for other tabs in the same browser
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('rbac_channel');
        bc.postMessage({ type: 'rbac_updated', time: Date.now() });
        bc.close();
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // 3. Supabase Realtime broadcast for all connected clients/users on network
  try {
    const channel = supabase.channel('rbac_network_broadcast');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'rbac_updated',
          payload: { timestamp: Date.now() }
        }).then(() => {
          setTimeout(() => supabase.removeChannel(channel), 1000);
        });
      }
    });
  } catch (e) {
    console.warn('Supabase broadcast error:', e);
  }
};

export const RbacProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  const fetchPermissions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPermissions([]);
        setUserRole('');
        setLoading(false);
        return;
      }

      const token = session.access_token;
      
      // 1. Fetch current user from custom backend to get current rbac_role_id
      const userRes = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!userRes.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const userData = await userRes.json();
      const roleId = userData.rbac_role_id || (userData.role === 'Admin' ? 'Admin' : 'User');
      setUserRole(roleId);

      // 2. Fetch permissions for this role
      if (roleId === 'Admin') {
        // Admins have all permissions
        setLoading(false);
        return;
      }

      const permsRes = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (permsRes.ok) {
        const permsData = await permsRes.json();
        setPermissions(permsData);
      }
    } catch (error) {
      console.error('Error fetching RBAC permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();

    // 1. Auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        fetchPermissions();
      } else if (event === 'SIGNED_OUT') {
        setPermissions([]);
        setUserRole('');
      }
    });

    // 2. Supabase Realtime listener on `users` table for instant user role updates
    const usersChannel = supabase
      .channel('rbac_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchPermissions();
      })
      .subscribe();

    // 3. Supabase Realtime broadcast listener for instant role/permission matrix updates
    const broadcastChannel = supabase
      .channel('rbac_network_broadcast')
      .on('broadcast', { event: 'rbac_updated' }, () => {
        fetchPermissions();
      })
      .subscribe();

    // 4. In-window custom event
    const handleCustomEvent = () => {
      fetchPermissions();
    };
    window.addEventListener('rbac-permissions-updated', handleCustomEvent);

    // 5. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('rbac_channel');
      bc.onmessage = () => {
        fetchPermissions();
      };
    }

    // 6. Window focus listener (when switching back to the tab)
    window.addEventListener('focus', handleCustomEvent);

    // 7. Polling fallback every 15 seconds
    const intervalId = setInterval(fetchPermissions, 15000);

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('rbac-permissions-updated', handleCustomEvent);
      window.removeEventListener('focus', handleCustomEvent);
      if (bc) bc.close();
      clearInterval(intervalId);
    };
  }, [fetchPermissions]);

  const hasPermission = useCallback((destinationId: string, action: Action | string) => {
    // If the user has "Admin" role, they get full permissions regardless of the matrix.
    if (userRole === 'Admin') return true;
    
    // Some components check 'READ', some check 'VIEW'. Normalize them.
    const normalizedAction = action === 'VIEW' ? 'READ' : action === 'EDIT' ? 'UPDATE' : action;

    return permissions.some(
      p => (p.destination_id === destinationId || p.destination === destinationId) && 
           (p.action === normalizedAction || p.action === action)
    );
  }, [userRole, permissions]);

  return (
    <RbacContext.Provider value={{ permissions, loading, userRole, refreshPermissions: fetchPermissions, hasPermission }}>
      {children}
    </RbacContext.Provider>
  );
};

export function usePermissions() {
  return useContext(RbacContext);
}
