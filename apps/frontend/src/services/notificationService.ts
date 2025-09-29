export interface Notification {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  read: boolean;
  type: 'info' | 'warning' | 'error';
}

const NOTIFICATIONS_KEY = 'notifications';

export const getNotifications = (): Notification[] => {
  const notifications = localStorage.getItem(NOTIFICATIONS_KEY);
  return notifications ? JSON.parse(notifications) : [];
};

export const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};
