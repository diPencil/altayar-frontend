import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, FlatList, ActivityIndicator, Platform
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { adminApi } from "../../../src/services/api";
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from "../../../src/components/Toast";

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b"
};

export default function CreateBooking() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    // User Selection
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // User Balances & Membership
    const [userBalances, setUserBalances] = useState({ points: 0, wallet: 0, membership: null });
    const [loadingBalances, setLoadingBalances] = useState(false);

    // Booking Details
    const [bookingType, setBookingType] = useState("TRIP");
    const [destination, setDestination] = useState("");

    // Date State - using strings for manual input (YYYY/MM/DD)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0].replace(/-/g, '/');
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return d.toISOString().split('T')[0].replace(/-/g, '/');
    });

    const formatDateInput = (value: string): string => {
        // Remove all non-digits
        let cleaned = value.replace(/\D/g, '');
        // Add slashes: YYYY/MM/DD
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

    // DateTimePicker state (for native apps only)
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);


    const [numPersons, setNumPersons] = useState("1");
    const [notes, setNotes] = useState("");

    // Pricing
    const [originalPrice, setOriginalPrice] = useState("");
    const [discount, setDiscount] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("UNPAID");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [currency, setCurrency] = useState("USD");

    // Points & Wallet
    const [useWallet, setUseWallet] = useState(false);
    const [walletToUse, setWalletToUse] = useState("");

    // Points as SEPARATE admin action (NOT payment)
    const [pointsAction, setPointsAction] = useState("NONE");  // 'NONE', 'ADD', 'DEDUCT'
    const [pointsAmount, setPointsAmount] = useState("");
    const [pointsReason, setPointsReason] = useState("");

    // UI State
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        fetchUsers();

        // Reset dates to current date on component mount
        const today = new Date();
        const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setStartDate(today.toISOString().split('T')[0].replace(/-/g, '/'));
        setEndDate(weekLater.toISOString().split('T')[0].replace(/-/g, '/'));
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchUserBalances(selectedUser.id);
        } else {
            setUserBalances({ points: 0, wallet: 0, membership: null });
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await adminApi.getAllUsers();
            setUsers(res.users || []);
        } catch (e) {
            console.log("Error loading users", e);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchUserBalances = async (userId: string) => {
        try {
            setLoadingBalances(true);
            const [walletRes, pointsRes] = await Promise.all([
                adminApi.getUserWallet(userId).catch(() => ({ balance: 0 })),
                adminApi.getUserPoints(userId).catch(() => ({ current_balance: 0 }))
            ]);
            setUserBalances({
                wallet: walletRes.balance || 0,
                points: pointsRes.current_balance || 0,
                membership: null // TODO: Add getUserMembership to API
            });
        } catch (e) {
            console.log("Error loading balances", e);
        } finally {
            setLoadingBalances(false);
        }
    };

    const calculateFinalPrice = () => {
        const price = parseFloat(originalPrice) || 0;
        const disc = parseFloat(discount) || 0;
        const walletValue = useWallet ? (parseFloat(walletToUse) || 0) : 0;

        const subtotal = price - disc;
        const final = Math.max(0, subtotal - walletValue);  // ✅ No points

        return {
            subtotal,
            walletValue,
            final
        };
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedUser) {
            setToast({ visible: true, message: t('admin.bookings.errorSelectUser'), type: 'error' });
            return;
        }
        if (!bookingType) {
            setToast({ visible: true, message: t('admin.bookings.errorBookingType'), type: 'error' });
            return;
        }
        if (!destination.trim()) {
            setToast({ visible: true, message: t('admin.bookings.errorDestination'), type: 'error' });
            return;
        }
        if (!isValidDate(startDate)) {
            setToast({ visible: true, message: t('admin.bookings.errorDates'), type: 'error' });
            return;
        }
        if (!isValidDate(endDate)) {
            setToast({ visible: true, message: t('admin.bookings.errorDates'), type: 'error' });
            return;
        }
        if (!originalPrice || parseFloat(originalPrice) <= 0) {
            setToast({ visible: true, message: t('admin.bookings.errorPrice'), type: 'error' });
            return;
        }


        // Validate Wallet
        if (useWallet) {
            const wallet = parseFloat(walletToUse) || 0;
            if (wallet <= 0) {
                setToast({ visible: true, message: t('admin.bookings.errorPrice'), type: 'error' });
                return;
            }
            if (wallet > userBalances.wallet) {
                setToast({
                    visible: true,
                    message: t('admin.bookings.errorInsufficientWallet', {
                        available: userBalances.wallet.toFixed(2),
                        requested: wallet.toFixed(2)
                    }),
                    type: 'error'
                });
                return;
            }
        }

        try {
            setSubmitting(true);

            const pricing = calculateFinalPrice();

            // Prepare payload
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
                payment_method: paymentMethod,
                currency: currency,
                wallet_to_use: useWallet ? parseFloat(walletToUse) || 0 : 0,

                // Points as separate admin action
                points_action: pointsAction !== 'NONE' ? pointsAction : null,
                points_amount: pointsAction !== 'NONE' ? parseInt(pointsAmount) || 0 : 0,
                points_reason: pointsAction !== 'NONE' ? pointsReason : null
            };

            // Call API
            const result = await adminApi.createManualBooking(payload);

            // Show success and redirect
            setToast({ visible: true, message: t('admin.bookings.bookingCreated'), type: 'success' });
            setTimeout(() => {
                router.back();
            }, 1500);

        } catch (e: any) {
            const errorMessage = e.response?.data?.detail || e.message || t('common.error');
            setToast({ visible: true, message: errorMessage, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.bookings.create"), headerBackTitle: "Back" }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Step 1: User Selection */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.selectUser')}</Text>
                    <TouchableOpacity
                        style={[styles.userSelector, isRTL && styles.userSelectorRTL]}
                        onPress={() => setUserModalVisible(true)}
                    >
                        {selectedUser ? (
                            <View>
                                <Text style={[styles.userName, isRTL && { textAlign: 'right' }]}>{selectedUser.first_name} {selectedUser.last_name}</Text>
                                <Text style={[styles.userEmail, isRTL && { textAlign: 'right' }]}>{selectedUser.email}</Text>
                            </View>
                        ) : (
                            <Text style={styles.placeholder}>{t('admin.bookings.selectUser')}...</Text>
                        )}
                        <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                </View>

                {/* Step 2: Booking Details */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.bookingDetails')}</Text>

                    {/* Booking Type */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.bookingType')}</Text>
                    <View style={[styles.typeRow, isRTL && styles.typeRowRTL]}>
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
                                    {t(`admin.bookings.types.${type}`)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Destination/Service Label based on Type */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>
                        {bookingType === 'FLIGHT' ? t('admin.bookings.airline') :
                            bookingType === 'HOTEL' ? t('admin.bookings.hotelName') :
                                t('admin.bookings.destination')}
                    </Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL]}
                        value={destination}
                        onChangeText={setDestination}
                        placeholder={t('admin.bookings.destination')}
                    />

                    {/* Dates - Hybrid Input (Picker for Native, Manual for Web) */}
                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>
                                {bookingType === 'HOTEL' ? t('admin.bookings.checkInDate') :
                                    bookingType === 'FLIGHT' ? t('admin.bookings.departureDate') :
                                        t('admin.bookings.startDate')}
                            </Text>
                            {Platform.OS === 'web' ? (
                                // Web: Manual Text Input
                                <>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={startDate}
                                        onChangeText={(text) => setStartDate(formatDateInput(text))}
                                        placeholder="YYYY/MM/DD"
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                    {startDate && !isValidDate(startDate) && (
                                        <Text style={styles.errorText}>{t('common.invalidDate', 'Invalid Date')}</Text>
                                    )}
                                </>
                            ) : (
                                // Native: DateTimePicker Button
                                <>
                                    <TouchableOpacity
                                        style={[styles.dateBtn, isRTL && styles.dateBtnRTL]}
                                        onPress={() => setShowStartPicker(true)}
                                    >
                                        <Text style={styles.dateText}>{startDate}</Text>
                                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    {showStartPicker && (
                                        <DateTimePicker
                                            value={new Date(startDate.replace(/\//g, '-'))}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(event, selectedDate) => {
                                                setShowStartPicker(Platform.OS === 'ios');
                                                if (selectedDate) {
                                                    setStartDate(selectedDate.toISOString().split('T')[0].replace(/-/g, '/'));
                                                }
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                        <View style={{ flex: 1, marginStart: isRTL ? 0 : 8, marginEnd: isRTL ? 8 : 0 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>
                                {bookingType === 'HOTEL' ? t('admin.bookings.checkOutDate') :
                                    bookingType === 'FLIGHT' ? t('admin.bookings.arrivalDate') :
                                        t('admin.bookings.endDate')}
                            </Text>
                            {Platform.OS === 'web' ? (
                                // Web: Manual Text Input
                                <>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={endDate}
                                        onChangeText={(text) => setEndDate(formatDateInput(text))}
                                        placeholder="YYYY/MM/DD"
                                        keyboardType="numeric"
                                        maxLength={10}
                                    />
                                    {endDate && !isValidDate(endDate) && (
                                        <Text style={styles.errorText}>{t('common.invalidDate', 'Invalid Date')}</Text>
                                    )}
                                </>
                            ) : (
                                // Native: DateTimePicker Button
                                <>
                                    <TouchableOpacity
                                        style={[styles.dateBtn, isRTL && styles.dateBtnRTL]}
                                        onPress={() => setShowEndPicker(true)}
                                    >
                                        <Text style={styles.dateText}>{endDate}</Text>
                                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    {showEndPicker && (
                                        <DateTimePicker
                                            value={new Date(endDate.replace(/\//g, '-'))}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(event, selectedDate) => {
                                                setShowEndPicker(Platform.OS === 'ios');
                                                if (selectedDate) {
                                                    setEndDate(selectedDate.toISOString().split('T')[0].replace(/-/g, '/'));
                                                }
                                            }}
                                        />
                                    )}
                                </>
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
                        placeholder="1"
                    />

                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.notes')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.inputRTL, { height: 80 }]}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        placeholder={t('admin.bookings.notes')}
                    />
                </View>

                {/* Step 3: Pricing */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.pricing')}</Text>

                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.originalPrice')}</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.inputRTL]}
                                value={originalPrice}
                                onChangeText={setOriginalPrice}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                        <View style={{ width: 100 }}>
                            <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.currency')}</Text>
                            <TouchableOpacity
                                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                                onPress={() => {
                                    const currencies = ['USD', 'EUR', 'SAR', 'EGP'];
                                    const currentIndex = currencies.indexOf(currency);
                                    const nextIndex = (currentIndex + 1) % currencies.length;
                                    setCurrency(currencies[nextIndex]);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ paddingTop: Platform.OS === 'ios' ? 0 : 4 }}>{currency}</Text>
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
                        placeholder="0.00"
                    />

                    <View style={[styles.finalPriceRow, isRTL && styles.finalPriceRowRTL]}>
                        <Text style={styles.finalPriceLabel}>{t('admin.bookings.finalPrice')}:</Text>
                        <Text style={styles.finalPriceValue}>{calculateFinalPrice().final.toFixed(2)} {currency}</Text>
                    </View>

                    {/* Payment Status */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.paymentStatus')}</Text>
                    <View style={[styles.typeRow, isRTL && styles.typeRowRTL]}>
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

                    {/* Payment Method */}
                    <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.paymentMethod')}</Text>
                    <View style={[styles.typeRow, isRTL && styles.typeRowRTL, { flexWrap: 'wrap' }]}>
                        {['CASH', 'CARD', 'WALLET'].map((method) => (
                            <TouchableOpacity
                                key={method}
                                style={[
                                    styles.typeBtn,
                                    paymentMethod === method && styles.typeBtnActive,
                                    { marginBottom: 8 }
                                ]}
                                onPress={() => setPaymentMethod(method)}
                            >
                                <Text style={[
                                    styles.typeBtnText,
                                    paymentMethod === method && styles.typeBtnTextActive
                                ]}>
                                    {t(`admin.bookings.paymentMethods.${method}`) || method}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Step 4: Membership & Points */}
                {
                    selectedUser && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>{t('admin.bookings.membershipPoints')}</Text>

                            {/* User Balances Display */}
                            <View style={[styles.balanceRow, isRTL && styles.balanceRowRTL]}>
                                <View style={[styles.balanceBadge, isRTL && styles.balanceBadgeRTL, { backgroundColor: COLORS.warning + '20' }]}>
                                    <Ionicons name="star" size={14} color={COLORS.warning} />
                                    <Text style={[styles.balanceText, { color: COLORS.warning }]}>
                                        {userBalances.points} {t('admin.bookings.availablePoints')}
                                    </Text>
                                </View>
                                <View style={[styles.balanceBadge, isRTL && styles.balanceBadgeRTL, { backgroundColor: COLORS.success + '20' }]}>
                                    <Ionicons name="wallet" size={14} color={COLORS.success} />
                                    <Text style={[styles.balanceText, { color: COLORS.success }]}>
                                        {userBalances.wallet.toFixed(2)} {currency}
                                    </Text>
                                </View>
                            </View>

                            {/* Points Adjustment - NEW SECTION */}
                            <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                                <Text style={[styles.label, isRTL && styles.labelRTL, { fontSize: 16, fontWeight: '600' }]}>{t('admin.bookings.pointsAdjustment')}</Text>
                                <Text style={[styles.label, isRTL && styles.labelRTL, { fontSize: 12, color: COLORS.textLight, marginBottom: 10 }]}>
                                    {t('admin.bookings.pointsAdjustmentDesc')}
                                </Text>

                                <View style={[styles.typeRow, isRTL && styles.typeRowRTL]}>
                                    {['NONE', 'ADD', 'DEDUCT'].map((action) => (
                                        <TouchableOpacity
                                            key={action}
                                            style={[
                                                styles.typeBtn,
                                                pointsAction === action && styles.typeBtnActive
                                            ]}
                                            onPress={() => setPointsAction(action)}
                                        >
                                            <Text style={[
                                                styles.typeBtnText,
                                                pointsAction === action && styles.typeBtnTextActive
                                            ]}>
                                                {t(`admin.bookings.pointsActions.${action}`)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {pointsAction !== 'NONE' && (
                                    <>
                                        <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.pointsAmount')}</Text>
                                        <TextInput
                                            style={[styles.input, isRTL && styles.inputRTL]}
                                            value={pointsAmount}
                                            onChangeText={setPointsAmount}
                                            keyboardType="numeric"
                                            placeholder="0"
                                        />

                                        <Text style={[styles.label, isRTL && styles.labelRTL]}>{t('admin.bookings.pointsReason')}</Text>
                                        <TextInput
                                            style={[styles.input, isRTL && styles.inputRTL, { height: 60 }]}
                                            value={pointsReason}
                                            onChangeText={setPointsReason}
                                            placeholder={t('admin.bookings.pointsReasonPlaceholder')}
                                            multiline
                                        />
                                    </>
                                )}
                            </View>

                            {/* Use Wallet Toggle */}
                            <View style={styles.deductionRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.switchLabel}>{t('admin.bookings.useWallet')}</Text>
                                    <TouchableOpacity
                                        style={[styles.switch, useWallet && styles.switchActive]}
                                        onPress={() => setUseWallet(!useWallet)}
                                    >
                                        <View style={[styles.switchThumb, useWallet && styles.switchThumbActive]} />
                                    </TouchableOpacity>
                                </View>
                                {useWallet && (
                                    <View style={styles.deductionInputContainer}>
                                        <TextInput
                                            placeholder={t('admin.bookings.walletToUse')}
                                            keyboardType="numeric"
                                            style={[
                                                styles.deductionInput,
                                                isRTL && styles.deductionInputRTL,
                                                walletToUse && parseFloat(walletToUse) > userBalances.wallet && { borderColor: COLORS.error }
                                            ]}
                                            value={walletToUse}
                                            onChangeText={setWalletToUse}
                                        />
                                        <Text style={[
                                            styles.deductionHint,
                                            walletToUse && parseFloat(walletToUse) > userBalances.wallet && { color: COLORS.error }
                                        ]}>
                                            {t("common.maxValue", { value: userBalances.wallet.toFixed(2) })}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Price Summary */}
                            {useWallet && (
                                <View style={styles.summaryBox}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{t("admin.manageInvoices.subtotal")}:</Text>
                                        <Text style={styles.summaryValue}>{calculateFinalPrice().subtotal.toFixed(2)} {currency}</Text>
                                    </View>
                                    {useWallet && calculateFinalPrice().walletValue > 0 && (
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: COLORS.success }]}>{t("admin.manageInvoices.walletDeduction")}:</Text>
                                            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                                                {t("common.amountNegative", { amount: `${calculateFinalPrice().walletValue.toFixed(2)} ${currency}` })}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 8 }]}>
                                        <Text style={styles.totalLabel}>{t("admin.manageInvoices.totalDue")}:</Text>
                                        <Text style={styles.totalValue}>{calculateFinalPrice().final.toFixed(2)} {currency}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )
                }

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>{t('admin.bookings.confirmBooking')}</Text>
                    )}
                </TouchableOpacity>

            </ScrollView >

            {/* User Selection Modal */}
            < Modal visible={userModalVisible} animationType="slide" >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                        <Text style={styles.modalTitle}>{t('admin.bookings.selectUser')}</Text>
                        <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    {loadingUsers ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.userItem, isRTL && styles.userItemRTL]}
                                    onPress={() => {
                                        setSelectedUser(item);
                                        setUserModalVisible(false);
                                    }}
                                >
                                    <View style={[styles.avatar, isRTL && styles.avatarRTL]}>
                                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.primary }}>
                                            {item.first_name[0]}
                                        </Text>
                                    </View>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={[styles.userName, isRTL && { textAlign: 'right' }]}>{item.first_name} {item.last_name}</Text>
                                            <View style={[
                                                styles.roleBadge,
                                                { backgroundColor: item.role === 'CUSTOMER' ? '#dcfce7' : '#e0f2fe' }
                                            ]}>
                                                <Text style={[
                                                    styles.roleText,
                                                    { color: item.role === 'CUSTOMER' ? '#166534' : '#075985' }
                                                ]}>
                                                    {item.role}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.userEmail, isRTL && { textAlign: 'right' }]}>{item.email}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal >



            {/* Toast */}
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 12,
    },
    sectionTitleRTL: {
        textAlign: 'right',
    },
    userSelector: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    userSelectorRTL: {
        flexDirection: "row-reverse",
    },
    placeholder: {
        color: COLORS.textLight,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    userEmail: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
        marginTop: 12,
        marginBottom: 6,
    },
    labelRTL: {
        textAlign: 'right',
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    inputRTL: {
        textAlign: 'right',
    },
    roleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginStart: 8,
    },
    roleText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    typeRowRTL: {
        flexDirection: 'row-reverse',
    },
    typeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    typeBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    typeBtnTextActive: {
        color: 'white',
    },
    row: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    dateBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
    },
    dateBtnRTL: {
        flexDirection: 'row-reverse',
    },
    dateText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
    },
    finalPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    finalPriceRowRTL: {
        flexDirection: 'row-reverse',
    },
    finalPriceLabel: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    finalPriceValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 10,
    },
    submitBtnText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "white",
        paddingTop: 50,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    userItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    userItemRTL: {
        flexDirection: 'row-reverse',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 12,
    },
    avatarRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    balanceRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    balanceRowRTL: {
        flexDirection: 'row-reverse',
    },
    balanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    balanceBadgeRTL: {
        flexDirection: 'row-reverse',
    },
    balanceText: {
        fontSize: 12,
        fontWeight: "600",
    },
    deductionRow: {
        marginBottom: 16,
    },
    switchLabel: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    switch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.border,
        padding: 2,
        justifyContent: 'center',
    },
    switchActive: {
        backgroundColor: COLORS.primary,
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
    },
    switchThumbActive: {
        alignSelf: 'flex-end',
    },
    deductionInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    deductionInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 8,
        flex: 1,
        marginEnd: 8,
    },
    deductionInputRTL: {
        textAlign: 'right',
        marginEnd: 0,
        marginStart: 8,
    },
    deductionHint: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    summaryBox: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    summaryValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.text,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.primary,
    },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 }
});
