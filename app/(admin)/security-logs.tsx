import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#0891b2",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    purple: "#8b5cf6",
    warning: "#f59e0b",
};

export default function SecurityLogs() {
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
            // TODO: In the future, call a specific security logs endpoint if available
            const res = await adminApi.getRecentActivities(50);

            // Optional: Filter for security-like events if possible
            // For now, we show all system activities as a log
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
            case 'login': return COLORS.success;
            case 'security': return COLORS.warning;
            case 'user': return COLORS.primary;
            default: return COLORS.textLight;
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, isRTL && styles.backBtnRTL]}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('admin.manageSettings.security')}</Text>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <View style={[styles.list, isRTL && styles.listRTL]}>
                    {activities.length === 0 ? (
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('admin.manageActivities.empty') || "No logs found"}</Text>
                    ) : (
                        activities.map((activity, index) => (
                            <View key={index} style={[styles.activityItem, isRTL && styles.activityItemRTL]}>
                                <View style={[styles.activityIcon, { backgroundColor: `${getActivityColor(activity.type)}15` }, isRTL && { marginLeft: 0, marginRight: 0 }]}>
                                    <Ionicons name={activity.icon || "shield-checkmark-outline"} size={20} color={getActivityColor(activity.type)} />
                                </View>
                                <View style={[styles.activityContent, isRTL && styles.activityContentRTL]}>
                                    <Text style={[styles.activityTitle, isRTL && styles.textRTL]}>{activity.title || "System Event"}</Text>
                                    <Text style={[styles.activityDesc, isRTL && styles.textRTL]}>{activity.description || ""}</Text>
                                </View>
                                <View style={[styles.timeContainer, isRTL && styles.timeContainerRTL]}>
                                    <Text style={[styles.activityTime]}>
                                        {new Date(activity.time).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                                    </Text>
                                    <Text style={[styles.activityTime]}>
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
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
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
        marginLeft: 12,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
    },
    activityDesc: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    activityTime: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    // RTL Styles
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backBtnRTL: {
        marginRight: 0,
        marginLeft: 16,
    },
    listRTL: {
        // alignItems: 'flex-end',
    },
    textRTL: {
        textAlign: 'right',
    },
    activityItemRTL: {
        flexDirection: 'row-reverse',
    },
    activityContentRTL: {
        marginLeft: 0,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    timeContainerRTL: {
        alignItems: 'flex-start',
    },
});
