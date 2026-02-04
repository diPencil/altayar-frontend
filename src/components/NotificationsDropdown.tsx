import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  Alert,
  I18nManager,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../contexts/NotificationsContext';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../services/api';
import { COLORS } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface NotificationsDropdownProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { notifications, unreadCount, isLoading, isAuthenticated, markAsRead, deleteNotification, getNotificationNavigation } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(height);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Get navigation info
    const navigationInfo = getNotificationNavigation(notification);

    if (navigationInfo) {
      try {
        if (navigationInfo.params) {
          router.push({
            pathname: navigationInfo.route,
            params: navigationInfo.params
          } as any);
        } else {
          router.push(navigationInfo.route as any);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to dashboard
        if (user?.role === 'CUSTOMER') {
          router.push('/(user)');
        } else if (['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
          router.push('/(admin)');
        } else if (['EMPLOYEE', 'AGENT'].includes(user?.role || '')) {
          router.push('/(employee)');
        }
      }
    }

    onClose();
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleDeleteNotification = (notification: Notification) => {
    Alert.alert(
      t('common.deleteNotification'),
      t('common.deleteNotificationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(notification.id);
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return 'person-outline';
      case 'USER_REGISTERED':
        return 'person-add-outline';
      case 'CHAT_MESSAGE':
        return 'chatbubble-outline';
      case 'USER_MEMBERSHIP_CHANGED':
        return 'card-outline';
      case 'ORDER_PLACED':
        return 'bag-outline';
      case 'PAYMENT_RECEIVED':
        return 'cash-outline';
      case 'BOOKING_CREATED':
        return 'calendar-outline';
      case 'SYSTEM_ALERT':
        return 'warning-outline';
      case 'CRITICAL_EVENT':
        return 'alert-circle-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SYSTEM_ALERT':
      case 'CRITICAL_EVENT':
        return COLORS.error;
      case 'USER_REGISTERED':
        return COLORS.success;
      case 'CHAT_MESSAGE':
        return COLORS.primary;
      case 'PAYMENT_RECEIVED':
        return COLORS.warning;
      default:
        return COLORS.textLight;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('common.justNow');
    if (diffInMinutes < 60) return t('common.minutesAgo', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('common.hoursAgo', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('common.daysAgo', { count: diffInDays });

    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US');
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationIcon, isRTL && styles.notificationIconRTL]}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={[styles.notificationHeader, isRTL && styles.notificationHeaderRTL]}>
          <Text style={[styles.notificationTitle, isRTL && styles.textRTL]} numberOfLines={1}>
            {t(`notifications.types.${item.type}`, item.title)}
          </Text>
          <Text style={[styles.notificationTime, isRTL && styles.textRTL]}>
            {formatTimeAgo(item.created_at)}
          </Text>
        </View>

        <Text style={[styles.notificationMessage, isRTL && styles.textRTL]} numberOfLines={2}>
          {item.message}
        </Text>

        <View style={[styles.notificationActions, isRTL && styles.notificationActionsRTL]}>
          {!item.is_read && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleMarkAsRead(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#6b7280" />
              <Text style={[styles.actionText, isRTL && styles.textRTL]}>{t('common.markAsRead')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteNotification(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {!item.is_read && <View style={[styles.unreadIndicator, isRTL && styles.unreadIndicatorRTL]} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
      <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>
        {isAuthenticated ? t('common.noNotifications') : t('auth.loginRequired')}
      </Text>
      <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
        {isAuthenticated ? t('common.allCaughtUp') : t('auth.loginToSeeNotifications')}
      </Text>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View style={[styles.dropdown, isRTL && styles.dropdownRTL, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('notifications.title')}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, isRTL && styles.closeButtonRTL]}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={[styles.unreadBadgeText, isRTL && styles.textRTL]}>
                {unreadCount} {t('common.unread')}
              </Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingState}>
              <Ionicons name="refresh-circle-outline" size={24} color="#6b7280" />
              <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t('common.loading')}</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderNotificationItem}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    maxHeight: height * 0.8,
    paddingBottom: 30, // Safe area padding
  },
  dropdownRTL: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  unreadBadge: {
    marginHorizontal: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyList: {
    flexGrow: 1,
  },

  // RTL Support Styles
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  closeButtonRTL: {
    marginRight: 0,
    marginLeft: 16,
  },
  notificationIconRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  notificationHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  notificationActionsRTL: {
    flexDirection: 'row-reverse',
  },
  unreadIndicatorRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  textRTL: {
    textAlign: 'right',
    fontFamily: 'Cairo-Regular', // Use Arabic font for better RTL support
  },
});

export default NotificationsDropdown;
