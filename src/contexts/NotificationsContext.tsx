import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { notificationsApi, Notification, NotificationListResponse, NotificationStats } from '../services/api';
import { useAuth } from './AuthContext';
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  addChatNotification: (conversationId: string, userName: string) => void;

  // Navigation helper - returns navigation info instead of navigating directly
  getNotificationNavigation: (notification: Notification) => { route: string; params?: any } | null;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to translate notification messages
  const translateNotificationMessage = (message: string): string => {
    if (!message.includes('|')) {
      return message; // Fallback for old format
    }

    const parts = message.split('|');
    const translationKey = parts[0];

    try {
      const translationTemplate = t(`notifications.messages.${translationKey}`, '');
      if (!translationTemplate) {
        return message; // Fallback if translation not found
      }

      // Replace placeholders in the translation
      let translatedMessage = translationTemplate;
      for (let i = 1; i < parts.length; i++) {
        const placeholder = '{{' + (i === 1 ? 'name' : i === 2 ? 'points' : i === 3 ? 'message' : `param${i}`) + '}}';
        translatedMessage = translatedMessage.replace(placeholder, parts[i]);
      }

      // Handle specific cases
      if (translationKey === 'USER_MEMBERSHIP_CHANGED' && parts.length >= 3) {
        translatedMessage = translatedMessage.replace('{{action}}', parts[2]);
      } else if (translationKey === 'CHAT_MESSAGE') {
        // KEY|SenderName|MessageContent
        if (parts.length >= 2) translatedMessage = translatedMessage.replace('{{name}}', parts[1]);
        if (parts.length >= 3) translatedMessage = translatedMessage.replace('{{message}}', parts[2]);
        return translatedMessage;
      }

      return translatedMessage;
    } catch (error) {
      console.warn('Error translating notification message:', error);
      return message;
    }
  };

  // Load notifications when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshNotifications();
      loadStats();

      // Register for push notifications
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          console.log('[Notifications] Pushing token to backend:', token);
          notificationsApi.updatePushToken(token).catch(err => {
            console.error('[Notifications] Failed to update push token:', err);
          });
        }
      });
    } else {
      // Clear data when not authenticated, but keep empty state
      setNotifications([]);
      setUnreadCount(0);
      setStats(null);
      setError(null);
    }
  }, [isAuthenticated, user]);

  // Listen for push notifications while app is foregrounded / tapped.
  useEffect(() => {
    // Foreground receive (does not automatically navigate)
    const receivedSub = ExpoNotifications.addNotificationReceivedListener(() => {
      // Refresh list to reflect new notifications saved by backend
      refreshNotifications().catch(() => {});
      loadStats().catch(() => {});
    });

    // User taps notification
    const responseSub = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = (response?.notification?.request?.content?.data || {}) as any;
        const url = data?.url || data?.action_url || data?.route;
        if (typeof url === 'string' && url.startsWith('/')) {
          router.push(url as any);
          return;
        }
      } catch (e) {
        console.warn('[Notifications] Failed to handle notification response:', e);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated, user, router]);

  const refreshNotifications = async () => {
    if (!isAuthenticated || !user) {
      console.log('[Notifications] Skipping refresh - not authenticated or no user');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[Notifications] Fetching notifications for user:', user.email);
      const response: NotificationListResponse = await notificationsApi.getNotifications({
        limit: 50,
        include_read: true,
      });

      console.log('[Notifications] Received response:', {
        notificationsCount: response.notifications?.length || 0,
        total: response.total,
        unread_count: response.unread_count
      });

      // Process notifications to translate messages
      const processedNotifications = response.notifications.map(notification => ({
        ...notification,
        title: t(`notifications.types.${notification.type}`, notification.title),
        message: translateNotificationMessage(notification.message),
      }));

      console.log('[Notifications] Setting notifications:', processedNotifications.length);
      setNotifications(processedNotifications);
      setUnreadCount(response.unread_count || 0);
    } catch (err: any) {
      console.error('[Notifications] Error loading notifications:', err);
      console.error('[Notifications] Error details:', {
        message: err?.message,
        stack: err?.stack,
        response: err?.response
      });

      // Don't set error for network issues - just log and keep empty state
      const errorMessage = err?.message || 'Failed to load notifications';
      // Only set error if it's not a connection error (to avoid showing error UI when backend is down)
      if (!errorMessage.includes('Cannot connect') && !errorMessage.includes('Failed to fetch')) {
        setError(errorMessage);
      }
      // Keep empty state instead of showing error
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const statsData = await notificationsApi.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading notification stats:', err);
    }
  };

  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      await notificationsApi.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
              title: t(`notifications.types.${notification.type}`, notification.type),
              message: translateNotificationMessage(notification.message)
            }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
      return false;
    }
  };

  const markAllAsRead = async (): Promise<boolean> => {
    try {
      await notificationsApi.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
          title: t(`notifications.types.${notification.type}`, notification.type),
          message: translateNotificationMessage(notification.message)
        }))
      );

      setUnreadCount(0);

      // Refresh stats
      await loadStats();

      return true;
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
      return false;
    }
  };

  const deleteNotification = async (notificationId: string): Promise<boolean> => {
    try {
      await notificationsApi.deleteNotification(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );

      return true;
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'Failed to delete notification');
      return false;
    }
  };

  const getNotificationNavigation = (notification: Notification) => {
    // Navigate based on notification type and related entity
    const { related_entity_type, related_entity_id, action_url, type } = notification;
    const userRole = user?.role;

    // If there's a custom action URL, use it
    if (action_url) {
      // Handle deep links like altayar://reels/{id}
      if (action_url.startsWith('altayar://')) {
        const url = action_url.replace('altayar://', '');
        const [screen, ...params] = url.split('/');

        if (screen === 'reels' && params.length > 0) {
          const reelId = params[0];
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/reels', params: { reelId } };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/reels', params: { reelId } };
          }
        }
      }

      // Fix for legacy/bad URLs like /employee/chat/[id]
      if (action_url.includes('/chat/') && !action_url.includes('?')) {
        const parts = action_url.split('/');
        const id = parts[parts.length - 1];
        if (id && id.length > 5) { // Basic ID validation
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/chat', params: { conversationId: id } };
          } else {
            return { route: '/(employee)/chats', params: { conversationId: id } };
          }
        }
      }

      // Fix for legacy/bad URLs like /users/[id]
      if (action_url.includes('/users/') && !action_url.includes('?')) {
        // Redirect to main users list as specific user page might not be fully linked or legacy
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/users' };
        }
      }

      // If action_url is a valid route, use it
      if (action_url.startsWith('/')) {
        return { route: action_url };
      }
    }

    // Default navigation based on entity type and user role
    switch (related_entity_type) {
      case 'USER':
        if (userRole === 'CUSTOMER') {
          return { route: '/profile' };
        } else if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          // Pass userId param to trigger deep link modal
          return {
            route: '/(admin)/users',
            params: { userId: related_entity_id }
          };
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          return { route: '/(employee)/customers' };
        }
        break;

      case 'CONVERSATION':
      case 'chat':
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return {
            route: '/(admin)/chat',
            params: { conversationId: related_entity_id }
          };
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          return {
            route: '/(employee)/chats',
            params: { conversationId: related_entity_id }
          };
        } else if (userRole === 'CUSTOMER') {
          return { route: '/(user)/inbox' };
        }
        break;

      case 'ORDER':
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/orders' };
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          // Assuming employees have order access? If not, default to dashboard
          return { route: '/(employee)' };
        } else if (userRole === 'CUSTOMER') {
          return { route: '/(user)/bookings' }; // Orders often shown in bookings/trips
        }
        break;

      case 'BOOKING':
        if (userRole === 'CUSTOMER') {
          return { route: '/(user)/bookings' };
        } else if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/bookings' };
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          return { route: '/(employee)' }; // Or bookings if employees have it
        }
        break;

      case 'PAYMENT':
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/payments' };
        } else if (userRole === 'CUSTOMER') {
          return { route: '/(user)/profile' }; // Wallet/Payments usually in profile
        }
        break;

      case 'MEMBERSHIP':
        if (userRole === 'CUSTOMER') {
          return { route: '/(user)/profile' };
        } else if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/memberships' };
        }
        break;

      case 'OFFER':
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/offers' }; // Offers management
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          return { route: '/(employee)' }; // Employee dashboard
        } else if (userRole === 'CUSTOMER') {
          if (related_entity_id) {
            return { route: `/(user)/offer/${related_entity_id}` };
          }
          return { route: '/(user)/offers' };
        }
        break;

      case 'REEL':
        // Reel-related notifications (comments, etc.)
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          if (related_entity_id) {
            return { route: '/(admin)/reels', params: { reelId: related_entity_id } };
          }
          return { route: '/(admin)/reels' };
        } else if (userRole === 'CUSTOMER') {
          if (related_entity_id) {
            // Navigate to reels page with the specific reel
            return { route: '/(user)/reels', params: { reelId: related_entity_id } };
          }
          return { route: '/(user)/reels' };
        }
        break;

      case 'TIER_POST':
        // Tier post notifications (user created a post in a tier)
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/tier-posts' };
        }
        break;

      case 'TIER_COMMENT':
        // Tier comment notifications (user commented on a tier post)
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)/tier-posts' };
        }
        break;

      default:
        // Fallback based on specific notification types if related_entity_type is missing/generic
        if (type?.includes('LOGIN') || type?.includes('REGISTER') || type?.includes('USER')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/users' };
          }
          if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
            return { route: '/(employee)/customers' };
          }
        }
        if (type?.includes('PAYMENT')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/payments' };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/wallet' };
          }
        }
        if (type?.includes('REEL') || type?.includes('COMMENT')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/reels' };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/reels' };
          }
        }
        if (type?.includes('CHAT') || type?.includes('MESSAGE')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/chat' };
          } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
            return { route: '/(employee)/chats' };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/inbox' };
          }
        }
        if (type?.includes('ORDER')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/orders' };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/orders' };
          }
        }
        if (type?.includes('BOOKING')) {
          if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            return { route: '/(admin)/bookings' };
          } else if (userRole === 'CUSTOMER') {
            return { route: '/(user)/bookings' };
          }
        }

        // For system notifications or unknown types, navigate to relevant dashboard
        if (['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
          return { route: '/(admin)' };
        } else if (userRole === 'CUSTOMER') {
          return { route: '/(user)' };
        } else if (['EMPLOYEE', 'AGENT'].includes(userRole || '')) {
          return { route: '/(employee)' };
        }
        console.log('Unknown notification entity type:', related_entity_type, 'type:', type);
    }

    return null;
  };

  // Add chat notification for admin when user reaches waiting state
  const addChatNotification = (conversationId: string, userName: string) => {
    if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN', 'EMPLOYEE'].includes(user?.role || '')) {
      return;
    }

    const chatNotification: Notification = {
      id: `chat_${conversationId}_${Date.now()}`,
      title: t('notifications.titles.newChatRequest', 'New Chat Request'),
      message: `newChatRequest|${userName}`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      related_entity_type: 'chat',
      related_entity_id: conversationId,
      target_role: 'ADMIN',
      target_user_id: user?.id || '',
      priority: 'normal',
      triggered_by_id: 'system',
      triggered_by_role: 'SYSTEM',
    };

    setNotifications(prev => [chatNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        stats,
        isLoading,
        error,
        isAuthenticated,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        addChatNotification,
        getNotificationNavigation,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      // alert('Failed to get push token for push notification!');
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      const rawProjectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;
      const projectId = typeof rawProjectId === 'string' && rawProjectId.trim() ? rawProjectId.trim() : undefined;

      // In EAS builds, projectId should be present. If it's missing, try legacy call.
      token = (
        await (projectId
          ? ExpoNotifications.getExpoPushTokenAsync({ projectId })
          : ExpoNotifications.getExpoPushTokenAsync())
      ).data;
    } catch (e) {
      console.error("Error getting push token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
