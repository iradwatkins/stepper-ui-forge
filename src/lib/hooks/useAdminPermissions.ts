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
      console.log('🔐 useAdminPermissions: Checking permissions for user:', user?.email || 'NO_USER')
      
      if (!user) {
        console.log('🔐 useAdminPermissions: No user, setting default permissions')
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

        // Special fallback for designated admin email
        if (user.email === 'iradwatkins@gmail.com') {
          console.log('🔐 useAdminPermissions: Designated admin email detected:', user.email);
          console.log('🔐 useAdminPermissions: Granting admin access automatically');
          
          // For the designated admin, bypass database checks and grant full access
          const adminPermissions = {
            isAdmin: true,
            canManageUsers: true,
            canManageEvents: true,
            canViewAnalytics: true,
            canManageSystem: true,
            canManageBilling: true,
            adminLevel: 3,
            loading: false,
            error: null
          };
          
          console.log('🔐 useAdminPermissions: Setting admin permissions:', adminPermissions);
          setPermissions(adminPermissions);
          return;
        }

        // For non-admin users, try to check database permissions
        let adminData = {
          is_admin: false,
          admin_level: 0,
          can_manage_users: false,
          can_manage_events: false,
          can_view_analytics: false,
          can_manage_system: false,
          can_manage_billing: false
        };

        try {
          // Try the RPC function first
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_permissions', {
            user_uuid: user.id
          });

          if (!rpcError && rpcData?.[0]) {
            adminData = rpcData[0];
          } else {
            // Try to check if admin columns exist first
            const { error: columnCheckError } = await supabase
              .from('profiles')
              .select('is_admin')
              .limit(0);
            
            if (!columnCheckError) {
              // Columns exist, so query them
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin, admin_level')
                .eq('id', user.id)
                .single();

              if (!profileError && profileData) {
                adminData = {
                  is_admin: profileData.is_admin || false,
                  admin_level: profileData.admin_level || 0,
                  can_manage_users: (profileData.admin_level || 0) >= 2,
                  can_manage_events: (profileData.admin_level || 0) >= 1,
                  can_view_analytics: (profileData.admin_level || 0) >= 1,
                  can_manage_system: (profileData.admin_level || 0) >= 3,
                  can_manage_billing: (profileData.admin_level || 0) >= 3
                };
              }
            } else if (columnCheckError.code === '42703') {
              // Column doesn't exist - migration needed
              console.warn('Admin columns not found. Migration 007_add_admin_permissions.sql needs to be run.');
            }
          }
        } catch (error) {
          console.error('Error checking admin permissions:', error);
        }

        console.log('🔐 Admin permissions for user:', adminData);

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