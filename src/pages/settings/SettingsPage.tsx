import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Header from '../../components/layout/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { StoreSettings, SystemStatus, PaymentMethod, Currency, DateFormat, Language, NotificationPriority } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronRight,
  Power,
  Bell,
  Lock,
  Palette,
  MessageSquare,
} from 'lucide-react';

interface SystemSettings {
  status: SystemStatus;
  statusNote?: string;
  dateFormat: DateFormat;
  timezone: string;
  language: Language;
  theme: Theme;
  stockAlertEnabled: boolean;
  stockAlertThreshold: number;
  salesTargetEnabled: boolean;
  salesTarget: number;
  autoLogoutMinutes: number;
  twoFactorEnabled: boolean;
}

const SettingsPage: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<NotificationPriority>('info');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsQuery = query(collection(db, 'settings'));
      const snapshot = await getDocs(settingsQuery);
      
      if (!snapshot.empty) {
        const settingsData = snapshot.docs[0];
        setSettings({
          id: settingsData.id,
          ...settingsData.data(),
        } as SystemSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<SystemSettings>) => {
    if (!isAdmin) {
      toast.error('Only administrators can modify settings');
      return;
    }

    try {
      const settingsData = {
        ...settings,
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email,
      };

      const notificationData = {
        type: 'System' as const,
        title: 'Settings Updated',
        message: `System settings were updated by ${user?.email}`,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      if (settings?.id) {
        const settingsRef = doc(db, 'settings', settings.id);
        await updateDoc(settingsRef, settingsData);
      } else {
        const newSettings = {
          ...settingsData,
          createdAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'settings'), newSettings);
        setSettings({ ...newSettings, id: docRef.id });
      }

      await addDoc(collection(db, 'notifications'), notificationData);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcement.trim()) {
      toast.error('Please enter an announcement message');
      return;
    }

    try {
      // Create notification for the announcement
      const notificationData = {
        type: 'System' as const,
        title: 'New Announcement',
        message: announcement,
        priority: announcementPriority,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      // Add to notifications collection
      await addDoc(collection(db, 'notifications'), notificationData);

      // Add to announcements collection
      const announcementData = {
        message: announcement,
        priority: announcementPriority,
        createdBy: user?.email,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      await addDoc(collection(db, 'announcements'), announcementData);

      setAnnouncement('');
      toast.success('Announcement posted successfully');
    } catch (error) {
      console.error('Error posting announcement:', error);
      toast.error('Failed to post announcement');
    }
  };

  const panels = [
    {
      id: 'system',
      name: 'System Control',
      icon: <Power className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <Select
            label="System Status"
            options={[
              { value: 'open', label: 'Open (System Active)' },
              { value: 'closed', label: 'Closed (Maintenance Mode)' },
            ]}
            value={settings?.status}
            onChange={(e) => handleSubmit({ status: e.target.value as SystemStatus })}
          />
          
          <Input
            label="Maintenance Message"
            placeholder="Enter message for staff..."
            value={settings?.statusNote}
            onChange={(e) => handleSubmit({ statusNote: e.target.value })}
          />
        </div>
      )
    },
    {
      id: 'notifications',
      name: 'Stock Alerts',
      icon: <Bell className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings?.stockAlertEnabled}
              onChange={(e) => handleSubmit({ stockAlertEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span>Enable Stock Alerts</span>
          </div>
          
          <Input
            label="Stock Alert Threshold"
            type="number"
            min={0}
            value={settings?.stockAlertThreshold}
            onChange={(e) => handleSubmit({ stockAlertThreshold: parseInt(e.target.value) })}
          />
        </div>
      )
    },
    {
      id: 'security',
      name: 'Security',
      icon: <Lock className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings?.twoFactorEnabled}
              onChange={(e) => handleSubmit({ twoFactorEnabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span>Enable Two-Factor Authentication</span>
          </div>
          
          <Input
            label="Auto Logout (minutes)"
            type="number"
            min={1}
            value={settings?.autoLogoutMinutes}
            onChange={(e) => handleSubmit({ autoLogoutMinutes: parseInt(e.target.value) })}
          />
        </div>
      )
    },
    {
      id: 'theme',
      name: 'Theme & Language',
      icon: <Palette className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <Select
            label="Language"
            options={[
              { value: 'en', label: 'English' },
              { value: 'my', label: 'မြန်မာ' },
            ]}
            value={settings?.language}
            onChange={(e) => handleSubmit({ language: e.target.value as Language })}
          />
          
          <div className="flex items-center justify-between">
            <span>Dark Mode</span>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'announcement',
      name: 'Admin Announcement',
      icon: <MessageSquare className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <Select
            label="Priority"
            options={[
              { value: 'info', label: 'Information' },
              { value: 'warning', label: 'Warning' },
              { value: 'error', label: 'Error' },
            ]}
            value={announcementPriority}
            onChange={(e) => setAnnouncementPriority(e.target.value as NotificationPriority)}
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Announcement Message
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Enter announcement message..."
              className="w-full min-h-[100px] p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
          
          <Button
            onClick={handlePostAnnouncement}
            disabled={!announcement.trim()}
            className="w-full"
          >
            Post Announcement
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Header title="Settings" />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only administrators can access settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <Header title="Settings" />
      
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y dark:divide-gray-700">
          {panels.map((panel) => (
            <div key={panel.id} className="p-4">
              <button
                onClick={() => setExpandedPanel(expandedPanel === panel.id ? null : panel.id)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-3">
                  {panel.icon}
                  <span className="font-medium">{panel.name}</span>
                </div>
                {expandedPanel === panel.id ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
              
              {expandedPanel === panel.id && (
                <div className="mt-4 pl-8">
                  {panel.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;