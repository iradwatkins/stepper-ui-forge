import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminPermissions {
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageEvents: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
  canManageBilling: boolean;
  adminLevel: number;
  loading: boolean;
  error: string | null;
}

export const useAdminPermissions = (): AdminPermissions => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions>({
    isAdmin: false,
    canManageUsers: false,
    canManageEvents: false,
    canViewAnalytics: false,
    canManageSystem: false,
    canManageBilling: false,
    adminLevel: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkAdminPermissions = async () => {
      if (!user) {
        setPermissions({
          isAdmin: false,
          canManageUsers: false,
          canManageEvents: false,
          canViewAnalytics: false,
          canManageSystem: false,
          canManageBilling: false,
          adminLevel: 0,
          loading: false,
          error: null
        });
        return;
      }

      try {
        setPermissions(prev => ({ ...prev, loading: true, error: null }));

        // Call the database function to get admin permissions
        const { data, error } = await supabase.rpc('get_admin_permissions', {
          user_uuid: user.id
        });

        if (error) {
          console.error('Error fetching admin permissions:', error);
          setPermissions(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load admin permissions'
          }));
          return;
        }

        const adminData = data?.[0] || {
          is_admin: false,
          admin_level: 0,
          can_manage_users: false,
          can_manage_events: false,
          can_view_analytics: false,
          can_manage_system: false,
          can_manage_billing: false
        };

        setPermissions({
          isAdmin: adminData.is_admin || false,
          canManageUsers: adminData.can_manage_users || false,
          canManageEvents: adminData.can_manage_events || false,
          canViewAnalytics: adminData.can_view_analytics || false,
          canManageSystem: adminData.can_manage_system || false,
          canManageBilling: adminData.can_manage_billing || false,
          adminLevel: adminData.admin_level || 0,
          loading: false,
          error: null
        });

      } catch (error) {
        console.error('Unexpected error checking admin permissions:', error);
        setPermissions({
          isAdmin: false,
          canManageUsers: false,
          canManageEvents: false,
          canViewAnalytics: false,
          canManageSystem: false,
          canManageBilling: false,
          adminLevel: 0,
          loading: false,
          error: 'Failed to verify admin status'
        });
      }
    };

    checkAdminPermissions();
  }, [user]);

  return permissions;
};

export const useIsAdmin = (): { isAdmin: boolean; loading: boolean } => {
  const { isAdmin, loading } = useAdminPermissions();
  return { isAdmin, loading };
};