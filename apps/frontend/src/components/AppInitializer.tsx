import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { setupInterceptors } from '@/services/api';

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initializeAuth, isLoading } = useAuthStore();
  const { addNotification } = useNotificationContext();

  useEffect(() => {
    initializeAuth();
    setupInterceptors(addNotification);
  }, [initializeAuth, addNotification]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
