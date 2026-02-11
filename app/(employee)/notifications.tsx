import React from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { useNotifications } from "../../src/contexts/NotificationsContext";
import { Notification } from "../../src/services/api";

const COLORS = {
    primary: "#1071b8",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    lightGray: "#e2e8f0",
    success: "#10b981",
    danger: "#ef4444",
    blue: "#3b82f6",
    amber: "#f59e0b",
    gray: "#6b7280",
    unreadBg: "#f0f9ff",
};

export default function EmployeeNotificationsScreen() {
    const { isRTL, language } = useLanguage();
    const { t } = useTranslation();
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        deleteNotification,
        getNotificationNavigation
    } = useNotifications();

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
                router.push('/(employee)'); // Default fallback for employee
            }
        }
    };

    const handleMarkAsRead = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
    };

    const handleDeleteNotification = async (notification: Notification) => {
        await deleteNotification(notification.id);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'ADMIN_MESSAGE':
                return 'mail-outline';
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
            case 'ADMIN_MESSAGE':
                return COLORS.primary;
            case 'SYSTEM_ALERT':
            case 'CRITICAL_EVENT':
                return COLORS.danger;
            case 'USER_REGISTERED':
                return COLORS.success;
            case 'CHAT_MESSAGE':
                return COLORS.blue;
            case 'PAYMENT_RECEIVED':
                return COLORS.amber;
            default:
                return COLORS.gray;
        }
    };

    const formatTimeAgo = (dateString: string | Date | null | undefined) => {
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

    const renderNotificationItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !item.is_read && styles.unreadNotification,
                isRTL && styles.notificationItemRTL,
            ]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.notificationIcon, isRTL && styles.notificationIconRTL]}>
                <Ionicons
                    name={getNotificationIcon(item.type) as any}
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
                            style={[styles.actionButton, isRTL && styles.actionButtonRTL]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(item);
                            }}
                        >
                            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.gray} />
                            <Text style={[styles.actionText, isRTL && styles.actionTextRTL]}>
                                {t('common.markAsRead')}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(item);
                        }}
                    >
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            {!item.is_read && <View style={[styles.unreadIndicator, isRTL && styles.unreadIndicatorRTL]} />}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.lightGray} />
            <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>
                {t('common.noNotifications')}
            </Text>
            <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>
                {t('common.allCaughtUp')}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('common.notifications.title')}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Unread Badge */}
            {unreadCount > 0 && (
                <View style={[styles.unreadBadgeContainer, isRTL && styles.unreadBadgeContainerRTL]}>
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                            {unreadCount} {t('common.unread')}
                        </Text>
                    </View>
                </View>
            )}

            {/* Notifications List */}
            {isLoading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={[styles.loadingText, isRTL && styles.textRTL]}>
                        {t('common.loading')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNotificationItem}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    headerRTL: {
        flexDirection: "row-reverse",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.text,
    },
    unreadBadgeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    unreadBadgeContainerRTL: {
        alignItems: 'flex-end',
    },
    unreadBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.blue,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    unreadBadgeText: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    notificationItemRTL: {
        flexDirection: 'row-reverse',
    },
    unreadNotification: {
        backgroundColor: COLORS.unreadBg,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    notificationIconRTL: {
        marginEnd: 0,
        marginStart: 12,
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
    notificationHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
        marginEnd: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    notificationMessage: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationActionsRTL: {
        flexDirection: 'row-reverse',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    actionButtonRTL: {
        flexDirection: 'row-reverse',
    },
    actionText: {
        fontSize: 12,
        color: COLORS.gray,
        marginStart: 4,
    },
    actionTextRTL: {
        marginStart: 0,
        marginEnd: 4,
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.blue,
        alignSelf: 'center',
        marginStart: 8,
    },
    unreadIndicatorRTL: {
        marginStart: 0,
        marginEnd: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textLight,
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 8,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 12,
    },
    emptyList: {
        flexGrow: 1,
    },
    textRTL: {
        textAlign: 'right',
    },
});
