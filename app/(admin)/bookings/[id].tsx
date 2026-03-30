import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, FlatList, ActivityIndicator, Platform, Alert
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { adminApi } from "../../../src/services/api";
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from "../../../src/components/Toast";
import ConfirmModal from "../../../src/components/ConfirmModal"; // You might need to ensure this path is correct or create a simple confirm modal if not exists

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6"
};

export default function BookingDetails() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { id } = useLocalSearchParams();

    // Mode: 'VIEW' | 'EDIT'
    const [mode, setMode] = useState<'VIEW' | 'EDIT'>('VIEW');
    const [loadingBooking, setLoadingBooking] = useState(true);
    const [bookingData, setBookingData] = useState<any>(null); // Store full booking object for View mode

    // ----------------------------------------------------
    // EDIT FORM STATES (Copied from original file)
    // ----------------------------------------------------
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userBalances, setUserBalances] = useState({ points: 0, wallet: 0 });
    const [bookingType, setBookingType] = useState("TRIP");
    const [destination, setDestination] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [numPersons, setNumPersons] = useState("1");
    const [notes, setNotes] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [discount, setDiscount] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("UNPAID");
    const [currency, setCurrency] = useState("USD");
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Status Change Modals
    const [statusModal, setStatusModal] = useState({ visible: false, status: '', title: '', message: '' });

    useEffect(() => {
        if (id) {
            fetchBookingDetails(id as string);
        }
    }, [id]);

    const fetchBookingDetails = async (bookingId: string) => {
        try {
            setLoadingBooking(true);
            const res = await adminApi.getBooking(bookingId);
            setBookingData(res); // Store for View Mode

            // Populate Edit Form State
            const customerName = res.customer_name || `${res.user_id}`;
            const nameParts = customerName.split(' ');
            setSelectedUser({
                id: res.user_id,
                first_name: nameParts[0] || 'User',
                last_name: nameParts.slice(1).join(' ') || '',
                role: 'CUSTOMER'
            });

            setBookingType(res.booking_type);
            const dest = res.title_en?.split(': ')[1] || res.title_en || "";
            setDestination(dest);
            setStartDate(res.start_date ? res.start_date.replace(/-/g, '/') : "");
            setEndDate(res.end_date ? res.end_date.replace(/-/g, '/') : "");
            setNumPersons(res.guest_count?.toString() || "1");
            setNotes(res.customer_notes || "");
            setOriginalPrice(res.subtotal?.toString() || "0");
            setDiscount(res.discount_amount?.toString() || "0");
            setPaymentStatus(res.payment_status);
            setCurrency(res.currency);

            fetchUserBalances(res.user_id);

        } catch (e) {
            console.log("Error loading booking", e);
            setToast({ visible: true, message: t('common.error'), type: 'error' });
        } finally {
            setLoadingBooking(false);
        }
    };

    const fetchUserBalances = async (userId: string) => {
        try {
            const [walletRes, pointsRes] = await Promise.all([
                adminApi.getUserWallet(userId).catch(() => ({ balance: 0 })),
                adminApi.getUserPoints(userId).catch(() => ({ current_balance: 0 }))
            ]);
            setUserBalances({
                wallet: walletRes.balance || 0,
                points: pointsRes.current_balance || 0,
            });
        } catch (e) {
            console.log("Error loading balances", e);
        }
    };

    // Helper functions
    const formatDateInput = (value: string): string => {
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + '/' + cleaned.slice(4);
        if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + '/' + cleaned.slice(7, 9);
        return cleaned.slice(0, 10);
    };

    const isValidDate = (date: string): boolean => {
        if (!date || date.length !== 10) return false;
        const parts = date.split('/');
        if (parts.length !== 3) return false;
        const [y, m, d] = parts.map(Number);
        if (!y || !m || !d) return false;
        if (m < 1 || m > 12) return false;
        if (d < 1 || d > 31) return false;
        return true;
    };

    const calculateFinalPrice = () => {
        const price = parseFloat(originalPrice) || 0;
        const disc = parseFloat(discount) || 0;
        const final = Math.max(0, price - disc);
        return { subtotal: price, final };
    };

    // ----------------------------------------------------
    // ACTIONS
    // ----------------------------------------------------

    const handleUpdateBooking = async () => {
        // ... (Original Submit Logic)
        if (!destination.trim()) { setToast({ visible: true, message: t('admin.bookings.errorDestination'), type: 'error' }); return; }
        if (!isValidDate(startDate) || !isValidDate(endDate)) { setToast({ visible: true, message: t('admin.bookings.errorDates'), type: 'error' }); return; }

        try {
            setSubmitting(true);
            const payload = {
                user_id: selectedUser.id,
                booking_type: bookingType,
                destination,
                start_date: startDate.replace(/\//g, '-'),
                end_date: endDate.replace(/\//g, '-'),
                num_persons: parseInt(numPersons),
                notes,
                original_price: parseFloat(originalPrice),
                discount: parseFloat(discount) || 0,
                payment_status: paymentStatus,
                payment_method: "MANUAL",
                currency: currency,
                wallet_to_use: 0,
                points_action: null,
                points_amount: 0,
                points_reason: null
            };

            await adminApi.updateBooking(id as string, payload);
            setToast({ visible: true, message: t('common.success'), type: 'success' });

            // Refund to View Mode and refresh
            await fetchBookingDetails(id as string);
            setMode('VIEW');

        } catch (e: any) {
            const errorMessage = e.response?.data?.detail || e.message || t('common.error');
            setToast({ visible: true, message: errorMessage, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleChangeStatus = (newStatus: string) => {
        let title = '';
        let message = '';

        switch (newStatus) {
            case 'CONFIRMED':
                title = t('admin.bookings.confirmBooking');
                message = t('admin.bookings.confirmMessage', 'Are you sure you want to confirm this booking?');
                break;
            case 'COMPLETED':
                title = t('admin.bookings.completeBooking');
                message = t('admin.bookings.completeMessage', 'Mark this booking as completed?');
                break;
            case 'CANCELLED':
                title = t('admin.bookings.cancelBooking');
                message = t('admin.bookings.cancelMessage', 'Are you sure you want to cancel this booking?');
                break;
            default:
                title = t('common.confirm');
                message = t('common.areYouSure');
        }

        setStatusModal({
            visible: true,
            status: newStatus,
            title,
            message
        });
    };

    const confirmStatusChange = async () => {
        try {
            setSubmitting(true);
            // Assuming adminApi.updateBookingStatus exists (we added it)
            await adminApi.updateBookingStatus(id as string, statusModal.status);

            setToast({ visible: true, message: t('common.success'), type: 'success' });
            setStatusModal({ ...statusModal, visible: false });

            await fetchBookingDetails(id as string);
        } catch (e: any) {
            const errorMessage = e.response?.data?.detail || e.message || t('common.error');
            setToast({ visible: true, message: errorMessage, type: 'error' });
            setStatusModal({ ...statusModal, visible: false });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return COLORS.success;
            case 'PENDING': return COLORS.warning;
            case 'CANCELLED': return COLORS.error;
            case 'COMPLETED': return COLORS.info;
            default: return COLORS.textLight;
        }
    };

    if (loadingBooking) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // ----------------------------------------------------
    // VIEW MODE RENDER
    // ----------------------------------------------------
    if (mode === 'VIEW' && bookingData) {
        const { booking_number, status, payment_status, created_at, customer_name } = bookingData;
        const statusColor = getStatusColor(status);

        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    title: `${booking_number || id}`,
                    headerBackTitle: t('common.back'),
                    headerRight: () => (
                        <TouchableOpacity onPress={() => setMode('EDIT')}>
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{t('common.edit')}</Text>
                        </TouchableOpacity>
                    )
                }} />

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header Card */}
                    <View style={[styles.card, isRTL && styles.cardRTL]}>
                        <View style={[styles.row]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.orderDate')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{new Date(created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.status')}</Text>
                            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                                <Text style={[styles.badgeText, { color: statusColor }]}>{t(`common.statuses.${status}`)}</Text>
                            </View>
                        </View>

                        {/* Status Change Buttons */}
                        <View style={[styles.actionButtons]}>
                            {status === 'PENDING' && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={() => handleChangeStatus('CONFIRMED')}>
                                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>{t('common.confirm')}</Text>
                                </TouchableOpacity>
                            )}
                            {(status === 'CONFIRMED' || status === 'PENDING') && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info }]} onPress={() => handleChangeStatus('COMPLETED')}>
                                    <Ionicons name="flag" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>{t('common.statuses.COMPLETED')}</Text>
                                </TouchableOpacity>
                            )}
                            {(status !== 'CANCELLED' && status !== 'COMPLETED') && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={() => handleChangeStatus('CANCELLED')}>
                                    <Ionicons name="close-circle" size={18} color="#fff" />
                                    <Text style={styles.actionBtnText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Customer Info */}
                    <View style={styles.sectionTitleContainer}>
                        <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.customer')}</Text>
                    </View>
                    <View style={[styles.card, isRTL && styles.cardRTL]}>
                        <View style={[styles.row]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.name')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{customer_name}</Text>
                        </View>
                        {bookingData.membership_id && (
                            <View style={[styles.row, { marginTop: 8 }]}>
                                <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.memberId')}</Text>
                                <Text style={[styles.value, isRTL && styles.textRTL]}>{bookingData.membership_id}</Text>
                            </View>
                        )}

                    </View>

                    {/* Booking Info */}
                    <View style={styles.sectionTitleContainer}>
                        <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.bookingDetails')}</Text>
                    </View>
                    <View style={[styles.card, isRTL && styles.cardRTL]}>
                        <View style={[styles.row]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.bookingType')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{t(`admin.bookings.types.${bookingData.booking_type?.toLowerCase()}`) || bookingData.booking_type}</Text>
                        </View>
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.destination')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{isRTL ? bookingData.title_ar : bookingData.title_en}</Text>
                        </View>
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.dates')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{bookingData.start_date} → {bookingData.end_date}</Text>
                        </View>
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.numPersons')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{bookingData.guest_count}</Text>
                        </View>
                    </View>

                    {/* Financials */}
                    <View style={[styles.card, isRTL && styles.cardRTL, { marginTop: 20 }]}>
                        <View style={[styles.row]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.originalPrice')}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>{bookingData.subtotal} {bookingData.currency}</Text>
                        </View>
                        {bookingData.discount_amount > 0 && (
                            <View style={[styles.row, { marginTop: 8 }]}>
                                <Text style={[styles.label, { color: COLORS.success }, isRTL && styles.labelRTL]}>{t('admin.bookings.discount')}</Text>
                                <Text style={[styles.value, { color: COLORS.success }, isRTL && styles.textRTL]}>
                                    {t("common.amountNegative", { amount: `${bookingData.discount_amount} ${bookingData.currency}` })}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.divider, { marginVertical: 12 }]} />
                        <View style={[styles.row]}>
                            <Text style={[styles.totalLabel, isRTL && styles.totalLabelRTL]}>{t('admin.bookings.finalPrice')}</Text>
                            <Text style={[styles.totalValue, isRTL && styles.textRTL]}>{bookingData.total_amount} {bookingData.currency}</Text>
                        </View>

                        <View style={[styles.row, { marginTop: 16 }]}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.paymentStatus')}</Text>
                            <View style={[styles.badge, {
                                backgroundColor: payment_status === 'PAID' ? COLORS.success + '20' : COLORS.warning + '20'
                            }]}>
                                <Text style={[styles.badgeText, {
                                    color: payment_status === 'PAID' ? COLORS.success : COLORS.warning
                                }]}>{t(`admin.bookings.paymentStatuses.${payment_status}`) || payment_status}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Status Change Modal */}
                <ConfirmModal
                    visible={statusModal.visible}
                    title={statusModal.title}
                    message={statusModal.message}
                    onConfirm={confirmStatusChange}
                    onCancel={() => setStatusModal({ ...statusModal, visible: false })}
                    loading={submitting}
                    confirmText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                    type={statusModal.status === 'CANCELLED' ? 'danger' : 'success'}
                />

                <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast({ ...toast, visible: false })} />
            </View>
        );
    }

    // ----------------------------------------------------
    // EDIT MODE RENDER (Original Form)
    // ----------------------------------------------------
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: t("admin.bookings.edit"),
                headerBackTitle: t("common.back"),
                headerRight: undefined
            }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Back View Button */}
                <TouchableOpacity style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }} onPress={() => setMode('VIEW')}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    <Text style={{ marginStart: 8, color: COLORS.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                {/* Step 1: User (Read Only) */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.customer')}</Text>
                    <View style={[styles.userSelector, { backgroundColor: '#f8fafc', paddingHorizontal: 8, borderRadius: 8, borderBottomWidth: 0 }]}>
                        {selectedUser ? (
                            <View>
                                <Text style={[styles.userName, isRTL && { textAlign: 'right' }]}>{selectedUser.first_name} {selectedUser.last_name}</Text>
                                <Text style={[styles.userEmail, isRTL && { textAlign: 'right' }]}>{t('admin.bookings.currentBalance')}: {userBalances.wallet} {currency}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* Step 2: Booking Details */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.bookingDetails')}</Text>

                    {/* Booking Type */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.bookingType')}</Text>
                    <View style={[styles.typeRow]}>
                        {['TRIP', 'HOTEL', 'FLIGHT', 'PACKAGE', 'OFFER', 'CUSTOM'].map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.typeBtn,
                                    bookingType === type && styles.typeBtnActive,
                                    { marginBottom: 8, marginHorizontal: 4 }
                                ]}
                                onPress={() => setBookingType(type)}
                            >
                                <Text style={[
                                    styles.typeBtnText,
                                    bookingType === type && styles.typeBtnTextActive
                                ]}>
                                    {t(`admin.bookings.types.${type.toLowerCase()}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Destination */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.destination')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL]}
                        value={destination}
                        onChangeText={setDestination}
                    />

                    {/* Dates */}
                    <View style={[styles.row]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.startDate')}</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={[styles.input, isRTL && styles.inputRTL]}
                                    value={startDate}
                                    onChangeText={(text) => setStartDate(formatDateInput(text))}
                                    placeholder="YYYY/MM/DD"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.dateBtn]}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={styles.dateText}>{startDate}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={{ flex: 1, marginStart: isRTL ? 0 : 8, marginEnd: isRTL ? 8 : 0 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.endDate')}</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={[styles.input, isRTL && styles.inputRTL]}
                                    value={endDate}
                                    onChangeText={(text) => setEndDate(formatDateInput(text))}
                                    placeholder="YYYY/MM/DD"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            ) : (
                                <TouchableOpacity
                                    style={[styles.dateBtn]}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Text style={styles.dateText}>{endDate}</Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Number of Persons */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.numPersons')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL]}
                        value={numPersons}
                        onChangeText={setNumPersons}
                        keyboardType="numeric"
                    />

                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.notes')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL, { height: 80 }]}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>

                {/* Step 3: Pricing */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.pricing')}</Text>

                    <View style={[styles.row]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.originalPrice')}</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.inputRTL]}
                                value={originalPrice}
                                onChangeText={setOriginalPrice}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: 100 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.currency')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                onPress={() => {
                                    const currencies = ['USD', 'EUR', 'SAR', 'EGP'];
                                    const nextIndex = (currencies.indexOf(currency) + 1) % currencies.length;
                                    setCurrency(currencies[nextIndex]);
                                }}
                            >
                                <Text>{currency}</Text>
                                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.discount')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL]}
                        value={discount}
                        onChangeText={setDiscount}
                        keyboardType="numeric"
                    />

                    <View style={[styles.finalPriceRow]}>
                        <Text style={styles.finalPriceLabel}>{t('admin.bookings.finalPrice')}:</Text>
                        <Text style={styles.finalPriceValue}>{calculateFinalPrice().final.toFixed(2)} {currency}</Text>
                    </View>

                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.paymentStatus')}</Text>
                    <View style={[styles.typeRow]}>
                        {['PAID', 'UNPAID', 'PARTIAL'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.typeBtn,
                                    paymentStatus === status && styles.typeBtnActive
                                ]}
                                onPress={() => setPaymentStatus(status)}
                            >
                                <Text style={[
                                    styles.typeBtnText,
                                    paymentStatus === status && styles.typeBtnTextActive
                                ]}>
                                    {t(`admin.bookings.paymentStatuses.${status}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleUpdateBooking}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>{t('common.save')}</Text>
                    )}
                </TouchableOpacity>

            </ScrollView >

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardRTL: {},
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.text, marginBottom: 12 },
    sectionTitleRTL: { textAlign: 'right' },
    sectionTitleContainer: {
        marginBottom: 8,
        marginTop: 8,
    },
    userSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },

    userName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
    userEmail: { fontSize: 12, color: COLORS.textLight },
    label: { fontSize: 14, fontWeight: "500", color: COLORS.textLight, marginTop: 4, marginBottom: 2 },
    labelRTL: { textAlign: 'right' },
    value: { fontSize: 15, fontWeight: "600", color: COLORS.text },
    input: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text, textAlign: 'auto' },
    inputRTL: { textAlign: 'right' },
    row: { flexDirection: "row", gap: 12, alignItems: 'center', justifyContent: 'space-between' },

    typeRow: { flexDirection: "row", flexWrap: "wrap" },

    typeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
    typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    typeBtnText: { fontSize: 12, color: COLORS.textLight },
    typeBtnTextActive: { color: "#fff", fontWeight: "600" },
    dateBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },

    dateText: { fontSize: 14, color: COLORS.text },
    finalPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },

    finalPriceLabel: { fontSize: 16, fontWeight: "bold", color: COLORS.text },
    finalPriceValue: { fontSize: 18, fontWeight: "bold", color: COLORS.success },
    submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    submitBtnText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 },
    textRTL: { textAlign: 'right' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    divider: { height: 1, backgroundColor: COLORS.border },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    totalLabelRTL: { textAlign: 'right' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    actionButtons: { flexDirection: 'row', gap: 8, marginTop: 16 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
