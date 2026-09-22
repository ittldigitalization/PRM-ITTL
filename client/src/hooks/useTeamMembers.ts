import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface TeamMemberItem {
  id: string;
  name: string;
  email?: string;
  status?: string;
}

export function useTeamMembers() {
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        let resolvedName = '';
        let resolvedId = '';

        if (user) {
          resolvedId = user.id;

          // 1. Try matching by ID or Email in public.users
          const { data: userRecord } = await supabase
            .from('users')
            .select('id, username, email')
            .or(`id.eq.${user.id}${user.email ? `,email.eq.${user.email}` : ''}`)
            .maybeSingle();

          if (userRecord?.username) {
            resolvedName = userRecord.username;
            resolvedId = userRecord.id;
          } else if (user.email) {
            // 2. Try matching by username prefix
            const prefix = user.email.split('@')[0];
            const { data: userByPrefix } = await supabase
              .from('users')
              .select('id, username')
              .ilike('username', prefix)
              .maybeSingle();

            if (userByPrefix?.username) {
              resolvedName = userByPrefix.username;
              resolvedId = userByPrefix.id;
            } else {
              resolvedName = prefix;
            }
          } else {
            resolvedName = user.user_metadata?.username || '';
          }
        }

        if (isMounted) {
          setCurrentUserName(resolvedName);
          setCurrentUserId(resolvedId);
        }

        // Fetch all team members from users table
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, username, email, status')
          .order('username', { ascending: true });

        if (isMounted && allUsers) {
          setTeamMembers(
            allUsers.map(u => ({
              id: u.id,
              name: u.username,
              email: u.email,
              status: u.status
            }))
          );
        }
      } catch (err) {
        console.error('Error in useTeamMembers:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserData();

    // Listen for realtime changes on users table
    const subscription = supabase
      .channel('hook_users_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUserData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    currentUserName,
    setCurrentUserName,
    currentUserId,
    teamMembers,
    loading
  };
}

export default useTeamMembers;
