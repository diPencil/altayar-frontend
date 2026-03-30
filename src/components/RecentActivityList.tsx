import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../utils/theme';

interface ActivityItem {
    id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    type?: string;
    points?: number;
    amount?: number;
    status?: string;
    description?: string;
    reference_type?: string;
    created_at: string;
}

interface RecentActivityListProps {
    fetchData: () => Promise<ActivityItem[]>;
    type: 'points' | 'cashback' | 'wallet';
    onViewAll?: () => void;
}

export default function RecentActivityList({ fetchData, type, onViewAll }: RecentActivityListProps) {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await fetchData();
            if (Array.isArray(data)) {
                setActivities(data);
            } else {
                console.warn("RecentActivityList: Received non-array data", data);
                setActivities([]);
            }
        } catch (error) {
            console.error("Failed to load recent activities", error);
            setActivities([]); // Ensure array on error
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (seconds < 60) return language === 'ar' ? 'منذ لحظات' : 'Just now';

            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;

            const hours = Math.floor(minutes / 60);
            if (hours < 24) return language === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`;

            const days = Math.floor(hours / 24);
            if (days < 7) return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;

            return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
        } catch (e) {
            return '';
        }
    };

    const renderActivityText = (item: ActivityItem) => {
        if (type === 'points') {
            const isAdd = item.points && item.points > 0;
            const pointsText = `${Math.abs(item.points || 0)} ${t('common.pts')}`;
            if (isAdd) {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.managePoints.received')} <Text style={styles.highlightSuccess}>{pointsText}</Text>
                    </Text>
                );
            } else {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.managePoints.deducted')} <Text style={styles.highlightError}>{pointsText}</Text>
                    </Text>
                );
            }
        } else if (type === 'wallet') {
            // Wallet transactions
            const isAdd = item.amount && item.amount > 0;
            const currency = (item as any).currency || 'USD';
            const amountText = `${Math.abs(item.amount || 0).toFixed(2)} ${currency}`;
            if (isAdd) {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.manageWallets.deposited', 'Deposited')} <Text style={styles.highlightSuccess}>{amountText}</Text>
                    </Text>
                );
            } else {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.manageWallets.withdrawn', 'Withdrawn')} <Text style={styles.highlightError}>{amountText}</Text>
                    </Text>
                );
            }
        } else {
            // Cashback
            const isAdd = item.amount && item.amount > 0;
            const amountText = `${Math.abs(item.amount || 0).toFixed(2)} ${t('common.currency.usd')}`;
            if (isAdd) {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.manageCashback.received')} <Text style={styles.highlightSuccess}>{amountText}</Text>
                    </Text>
                );
            } else {
                return (
                    <Text style={[styles.activityText, isRTL && styles.textRTL]}>
                        <Text style={styles.userName}>{item.user_name}</Text> {t('admin.manageCashback.deducted')} <Text style={styles.highlightError}>{amountText}</Text>
                    </Text>
                );
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.card}>
                <ActivityIndicator size="small" color="#2563eb" />
            </View>
        );
    }

    if (activities.length === 0) return null;

    return (
        <View style={styles.card}>
            <View style={[styles.header]}>
                <Text style={[styles.title, isRTL && styles.textRTL]}>
                    {t('admin.dashboard.recentActivity', 'Recent Activity')}
                </Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll}>
                        <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.list}>
                {activities.slice(0, 5).map((item) => (
                    <View key={item.id} style={[styles.item]}>
                        {item.user_avatar ? (
                            <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={16} color="#64748b" />
                            </View>
                        )}

                        <View style={styles.content}>
                            {renderActivityText(item)}
                            <Text style={[styles.time, isRTL && styles.textRTL]}>{formatTime(item.created_at)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    viewAll: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '500',
    },
    list: {
        gap: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginEnd: 12,
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    content: {
        flex: 1,
    },
    activityText: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 20,
    },
    userName: {
        fontWeight: 'bold',
        color: '#1e293b',
    },
    highlightSuccess: {
        color: COLORS.success,
        fontWeight: '600',
    },
    highlightError: {
        color: '#ef4444',
        fontWeight: '600',
    },
    time: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    textRTL: {
        textAlign: 'right',
    },
});
