import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { bookingsApi, Booking, ordersApi } from "../../../src/services/api";
import { formatCurrency } from "../../../src/utils/currency";

const COLORS = {
    primary: "#0891b2",
    secondary: "#06b6d4",
    background: "#f0f9ff",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    border: "#e2e8f0",
    white: "#ffffff",
};

export default function BookingDetailsScreen() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [saveCard, setSaveCard] = useState(true);

    useEffect(() => {
        if (id) {
            loadBookingDetails();
        }
    }, [id]);

    const loadBookingDetails = async () => {
        try {
            setLoading(true);
            const data = await bookingsApi.getBooking(id as string);
            setBooking(data);
        } catch (error) {
            console.error("Error loading booking details:", error);
            Alert.alert(t("common.error"), t("bookings.loadError"));
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = async () => {
        if (!booking) return;

        // 1. Check if we have an Invoice ID linked manualy
        const invoiceId = booking.booking_details?.invoice_id;

        if (invoiceId) {
            // Option A: Navigate to Invoices screen (Simplest, user sees all unpaid invoices)
            // router.push("/(user)/invoices");

            // Option B: Trigger payment directly for that invoice
            try {
                setPaying(true);
                const res = await ordersApi.payOrder(invoiceId, saveCard);
                if (res.payment_url) {
                    router.push({
                        pathname: '/(user)/payment/[paymentId]',
                        params: {
                            paymentId: res.payment_id,
                            paymentUrl: res.payment_url
                        }
                    });
                } else {
                    Alert.alert(t('common.error'), "Payment URL not found");
                }
            } catch (error: any) {
                Alert.alert(t('common.error'), error.message || "Payment failed");
            } finally {
                setPaying(false);
            }
        } else {
            // Manual Booking (No Invoice) - Pay directly via booking
            try {
                setPaying(true);
                const res = await bookingsApi.payBooking(booking.id as string, 1, saveCard);
                if (res.payment_url) {
                    router.push({
                        pathname: '/(user)/payment/[paymentId]',
                        params: {
                            paymentId: res.payment_id,
                            paymentUrl: res.payment_url
                        }
                    });
                } else {
                    Alert.alert(t('common.error'), "Payment URL not found");
                }
            } catch (error: any) {
                Alert.alert(t('common.error'), error.message || "Payment failed");
            } finally {
                setPaying(false);
            }
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Booking ${booking?.booking_number}: ${isRTL ? booking?.title_ar : booking?.title_en}`
            });
        } catch (error) {
            console.log(error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case "CONFIRMED": return COLORS.success;
            case "PENDING": return COLORS.warning;
            case "CANCELLED": return COLORS.error;
            case "COMPLETED": return COLORS.primary;
            default: return COLORS.textLight;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!booking) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t("bookings.notFound")}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t("common.goBack")}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusLabel = t(`bookings.statusValues.${booking.status.toLowerCase()}`, booking.status);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("bookings.detailsTitle") || "Booking Details"}</Text>
                <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
                    <Ionicons name="share-outline" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
            >
                {/* Status Card */}
                <View style={styles.card}>
                    <View style={[styles.statusHeader, isRTL && styles.statusHeaderRTL]}>
                        <View>
                            <Text style={[styles.bookingNumber, isRTL && styles.textRTL]}>{booking.booking_number}</Text>
                            <Text style={[styles.bookingDate, isRTL && styles.textRTL]}>{new Date(booking.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{statusLabel}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("bookings.paymentStatus") || "Payment Status"}:</Text>
                        <Text style={[
                            styles.value,
                            isRTL && styles.textRTL,
                            { color: booking.payment_status === 'PAID' ? COLORS.success : COLORS.warning, fontWeight: 'bold' }
                        ]}>
                            {t(`bookings.paymentStatuses.${booking.payment_status?.toUpperCase()}`, booking.payment_status)}
                        </Text>
                    </View>
                </View>

                {/* Main Details */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{isRTL ? booking.title_ar : booking.title_en}</Text>

                    <View style={[styles.detailItem, isRTL && styles.detailItemRTL]}>
                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={[styles.icon, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]} />
                        <View>
                            <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{t("bookings.dates") || "Dates"}</Text>
                            <Text style={[styles.detailValue, isRTL && styles.textRTL]}>
                                {booking.start_date} {booking.end_date ? `- ${booking.end_date}` : ''}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailItem, isRTL && styles.detailItemRTL]}>
                        <Ionicons name="people-outline" size={20} color={COLORS.primary} style={[styles.icon, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]} />
                        <View>
                            <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{t("bookings.guests") || "Guests"}</Text>
                            <Text style={[styles.detailValue, isRTL && styles.textRTL]}>{booking.guest_count} {t("bookings.person") || "Persons"}</Text>
                        </View>
                    </View>

                    {booking.booking_type && (
                        <View style={[styles.detailItem, isRTL && styles.detailItemRTL]}>
                            <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} style={[styles.icon, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12, marginLeft: 0 }]} />
                            <View>
                                <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{t("bookings.type") || "Type"}</Text>
                                <Text style={[styles.detailValue, isRTL && styles.textRTL]}>{booking.booking_type}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Items / Breakdown */}
                {booking.items && booking.items.length > 0 && (
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("bookings.items") || "Items"}</Text>
                        {booking.items.map((item, idx) => (
                            <View key={idx} style={[styles.itemRow, isRTL && styles.itemRowRTL]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemDesc, isRTL && styles.textRTL]}>{isRTL ? item.description_ar : item.description_en}</Text>
                                    <Text style={[styles.itemQty, isRTL && styles.textRTL]}>
                                        {t("common.quantityMultiplier", { quantity: item.quantity })}
                                    </Text>
                                </View>
                                <Text style={styles.itemPrice}>
                                    {formatCurrency(item.total_price, item.currency, language === 'ar' ? 'ar-EG' : 'en-US')}
                                </Text>
                            </View>
                        ))}

                        <View style={styles.divider} />

                        <View style={[styles.totalRow, isRTL && styles.totalRowRTL]}>
                            <Text style={styles.totalLabel}>{t("bookings.total") || "Total"}</Text>
                            <Text style={styles.totalValue}>
                                {formatCurrency(booking.total_amount, booking.currency, language === 'ar' ? 'ar-EG' : 'en-US')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Notes */}
                {booking.customer_notes && (
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("bookings.notes") || "Notes"}</Text>
                        <Text style={[styles.notesText, isRTL && styles.textRTL]}>{booking.customer_notes}</Text>
                    </View>
                )}

            </ScrollView>

            {/* Footer / Actions */}
            {(booking.payment_status === 'UNPAID' || booking.payment_status === 'PARTIAL_PAID') && (
                <View style={[styles.footer, { paddingBottom: 20, marginBottom: 85 }]}>
                    <View style={[styles.saveCardContainer, isRTL && { flexDirection: 'row-reverse' }]}>
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
                        style={[styles.payButton, paying && styles.disabledButton]}
                        onPress={handlePayNow}
                        disabled={paying}
                    >
                        {paying ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.payButtonText}>{t("bookings.payNow") || "Pay Now"}</Text>
                                <Ionicons name="card-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 20
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 16
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 15,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRTL: {
        flexDirection: "row-reverse",
    },
    headerBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    content: {
        padding: 16,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    icon: {
        marginRight: 12,
        marginLeft: 0,
    },
    footer: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
    },
    saveCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        paddingHorizontal: 8,
        width: '100%',
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    statusHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    bookingNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    bookingDate: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 2,
    },
    textRTL: {
        textAlign: 'right',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "bold",
        textTransform: "capitalize",
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoRowRTL: {
        flexDirection: 'row-reverse',
    },
    label: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    value: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailItemRTL: {
        flexDirection: 'row-reverse',
    },

    detailLabel: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    itemRowRTL: {
        flexDirection: 'row-reverse',
    },
    itemDesc: {
        fontSize: 14,
        color: COLORS.text,
    },
    itemQty: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        alignItems: 'center',
    },
    totalRowRTL: {
        flexDirection: 'row-reverse',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    notesText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontStyle: 'italic',
        lineHeight: 20,
    },

    payButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
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
