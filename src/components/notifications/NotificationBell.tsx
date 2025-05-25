import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Notification, ActivityLog } from '../../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const NotificationBell: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [notifications, setNotifications] = useState<(Notification | ActivityLog)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    try {
      // Create a query for notifications
      const notificationsQuery = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      // Create a query for activity logs
      const activityLogsQuery = query(
        collection(db, 'activityLogs'),
        orderBy('timestamp', 'desc'),
        limit(50) // Limit to recent logs
      );

      // Subscribe to both notifications and activity logs
      const unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            isNotification: true
          }));

          // Get activity logs
          getDocs(activityLogsQuery).then((logsSnapshot) => {
            const logsData = logsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date(),
              isActivityLog: true
            }));

            // Combine and sort notifications and logs
            const combinedData = [...notificationsData, ...logsData].sort((a, b) => {
              const dateA = a.isNotification ? a.createdAt : a.timestamp;
              const dateB = b.isNotification ? b.createdAt : b.timestamp;
              return dateB.getTime() - dateA.getTime();
            });

            setNotifications(combinedData);
            setUnreadCount(notificationsData.filter(n => !n.isRead).length);
          });

          setError(null);
        },
        (err) => {
          console.error('Error fetching notifications:', err);
          setError('Unable to load notifications. Please try again later.');
        }
      );

      return () => {
        unsubscribeNotifications();
      };
    } catch (err) {
      console.error('Error setting up notifications listener:', err);
      setError('Unable to initialize notifications. Please try again later.');
    }
  }, [isAdmin, user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { isRead: true });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderItem = (item: any) => {
    if (item.isNotification) {
      return (
        <div
          key={item.id}
          className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
            !item.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
          onClick={() => markAsRead(item.id)}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {format(item.createdAt, 'PPp')}
              </p>
            </div>
            {!item.isRead && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div
          key={item.id}
          className="p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.action}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {item.details}
                {item.note && (
                  <span className="block italic text-gray-500">{item.note}</span>
                )}
              </p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  {item.staffEmail}
                </p>
                <p className="text-xs text-gray-500">
                  {format(item.timestamp, 'PPp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Feed
            </h3>
          </div>

          <div className="max-h-[80vh] overflow-y-auto">
            {error ? (
              <div className="p-4 text-center text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(item => renderItem(item))
            ) : (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                No activities to show
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;