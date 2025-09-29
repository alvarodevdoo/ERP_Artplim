import React, { useState, useEffect } from 'react';
import { saveNotifications, Notification } from '@/services/notificationService';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

const NotificationsPage: React.FC = () => {
  const { notifications } = useNotificationContext();
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    let filtered = notifications;

    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    if (filterStartDate) {
      filtered = filtered.filter(n => n.timestamp >= filterStartDate.getTime());
    }

    if (filterEndDate) {
      filtered = filtered.filter(n => n.timestamp <= filterEndDate.getTime());
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, filterStartDate, filterEndDate]);

  const handleMarkAsRead = (ids: string[]) => {
    const updatedNotifications = notifications.map(n =>
      ids.includes(n.id) ? { ...n, read: true } : n
    );
    saveNotifications(updatedNotifications);
    setSelectedNotifications([]);
  };

  const handleDelete = (ids: string[]) => {
    const updatedNotifications = notifications.filter(n => !ids.includes(n.id));
    saveNotifications(updatedNotifications);
    setSelectedNotifications([]);
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(nid => nid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Select onValueChange={(value) => setFilterType(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker onSelect={(date) => setFilterStartDate(date || null)} />
          <DatePicker onSelect={(date) => setFilterEndDate(date || null)} />
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => handleMarkAsRead(selectedNotifications)} disabled={selectedNotifications.length === 0}>
            Mark as Read
          </Button>
          <Button onClick={() => handleDelete(selectedNotifications)} disabled={selectedNotifications.length === 0} variant="destructive">
            Delete Selected
          </Button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b">
          <Checkbox
            checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="ml-2">Select All</span>
        </div>
        <ul>
          {filteredNotifications.map(notification => (
            <li key={notification.id} className={`p-4 border-b ${notification.read ? 'bg-gray-100' : ''}`}>
              <div className="flex items-center">
                <Checkbox
                  checked={selectedNotifications.includes(notification.id)}
                  onCheckedChange={() => handleSelectNotification(notification.id)}
                />
                <div className="ml-4">
                  <div className="flex items-center">
                    <span className="font-bold">{notification.title}</span>
                    <span className="text-sm text-gray-500 ml-2">{new Date(notification.timestamp).toLocaleString()}</span>
                  </div>
                  <p>{notification.content}</p>
                </div>
                <Button onClick={() => handleDelete([notification.id])} variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotificationsPage;
