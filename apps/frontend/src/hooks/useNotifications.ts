import { useState, useEffect } from 'react';
import { getNotifications, saveNotifications, Notification } from '@/services/notificationService';
import { v4 as uuidv4 } from 'uuid';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const storedNotifications = getNotifications();
    setNotifications(storedNotifications);
  }, []);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: Date.now(),
      read: false,
    };
    const updatedNotifications = [...notifications, newNotification];
    setNotifications(updatedNotifications);
    saveNotifications(updatedNotifications);
  };

  return { notifications, addNotification };
};
