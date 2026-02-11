import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { notificationsService, Notification } from '../../src/services/notifications';

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadNotifications();
        loadStats();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const stats = await notificationsService.getStats();
            setUnreadCount(stats.unread);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadNotifications(), loadStats()]);
        setRefreshing(false);
    }, []);

    const handleNotificationPress = async (notification: Notification) => {
        // Mark as read
        if (!notification.is_read) {
            try {
                await notificationsService.markAsRead(notification.id);
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }

        // Navigate based on notification type and related entity
        const reelId = notification.related_entity_id || (notification as any).reel_id;
        const actionUrl = (notification as any).action_url;

        // Handle deep links
        if (actionUrl && actionUrl.startsWith('altayar://')) {
            const url = actionUrl.replace('altayar://', '');
            const [screen, ...params] = url.split('/');
            if (screen === 'reels' && params.length > 0) {
                router.push({
                    pathname: '/(user)/reels',
                    params: { reelId: params[0] }
                });
                return;
            }
        }

        // Navigate based on reel ID
        if (reelId && (notification.type === 'REEL_COMMENT' || notification.type === 'NEW_REEL')) {
            router.push({
                pathname: '/(user)/reels',
                params: { reelId }
            });
        } else if (notification.type === 'CHAT_MESSAGE' || notification.type?.includes('CHAT')) {
            router.push('/(user)/inbox');
        } else if (notification.type === 'ORDER_CREATED' || notification.type?.includes('ORDER')) {
            router.push('/(user)/orders');
        } else if (notification.type === 'BOOKING_CREATED' || notification.type?.includes('BOOKING')) {
            router.push('/(user)/bookings');
        } else if (notification.type === 'OFFER_CREATED' || notification.type?.includes('OFFER')) {
            if (reelId) {
                router.push(`/(user)/offer/${reelId}`);
            } else {
                router.push('/(user)/offers');
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'NEW_REEL':
                return { name: 'videocam', color: '#007AFF' };
            case 'COMMENT_REPLY':
                return { name: 'chatbubble', color: '#34C759' };
            case 'COMMENT_LIKE':
                return { name: 'heart', color: '#FF3B30' };
            case 'REEL_COMMENT':
                return { name: 'chatbubbles', color: '#FF9500' };
            default:
                return { name: 'notifications', color: '#8E8E93' };
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const icon = getNotificationIcon(item.type);
        const timeAgo = formatTimeAgo(item.created_at);

        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>{item.title}</Text>
                        {!item.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message}>{item.message}</Text>
                    {item.actor_name && (
                        <Text style={styles.actor}>{t('common.by', 'by')} {item.actor_name}</Text>
                    )}
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const formatTimeAgo = (dateString: string | Date | null | undefined): string => {
        if (!dateString) return t('common.justNow');

        try {
            const now = new Date();
            let date: Date;

            // Handle different date formats
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                // Handle ISO string with or without timezone
                let dateStr = dateString.trim();

                // If it doesn't have timezone info, assume UTC
                if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                    // Add Z for UTC if missing
                    if (dateStr.includes('T')) {
                        dateStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
                    }
                }

                date = new Date(dateStr);

                // Check if date is valid
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date string:', dateString);
                    return t('common.justNow');
                }
            } else {
                return t('common.justNow');
            }

            const diffInMs = now.getTime() - date.getTime();

            // Handle negative differences (future dates) - shouldn't happen but handle gracefully
            if (diffInMs < 0) {
                return t('common.justNow');
            }

            const diffInSeconds = Math.floor(diffInMs / 1000);
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);

            // More accurate day calculation - check actual calendar days
            if (diffInDays >= 1) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const notificationDate = new Date(date);
                notificationDate.setHours(0, 0, 0, 0);
                const actualDaysDiff = Math.floor((today.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24));

                if (actualDaysDiff >= 7) {
                    // For dates older than a week, show formatted date
                    const locale = isRTL ? 'ar-SA' : 'en-US';
                    const options: Intl.DateTimeFormatOptions = {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    };
                    return date.toLocaleDateString(locale, options);
                }

                return t('common.daysAgo', { count: actualDaysDiff });
            }

            // Handle hours, minutes, and seconds
            if (diffInMinutes < 1) {
                return t('common.justNow');
            }
            if (diffInMinutes < 60) {
                return t('common.minutesAgo', { count: diffInMinutes });
            }
            if (diffInHours < 24) {
                return t('common.hoursAgo', { count: diffInHours });
            }

            // Fallback to formatted date if somehow we get here
            const locale = isRTL ? 'ar-SA' : 'en-US';
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            };

            return date.toLocaleDateString(locale, options);
        } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return t('common.justNow');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('common.notificationsLabel')}</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={styles.markAllButton}
                        onPress={handleMarkAllRead}
                    >
                        <Text style={styles.markAllText}>{t('common.markAllAsRead')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="notifications-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>{t('common.notifications.empty')}</Text>
                    <Text style={styles.emptySubtitle}>
                        {t('common.notifications.noNotifications', "You'll see notifications here when you get them")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    markAllButton: {
        padding: 8,
    },
    markAllText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: '#F0F8FF',
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    contentContainer: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginStart: 8,
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        lineHeight: 20,
    },
    actor: {
        fontSize: 13,
        color: '#999',
        marginBottom: 4,
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    textRTL: {
        textAlign: 'right',
    },
});

