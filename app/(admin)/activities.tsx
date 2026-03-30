import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    purple: "#8b5cf6",
    warning: "#f59e0b",
};

export default function AllActivities() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            // Fetch up to 50 activities
            const res = await adminApi.getRecentActivities(50);
            setActivities(res || []);
        } catch (e) {
            console.log("Error fetching activities", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivities();
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'user': return COLORS.primary;
            case 'payment': return COLORS.success;
            case 'booking': return COLORS.purple;
            case 'membership': return COLORS.warning;
            default: return COLORS.textLight;
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, isRTL && styles.backBtnRTL]}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={[styles.title, isRTL && styles.titleRTL]}>{t('admin.manageActivities.title')}</Text>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <View style={styles.list}>
                    {activities.length === 0 ? (
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('admin.manageActivities.empty')}</Text>
                    ) : (
                        activities.map((activity, index) => (
                            <View key={index} style={styles.activityItem}>
                                <View style={[styles.activityIcon, { backgroundColor: `${getActivityColor(activity.type)}15` }]}>
                                    <Ionicons name={activity.icon || "information-circle"} size={20} color={getActivityColor(activity.type)} />
                                </View>
                                <View style={[styles.activityContent, isRTL && styles.activityContentRTL]}>
                                    <Text style={[styles.activityTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                                        {t(`manageActivities.types.${(activity.type || '').toLowerCase()}`) || activity.title || 'Activity'}
                                    </Text>
                                    <Text style={[styles.activityDesc, isRTL && styles.activityDescRTL]} numberOfLines={2}>
                                        {activity.description || ''}
                                    </Text>
                                </View>
                                <View style={[styles.timeContainer, isRTL && styles.timeContainerRTL]}>
                                    <Text style={[styles.activityTime, isRTL && styles.activityTimeRTL]}>
                                        {new Date(activity.time).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                                    </Text>
                                    <Text style={[styles.activityTime, isRTL && styles.activityTimeRTL]}>
                                        {new Date(activity.time).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    backBtn: {
        marginEnd: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
        flex: 1,
    },
    titleRTL: {
        textAlign: "right",
    },
    list: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        padding: 20,
    },
    activityItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    activityContent: {
        flex: 1,
        marginStart: 12,
        minWidth: 0,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
        alignSelf: "stretch",
    },
    activityDesc: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
        alignSelf: "stretch",
    },
    timeContainer: {
        flexShrink: 0,
        maxWidth: 104,
        alignItems: "flex-end",
        marginStart: 8,
    },
    activityTime: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    activityTimeRTL: {
        textAlign: "left",
    },
    // RTL Styles

    backBtnRTL: {
        marginEnd: 0,
        marginStart: 16,
    },
    textRTL: {
        textAlign: "right",
    },

    activityContentRTL: {
        marginStart: 0,
        marginEnd: 12,
    },
    activityDescRTL: {
        textAlign: "right",
    },
    timeContainerRTL: {
        alignItems: "flex-start",
        marginStart: 0,
        marginEnd: 8,
    },
});
