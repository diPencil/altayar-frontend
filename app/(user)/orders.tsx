import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { ordersApi, bookingsApi } from "../../src/services/api";
import { formatCurrency } from "../../src/utils/currency";
import { initiateOrderPayment, initiateBookingPayment } from "../../src/services/paymentHelpers";

const COLORS = {
    primary: "#1071b8",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    lightGray: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
};

export default function HistoryScreen() {
    const { isRTL, language } = useLanguage();
    const { t } = useTranslation();
    const { isAuthenticated, user } = useAuth();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [historyItems, setHistoryItems] = useState<any[]>([]);

    // Details Modal
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [paying, setPaying] = useState(false);
    const [saveCard, setSaveCard] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            loadHistory();
        }
    }, [isAuthenticated]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const [ordersRes, bookingsRes] = await Promise.all([
                ordersApi.getMyOrders().catch(() => []),
                bookingsApi.getMyBookings().catch(() => [])
            ]);

            const combined = [
                ...(ordersRes || []).map((o: any) => ({ ...o, _type: 'order' })),
                ...(bookingsRes || []).map((b: any) => ({
                    ...b,
                    _type: 'booking',
                    total_amount: b.total_price || b.total_amount,
                }))
            ];

            // Sort by created_at desc
            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setHistoryItems(combined);
        } catch (error) {
            console.log('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    };

    const openDetails = async (item: any) => {
        setDetailsVisible(true);
        setLoadingDetails(true);
        setSelectedItem(null);

        try {
            let details;
            if (item._type === 'booking') {
                details = await bookingsApi.getBooking(item.id);
                setSelectedItem({ ...details, _type: 'booking' });
            } else {
                details = await ordersApi.getOrder(item.id);
                setSelectedItem({ ...details, _type: 'order' });
            }
        } catch (error) {
            console.log('Error loading details:', error);
            Alert.alert(t('common.error'), "Failed to load details");
            setDetailsVisible(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handlePay = async () => {
        if (!selectedItem || !user) return;

        try {
            setPaying(true);
            const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

            if (selectedItem._type === 'booking') {
                await initiateBookingPayment(selectedItem, user.email, userName, saveCard);
            } else {
                await initiateOrderPayment(selectedItem, user.email, userName, saveCard);
            }
            setDetailsVisible(false);
        } catch (error) {
            console.log('Payment error:', error);
            Alert.alert(t('common.error'), t('payment.initiationFailed'));
        } finally {
            setPaying(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'paid' || s === 'confirmed') return COLORS.success;
        if (s === 'pending' || s === 'unpaid') return COLORS.error; // Unpaid is Red/Error as per screenshot
        if (s === 'cancelled') return COLORS.textLight;
        return COLORS.warning;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('orders.title') || "My Orders"}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : historyItems.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="time-outline" size={64} color={COLORS.lightGray} />
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                            {t('common.noHistory') || "No history found"}
                        </Text>
                    </View>
                ) : (
                    historyItems.map((item, index) => {
                        const isBooking = item._type === 'booking';
                        const paymentStatus = item.payment_status?.toUpperCase() || 'UNPAID';
                        const displayId = isBooking
                            ? (item.booking_number || item.id?.slice(0, 8))
                            : (item.order_number || item.id?.slice(0, 8));
                        const date = new Date(item.created_at || item.start_date || Date.now()).toLocaleDateString();

                        return (
                            <TouchableOpacity
                                key={item.id || index}
                                style={styles.card}
                                onPress={() => openDetails(item)}
                            >
                                <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons
                                            name={isBooking ? "ticket-outline" : "document-text-outline"}
                                            size={24}
                                            color={COLORS.primary}
                                        />
                                    </View>

                                    <View style={[styles.cardInfo, isRTL && styles.cardInfoRTL]}>
                                        <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
                                            {isBooking ? `PAY-${item.created_at?.slice(0, 4)}-${displayId}` : `ORD-${item.created_at?.slice(0, 4)}-${displayId}`}
                                        </Text>
                                        <Text style={[styles.cardDate, isRTL && styles.textRTL]}>{date}</Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(paymentStatus) + '20' }]}>
                                        {paymentStatus === 'UNPAID' && <Ionicons name="alert-circle" size={12} color={COLORS.error} style={{ marginEnd: 4 }} />}
                                        <Text style={[styles.statusText, { color: getStatusColor(paymentStatus) }]}>
                                            {paymentStatus === 'UNPAID' ? t('common.unpaid') :
                                                paymentStatus === 'PAID' ? t('common.statuses.PAID', 'Paid') :
                                                    paymentStatus}
                                        </Text>
                                        {paymentStatus === 'PAID' && <Ionicons name="checkmark-circle" size={12} color={COLORS.success} style={{ marginStart: 4 }} />}
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={[styles.cardFooter, isRTL && styles.cardFooterRTL]}>
                                    <View>
                                        <Text style={[styles.footerLabel, isRTL && styles.textRTL]}>{t('orders.total')}</Text>
                                        {isBooking && item.hotel_name && (
                                            <Text style={[styles.footerSub, isRTL && styles.textRTL]}>
                                                {t("orders.types.hotel")}: {item.hotel_name}
                                            </Text>
                                        )}
                                        {isBooking && item.custom_note && (
                                            <Text style={[styles.footerSub, isRTL && styles.textRTL]}>
                                                {t("orders.types.custom")}: {item.custom_note}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.amount}>
                                        {formatCurrency(item.total_amount, item.currency, isRTL ? 'ar-EG' : 'en-US')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Details Modal */}
            <Modal visible={detailsVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, isRTL && styles.headerRTL]}>
                        <Text style={styles.modalTitle}>{t('common.details') || "Details"}</Text>
                        <TouchableOpacity onPress={() => setDetailsVisible(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    {loadingDetails ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                    ) : selectedItem ? (
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {/* Header Info */}
                            <View style={[styles.detailsSection, { flexDirection: 'row' }]}>
                                <Text style={styles.detailsLabel}>
                                    {selectedItem._type === 'booking' ? t('common.bookingNumber') : t('common.invoiceNumber')}
                                    {selectedItem.order_number || selectedItem.booking_number || selectedItem.id?.slice(0, 8)}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedItem.payment_status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(selectedItem.payment_status) }]}>
                                        {selectedItem.payment_status === 'UNPAID' ? t('common.unpaid') :
                                            selectedItem.payment_status === 'PAID' ? t('common.statuses.PAID', 'Paid') :
                                                selectedItem.payment_status}
                                    </Text>
                                </View>
                            </View>

                            {/* Items Section if available */}
                            {selectedItem.items && selectedItem.items.length > 0 && (
                                <>
                                    <Text style={[styles.sectionHeader, isRTL && styles.textRTL]}>{t('admin.manageInvoices.items') || "Items"}</Text>
                                    {selectedItem.items.map((item: any, idx: number) => {
                                        const fullDesc = isRTL ? (item.description_ar || item.description) : (item.description_en || item.description);
                                        const lines = fullDesc ? fullDesc.split('\n') : [item.service_name || 'Item'];
                                        const title = lines[0];
                                        const description = lines.length > 1 ? lines.slice(1).join('\n') : '';

                                        return (
                                            <View key={idx} style={[styles.itemRow, isRTL && styles.itemRowRTL]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.itemTitle, isRTL && styles.textRTL]}>{title}</Text>
                                                    {description ? (
                                                        <Text style={[styles.itemDescription, isRTL && styles.textRTL]}>{description}</Text>
                                                    ) : null}
                                                    <Text style={[styles.itemParams, isRTL && styles.textRTL]}>
                                                        {item.quantity} x {formatCurrency(item.unit_price, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.itemTotal, isRTL && styles.textRTL]}>
                                                    {formatCurrency(item.quantity * item.unit_price, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={styles.divider} />
                                </>
                            )}

                            {/* Financial Summary */}
                            <View style={[styles.summaryRow, isRTL && styles.headerRTL]}>
                                <Text style={styles.summaryLabel}>{t('admin.manageInvoices.subtotal') || "Subtotal"}</Text>
                                <Text style={styles.summaryValue}>
                                    {formatCurrency(selectedItem.subtotal || selectedItem.total_amount, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                </Text>
                            </View>

                            {selectedItem.tax_amount > 0 && (
                                <View style={[styles.summaryRow, isRTL && styles.headerRTL]}>
                                    <Text style={styles.summaryLabel}>{t('admin.manageInvoices.tax') || "Tax"}</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatCurrency(selectedItem.tax_amount, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                    </Text>
                                </View>
                            )}

                            {selectedItem.discount_amount > 0 && (
                                <View style={[styles.summaryRow, isRTL && styles.headerRTL]}>
                                    <Text style={[styles.summaryLabel, { color: COLORS.warning }]}>{t('common.discount') || "Discount"}</Text>
                                    <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                                        - {formatCurrency(selectedItem.discount_amount, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            <View style={[styles.totalRow, isRTL && styles.headerRTL]}>
                                <Text style={styles.totalLabelLarge}>{t('orders.total')}</Text>
                                <Text style={styles.amountLarge}>
                                    {formatCurrency(selectedItem.total_amount, selectedItem.currency, isRTL ? 'ar-EG' : 'en-US')}
                                </Text>
                            </View>

                            {/* Pay Button */}
                            {selectedItem.payment_status !== 'PAID' && (
                                <>
                                    <View style={styles.saveCardContainer}>
                                        <TouchableOpacity
                                            style={[styles.checkbox, saveCard && styles.checkboxChecked]}
                                            onPress={() => setSaveCard(!saveCard)}
                                        >
                                            {saveCard && <Ionicons name="checkmark" size={16} color="#fff" />}
                                        </TouchableOpacity>
                                        <Text style={[styles.saveCardText, isRTL && styles.textRTL]}>
                                            {t('membership.saveCard', 'Save card for future payments')}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.payBtn}
                                        onPress={handlePay}
                                        disabled={paying}
                                    >
                                        {paying ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <Text style={styles.payBtnText}>{t('common.payNow') || "Pay Now"}</Text>
                                                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" style={{ marginStart: 8 }} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Booking/Order Details would go here - simplified for now */}
                            <View style={styles.divider} />
                            <Text style={{ color: COLORS.textLight }}>
                                Type: {selectedItem._type === 'booking' ? 'Booking' : 'Order'}{"\n"}
                                Date: {new Date(selectedItem.created_at).toLocaleString()}
                            </Text>

                        </ScrollView>
                    ) : null}
                </View>
            </Modal>
        </View>
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
        paddingBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomStartRadius: 30,
        borderBottomEndRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    headerRTL: {
        flexDirection: "row-reverse",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.text,
    },
    content: {
        flex: 1,
        padding: 16,
        paddingBottom: 100, // Increased padding to clear bottom menu
    },
    textRTL: {
        textAlign: "right",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: 16,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    cardHeaderRTL: {
        flexDirection: "row-reverse",
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#e0f2fe", // Light blue bg for icon
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        marginHorizontal: 12,
    },
    cardInfoRTL: {
        alignItems: "flex-end",
    },
    cardTitle: {
        fontSize: 15, // Slightly smaller than header
        fontWeight: "bold",
        color: COLORS.text,
    },
    cardDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "bold",
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.lightGray,
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardFooterRTL: {
        flexDirection: 'row-reverse',
    },
    footerLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    footerSub: {
        fontSize: 11,
        color: COLORS.textLight,
        fontStyle: 'italic',
        marginTop: 2,
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        backgroundColor: COLORS.white,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 8,
    },
    detailsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    detailsLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.text,
    },
    amountLarge: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        alignSelf: 'center',
        marginBottom: 30,
    },
    payBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    payBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Missing styles added
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: COLORS.text,
        marginTop: 10,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    itemRowRTL: {
        flexDirection: 'row-reverse',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    itemDescription: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    itemParams: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    itemTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        marginBottom: 20,
    },
    totalLabelLarge: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    saveCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    saveCardText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
});
