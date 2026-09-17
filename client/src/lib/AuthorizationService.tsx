import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Action = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'APPROVE' | 'READ' | 'UPDATE';

interface Permission {
  destination_id: string;
  destination: string;
  action: Action | string;
}

interface RbacContextType {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (destinationId: string, action: Action | string) => boolean;
}

const RbacContext = createContext<RbacContextType>({
  permissions: [],
  loading: true,
  hasPermission: () => false
});

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:5000/api` 
  : 'http://localhost:5000/api';

export const RbacProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // We need to keep track of the roleId for the admin bypass
  const [userRole, setUserRole] = useState<string>('');
  
  useEffect(() => {
    let isMounted = true;

    const fetchPermissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) setLoading(false);
          return;
        }

        const token = session.access_token;
        
        // 1. Fetch current user from our custom backend to get rbac_role_id
        const userRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!userRes.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const userData = await userRes.json();
        const roleId = userData.rbac_role_id;
        if (isMounted) setUserRole(roleId);

        // 2. Fetch permissions for this role
        const permsRes = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (permsRes.ok) {
          const permsData = await permsRes.json();
          if (isMounted) {
            setPermissions(permsData);
          }
        }
      } catch (error) {
        console.error('Error fetching RBAC permissions:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPermissions();

    // Set up auth listener to refetch on auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchPermissions();
      } else if (event === 'SIGNED_OUT') {
        setPermissions([]);
        setUserRole('');
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (destinationId: string, action: Action | string) => {
    // If the user has "Admin" role, they get full permissions regardless of the matrix.
    // This is a bulletproof fail-safe so Admins can never get locked out.
    if (userRole === 'Admin') return true;
    
    // Some components check 'READ', some check 'VIEW'. Normalize them.
    const normalizedAction = action === 'VIEW' ? 'READ' : action === 'EDIT' ? 'UPDATE' : action;

    return permissions.some(
      p => (p.destination_id === destinationId || p.destination === destinationId) && 
           (p.action === normalizedAction || p.action === action)
    );
  };

  return (
    <RbacContext.Provider value={{ permissions, loading, hasPermission }}>
      {children}
    </RbacContext.Provider>
  );
};

export function usePermissions() {
  return useContext(RbacContext);
}
