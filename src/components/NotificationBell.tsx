import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../contexts/NotificationsContext';
import NotificationsDropdown from './NotificationsDropdown';
import { COLORS } from '../utils/theme';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 24,
  color = '#374151'
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { unreadCount, isAuthenticated } = useNotifications();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const closeDropdown = () => {
    setDropdownVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, isRTL && styles.containerRTL]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={size} color={color} />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationsDropdown
        visible={dropdownVisible}
        onClose={closeDropdown}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    marginEnd: 8,
  },
  containerRTL: {
    marginEnd: 0,
    marginStart: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default NotificationBell;
