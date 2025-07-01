import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminPermissions {
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageEvents: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
  loading: boolean;
}

export const useAdminPermissions = (): AdminPermissions => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermissions>({
    isAdmin: false,
    canManageUsers: false,
    canManageEvents: false,
    canViewAnalytics: false,
    canManageSystem: false,
    loading: true
  });

  useEffect(() => {
    const checkAdminPermissions = () => {
      if (!user) {
        setPermissions({
          isAdmin: false,
          canManageUsers: false,
          canManageEvents: false,
          canViewAnalytics: false,
          canManageSystem: false,
          loading: false
        });
        return;
      }

      // For now, make any authenticated user an admin for testing
      const isAdmin = true;

      setPermissions({
        isAdmin,
        canManageUsers: isAdmin,
        canManageEvents: isAdmin,
        canViewAnalytics: isAdmin,
        canManageSystem: isAdmin,
        loading: false
      });
    };

    checkAdminPermissions();
  }, [user]);

  return permissions;
};

export const useIsAdmin = (): { isAdmin: boolean; loading: boolean } => {
  const { isAdmin, loading } = useAdminPermissions();
  return { isAdmin, loading };
};