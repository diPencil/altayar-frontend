import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, RefreshControl, ScrollView, Platform
} from "react-native";
import { Stack, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#1071b8",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

export default function AdminBookings() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const params = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchBookings = async () => {
        try {
            setLoading(true);
            console.log('[Admin Bookings] Fetching bookings...');
            const data = await adminApi.getAllBookings({});
            console.log('[Admin Bookings] Fetched:', data?.length || 0, 'bookings');
            setBookings(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error("[Admin Bookings] Error fetching bookings:", error);
            console.error("[Admin Bookings] Error message:", error?.message);
            // Don't throw - just set empty array and let UI show empty state
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchBookings();
        setRefreshing(false);
    }, []);

    const handleCreate = () => {
        router.push('/(admin)/bookings/create' as any);
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    // Handle Deep Link Action
    useEffect(() => {
        if (params.action === 'create') {
            handleCreate();
        }
    }, [params.action]);

    const filteredBookings = bookings.filter(booking => {
        // Status Filter
        if (statusFilter && booking.status !== statusFilter) return false;

        // Search Filter
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const bookingNumber = booking.booking_number?.toLowerCase() || '';
        const customerName = (booking.customer_name || '').toLowerCase();
        const creatorName = (booking.creator_name || '').toLowerCase();
        const titleEn = (booking.title_en || '').toLowerCase();
        const titleAr = (booking.title_ar || '').toLowerCase();

        return bookingNumber.includes(query) ||
            customerName.includes(query) ||
            creatorName.includes(query) ||
            titleEn.includes(query) ||
            titleAr.includes(query);
    });

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.bookings.title"), headerBackTitle: t("common.back") }} />

            {/* Header Actions */}
            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('admin.bookings.title')}</Text>
                    <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>{bookings.length} {t("admin.bookings.totalBookings")}</Text>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreate}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.createBtnText}>{t("admin.bookings.new")}</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, isRTL && styles.rowRTL]}>
                <Ionicons name="search" size={20} color={COLORS.textLight} style={{ marginHorizontal: 8 }} />
                <TextInput
                    style={[styles.searchInput, isRTL && styles.textRTL]}
                    placeholder={t("admin.bookings.searchUser") || "Search..."}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={COLORS.textLight}
                />
            </View>

            {/* Filter Status Pills */}
            <View style={{ paddingBottom: 10 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        { paddingHorizontal: 16 },
                        isRTL && { flexDirection: 'row-reverse' }
                    ]}
                >
                    {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(status => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.pill,
                                statusFilter === status && styles.pillActive,
                                statusFilter === status && { backgroundColor: getStatusColor(status) }
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[styles.pillText, statusFilter === status && { color: 'white' }]}>
                                {status ? t(`common.statuses.${status}`) : t('common.all')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
                ) : filteredBookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="airplane-outline" size={64} color={COLORS.textLight} />
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('common.noBookings')}</Text>
                    </View>
                ) : (
                    filteredBookings.map((booking: any) => (
                        <BookingCard key={booking.id} booking={booking} />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function BookingCard({ booking }: any) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const statusColor = getStatusColor(booking.status);

    return (
        <TouchableOpacity
            style={[styles.card, isRTL && styles.cardRTL]}
            onPress={() => router.push(`/(admin)/bookings/${booking.id}` as any)}
        >
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.bookingNumber, isRTL && styles.textRTL]}>{booking.booking_number}</Text>
                    <Text style={[styles.bookingType, isRTL && styles.textRTL]}>{t(`admin.bookings.types.${booking.booking_type?.toLowerCase()}`) || booking.booking_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {t(`common.statuses.${booking.status}`)}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={[styles.cardBody, isRTL && styles.cardBodyRTL]}>
                <Text style={[styles.bookingTitle, isRTL && styles.textRTL]}>
                    {isRTL ? booking.title_ar : booking.title_en}
                </Text>

                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.customer')}</Text>
                    <Text style={[styles.value, isRTL && styles.textRTL]}>
                        {booking.customer_name || booking.creator_name}
                    </Text>
                </View>

                {booking.booking_source === 'ADMIN' && booking.creator_name !== booking.customer_name && (
                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.createdBy')}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL, { color: COLORS.textLight }]}>
                            {booking.creator_name}
                        </Text>
                    </View>
                )}

                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t("admin.bookings.date")}</Text>
                    <Text style={[styles.value, isRTL && styles.textRTL]}>{new Date(booking.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</Text>
                </View>

                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t("admin.bookings.total")}</Text>
                    <Text style={[styles.amount, isRTL && styles.textRTL]}>{booking.total_amount} {booking.currency}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case "CONFIRMED": return COLORS.success;
        case "PENDING": return COLORS.warning;
        case "CANCELLED": return COLORS.error;
        case "COMPLETED": return COLORS.primary;
        default: return COLORS.textLight;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRowRTL: {
        flexDirection: 'row-reverse',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    pageSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '600',
        marginStart: 6,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        margin: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
        textAlign: 'auto',
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginEnd: 8,
    },
    pillActive: {
        borderColor: 'transparent',
    },
    pillText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    bookingNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    bookingType: {
        fontSize: 11,
        color: COLORS.textLight,
        fontWeight: '500',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 12,
    },
    cardBody: {
        gap: 8,
    },
    bookingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        color: COLORS.textLight,
        fontSize: 13,
    },
    value: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '500',
    },
    amount: {
        color: COLORS.success,
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS.textLight,
        fontSize: 16,
    },
    // RTL Styles
    textRTL: {
        textAlign: 'right',
    },
    cardRTL: {
        // RTL handled by flexDirection in parent components
    },
    cardBodyRTL: {
        alignItems: 'stretch',
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    labelRTL: {
        textAlign: 'right',
    },
});
