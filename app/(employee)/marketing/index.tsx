import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Image, Alert } from "react-native";
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { offersApi, Offer } from "../../../src/services/api";
import Toast from "../../../src/components/Toast";
import ConfirmModal from "../../../src/components/ConfirmModal";

const COLORS = {
    primary: "#1071b8",
    secondary: "#167dc1",
    background: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    purple: "#8b5cf6",
    danger: "#ef4444"
};

export default function MarketingDashboard() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { isRTL } = useLanguage();
    const [recentItems, setRecentItems] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
    const shownToastRef = useRef<string | null>(null);
    const [deleteModal, setDeleteModal] = useState({ visible: false, id: "" });

    const ACTIONS = [
        {
            id: 'offer',
            label: t('employee.dashboard.quickActions.sendOffer', 'Offer'),
            icon: 'pricetag',
            color: COLORS.primary,
            route: '/(employee)/marketing/create?type=PACKAGE'
        },
        {
            id: 'discount',
            label: t('employee.dashboard.quickActions.sendDiscount', 'Discount'),
            icon: 'trending-down',
            color: COLORS.danger,
            route: '/(employee)/marketing/create?type=DISCOUNT&discount=true'
        },
        {
            id: 'voucher',
            label: t('employee.dashboard.quickActions.sendVoucher', 'Voucher'),
            icon: 'ticket',
            color: COLORS.purple,
            route: '/(employee)/marketing/create?type=VOUCHER&voucher=true'
        },
        {
            id: 'broadcast',
            label: t('employee.dashboard.quickActions.broadcast', 'Broadcast'),
            icon: 'megaphone',
            color: COLORS.warning,
            route: '/(employee)/marketing/create?type=BROADCAST&broadcast=true'
        }
    ];

    const fetchRecentItems = async () => {
        try {
            setLoading(true);
            const data = await offersApi.getAll({ offer_source: 'MARKETING' });
            const sorted = data.sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
            setRecentItems(sorted.slice(0, 20));
        } catch (error) {
            console.log("Error fetching marketing items:", error);
            setToast({ visible: true, message: t("common.errorOccurred", "Error occurred"), type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteModal({ visible: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        setDeleteModal({ visible: false, id: "" });
        try {
            setLoading(true);
            await offersApi.delete(id);
            setToast({ visible: true, message: t("offers.messages.deleted", "Deleted"), type: "success" });
            fetchRecentItems();
        } catch (e: any) {
            setToast({ visible: true, message: e?.message || t("common.errorOccurred", "Error occurred"), type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const toastParam = typeof (params as any)?.toast === "string" ? ((params as any).toast as string) : undefined;
        if (!toastParam || shownToastRef.current === toastParam) return;
        shownToastRef.current = toastParam;
        const msg =
            toastParam === "updated"
                ? t("offers.messages.successUpdate", "Updated")
                : toastParam === "deleted"
                    ? t("offers.messages.deleted", "Deleted")
                    : t("offers.messages.success", "Created");
        setToast({ visible: true, message: msg, type: "success" });
        // Clear query param so the same toast can show next time
        router.replace("/(employee)/marketing" as any);
    }, [params, t]);

    useFocusEffect(
        useCallback(() => {
            fetchRecentItems();
        }, [])
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return COLORS.success;
            case 'DRAFT': return COLORS.textLight;
            case 'EXPIRED': return COLORS.danger;
            case 'PAUSED': return COLORS.warning;
            default: return COLORS.textLight;
        }
    };

    const getTypeLabel = (type: string) => {
        if (type === 'VOUCHER') return t('offers.voucherTitle', 'Voucher');
        if (type === 'DISCOUNT') return t('offers.discountTitle', 'Discount');
        if (type === 'OTHER' || type === 'BROADCAST') return t('offers.broadcastTitle', 'Broadcast');
        return type; // HOTEL, FLIGHT, etc.
    };

    const renderItem = ({ item }: { item: Offer }) => (
        <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push(`/(employee)/marketing/create?id=${item.id}` as any)}
        >
            <View style={[styles.itemIcon, { backgroundColor: item.offer_type === 'VOUCHER' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(8, 145, 178, 0.1)' }]}>
                <Ionicons
                    name={item.offer_type === 'VOUCHER' ? 'ticket' : (item.offer_type === 'DISCOUNT' ? 'trending-down' : 'pricetag')}
                    size={20}
                    color={item.offer_type === 'VOUCHER' ? COLORS.purple : COLORS.primary}
                />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {isRTL ? item.title_ar : item.title_en}
                </Text>
                <View style={[styles.itemMeta, { flexDirection: 'row' }]}>
                    <Text style={styles.itemType}>{getTypeLabel(item.offer_type)}</Text>
                    <Text style={styles.dot}>{t("common.bulletDot")}</Text>
                    <Text style={styles.itemDate}>
                        {new Date(item.created_at || "").toLocaleDateString()}
                    </Text>
                </View>
                {!!(item.created_by_name || item.created_by_email || item.created_by_user_id) && (
                    <Text style={[styles.itemCreator, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                        {t("common.createdBy", "Created by")}:{" "}
                        {item.created_by_name || item.created_by_email || item.created_by_user_id}
                        {item.created_by_role ? ` (${t(`common.role.${item.created_by_role}`, item.created_by_role)})` : ""}
                    </Text>
                )}
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 6 }}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
                <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={(e: any) => {
                        if (e?.stopPropagation) e.stopPropagation();
                        handleDeleteClick(item.id);
                    }}
                    disabled={loading}
                >
                    <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('admin.marketing', 'Marketing'), headerBackTitle: t("common.back"), headerShadowVisible: false, headerStyle: { backgroundColor: COLORS.background } }} />

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('admin.marketing', 'Marketing Board')}</Text>
                <Text style={[styles.headerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t("marketingDashboard.subtitle")}
                </Text>
            </View>

            {/* Compact Action Row */}
            <View style={styles.actionsContainer}>
                <View style={[styles.actionRow, { flexDirection: 'row' }]}>
                    {ACTIONS.map((action) => (
                        <TouchableOpacity
                            key={action.id}
                            style={styles.actionCard}
                            onPress={() => router.push(action.route as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                                <Ionicons name={action.icon as any} size={20} color="white" />
                            </View>
                            <Text style={styles.actionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Recent Activity List */}
            <View style={styles.listContainer}>
                <Text style={[styles.listHeader, { textAlign: isRTL ? 'right' : 'left' }]}>{t("marketingDashboard.recentActivity")}</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={recentItems}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="list" size={48} color={COLORS.textLight} style={{ opacity: 0.5 }} />
                                <Text style={styles.emptyText}>{t("marketingDashboard.empty")}</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type as any}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <ConfirmModal
                visible={deleteModal.visible}
                title={t("common.delete", "Delete")}
                message={t("common.confirmDelete", "Are you sure you want to delete this item?")}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ visible: false, id: "" })}
                confirmText={t("common.delete", "Delete")}
                cancelText={t("common.cancel", "Cancel")}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    actionsContainer: {
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    actionCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 12,
        width: '48%', // 2 per row
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    listContainer: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    listHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.background,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemType: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    dot: {
        fontSize: 12,
        color: COLORS.textLight,
        marginHorizontal: 6,
    },
    itemDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    itemCreator: {
        marginTop: 2,
        fontSize: 12,
        color: COLORS.textLight,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS.textLight,
        fontSize: 14,
    }
});
