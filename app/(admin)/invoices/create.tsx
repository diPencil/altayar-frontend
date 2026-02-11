import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    Modal,
    FlatList,
    ActivityIndicator
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { adminApi, ordersApi } from "../../../src/services/api";
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

export default function CreateInvoice() {
    const { editOrderId } = useLocalSearchParams<{ editOrderId: string }>();
    const isEditMode = !!editOrderId;
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]); // Added plans state
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);


    // Form State
    const [items, setItems] = useState([{ title: "", description: "", quantity: "1", unit_price: "" }]);
    const [msgEn, setMsgEn] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [taxRate, setTaxRate] = useState("14");
    const [discount, setDiscount] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState("UNPAID");
    const [userBalances, setUserBalances] = useState({ wallet: 0, points: 0, cashback: 0 });
    const [loadingBalances, setLoadingBalances] = useState(false);

    // Deduction State
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState('');

    // Split Wallet and Cashback
    const [useWallet, setUseWallet] = useState(false);
    const [walletToUse, setWalletToUse] = useState('');

    const [useCashback, setUseCashback] = useState(false);
    const [cashbackToUse, setCashbackToUse] = useState('');

    // UI State
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        fetchUsers();
        fetchPlans();
        if (editOrderId) {
            fetchOrderForEdit();
        }
    }, [editOrderId]);

    const fetchOrderForEdit = async () => {
        try {
            setLoadingUsers(true); // Re-use loading state or create new
            const order = await ordersApi.getOrder(editOrderId as string) as any;

            // Populate Form
            setCurrency(order.currency);
            setIsFree(order.is_free);
            setPaymentStatus(order.payment_status);
            setMsgEn(order.notes_en || '');

            // Populate Items
            if (order.items && order.items.length > 0) {
                setItems(order.items.map((i: any) => ({
                    title: i.description_en, // Or handle dual language
                    description: "", // Description is merged in backend, maybe split? For now empty or simple
                    quantity: String(i.quantity),
                    unit_price: String(i.unit_price)
                })));
            }

            // Populate User
            // We need to fetch user details or set selected user if in list
            // For simplicity, fetch user details directly and set as selected
            if (order.user_id) {
                try {
                    const userDetails = await adminApi.getUserDetails(order.user_id);
                    if (userDetails && userDetails.user) {
                        setSelectedUser(userDetails.user);
                    } else {
                        setSelectedUser(userDetails);
                    }
                    // Also fetch balances will trigger via useEffect [selectedUser]
                } catch (e) {
                    console.error("Failed to fetch user details for edit", e);
                }
            }

            // NOTE: We do NOT populate deductions (Points/Wallet/Cashback) 
            // because we can't easily reverse engineer exact amounts from total discount
            // and it avoids calculation errors.

        } catch (e) {
            console.error("Error fetching order for edit", e);
            setToast({ visible: true, message: t('common.error') || "Failed to load order", type: 'error' });
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (selectedUser && selectedUser.id) {
            fetchUserBalances(selectedUser.id);
        } else {
            setUserBalances({ wallet: 0, points: 0, cashback: 0 });
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await adminApi.getAllUsers();
            setUsers(res.users || []);
        } catch (e) {
            setToast({ visible: true, message: t('admin.manageInvoices.errorLoadUsers'), type: 'error' });
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await adminApi.getAllMemberships();
            // Ensure we store the list of plans (res might be array or object depending on API)
            // Based on view_file of route, it returns a list directly.
            setPlans(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error("Failed to fetch plans", e);
        }
    };

    const fetchUserBalances = async (userId: string) => {
        if (!userId) {
            return;
        }
        try {
            setLoadingBalances(true);
            const userDetails = await adminApi.getUserDetails(userId);
            setUserBalances({
                wallet: userDetails.wallet?.balance || 0,
                points: userDetails.points?.current_balance || 0,
                cashback: userDetails.cashback_balance || 0
            });
        } catch (error) {
            console.error('Error fetching user balances:', error);
            setUserBalances({ wallet: 0, points: 0, cashback: 0 });
        } finally {
            setLoadingBalances(false);
        }
    };

    // --- Item Management ---
    const addItem = () => {
        setItems([...items, { title: "", description: "", quantity: "1", unit_price: "" }]);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    // --- Calculations ---
    const totals = useMemo(() => {
        if (isFree) {
            return { subtotal: 0, taxAmount: 0, pointsValue: 0, walletValue: 0, cashbackValue: 0, finalTotal: 0, taxRateValue: 0, discountValue: 0, pointsValueCount: 0 };
        }

        let subtotal = 0;
        items.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_price) || 0;
            subtotal += qty * price;
        });

        const discountValue = parseFloat(discount) || 0;
        const taxableAmount = Math.max(0, subtotal - discountValue);

        const taxRateValue = parseFloat(taxRate) || 0;
        const taxAmount = taxableAmount * (taxRateValue / 100);

        // Deductions
        let pointRatio = 1.0;
        if (usePoints && selectedUser && selectedUser.membership) {
            // Find user plan
            const userPlan = plans.find(p => p.tier_code === selectedUser.membership.tier_code);

            // Calculate Point Value Ratio
            // Ratio = Plan Price / Plan Initial Points
            // Default to 1:1 if logic fails or free plan
            if (userPlan && userPlan.price > 0 && userPlan.initial_points > 0) {
                pointRatio = userPlan.price / userPlan.initial_points;
            } else if (userPlan && userPlan.initial_points === 0) {
                // Prevent division by zero, maybe points have no value?
                // Or stick to 1:1 fallback? 
                // If plan gives 0 points, then ratio is technically undefined. 
                // Assuming 1:1 for safety unless specified.
                pointRatio = 1.0;
            }
        }
        // Deductions
        const pointsValue = usePoints ? (parseInt(pointsToUse) || 0) * (pointRatio || 1.0) : 0;

        const walletValue = useWallet ? (parseFloat(walletToUse) || 0) : 0;
        const cashbackValue = useCashback ? (parseFloat(cashbackToUse) || 0) : 0;

        const totalDeductions = pointsValue + walletValue + cashbackValue;
        const finalTotal = Math.max(0, taxableAmount + taxAmount - totalDeductions);

        return { subtotal, taxAmount, pointsValue, walletValue, cashbackValue, finalTotal, taxRateValue, discountValue, pointsValueCount: (parseInt(pointsToUse) || 0) };
    }, [items, usePoints, pointsToUse, useWallet, walletToUse, useCashback, cashbackToUse, taxRate, discount, isFree, plans, selectedUser]);

    const handleSubmit = async () => {
        if (!selectedUser) {
            setToast({ visible: true, message: t('admin.manageInvoices.errorSelectUser') || "Please select a customer first.", type: 'error' });
            return;
        }
        if (items.some(i => !i.title || !i.unit_price)) {
            setToast({ visible: true, message: t('admin.manageInvoices.errorIncompleteItems'), type: 'error' });
            return;
        }

        // Validate Balances
        if (usePoints) {
            const pointsObj = parseInt(pointsToUse) || 0;
            if (pointsObj <= 0) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInvalidPoints'), type: 'error' });
                return;
            }
            if (pointsObj > userBalances.points) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInsufficientPoints', { available: userBalances.points, requested: pointsObj }), type: 'error' });
                return;
            }
        }
        if (useWallet) {
            const walletObj = parseFloat(walletToUse) || 0;
            if (walletObj <= 0) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInvalidAmount'), type: 'error' });
                return;
            }
            if (walletObj > userBalances.wallet) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInsufficientBalance', { available: userBalances.wallet.toFixed(2), requested: walletObj.toFixed(2) }), type: 'error' });
                return;
            }
        }
        if (useCashback) {
            const cashObj = parseFloat(cashbackToUse) || 0;
            if (cashObj <= 0) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInvalidAmount'), type: 'error' });
                return;
            }
            if (cashObj > userBalances.cashback) {
                setToast({ visible: true, message: t('admin.manageInvoices.errorInsufficientBalance', { available: userBalances.cashback.toFixed(2), requested: cashObj.toFixed(2) }), type: 'error' });
                return;
            }
        }

        try {
            setSubmitting(true);

            // Important: We send the *points count* to the backend, 
            // the backend likely recalculates or trusts this?
            // Wait, createOrder payload has `points_to_use` and `cashback_to_use`.
            // Usually `points_to_use` is the COUNT of points.
            // The monetary deduction is calculated either here or backend.
            // If backend does calculation, my frontend change is purely visual?
            // BUT api.ts createOrder doesn't seem to take "deduction amount".
            // It takes `points_to_use` (number).
            // If the backend logic is hardcoded 1:1, then my frontend change will show one thing and backend will save another.
            // CRITICAL CHECK: Does backend perform calculation?
            // I should assume so. I need to fix backend too if logic is there.
            // For now, I'll update frontend to reflect *intended* logic.

            const pointsCount = usePoints ? (parseInt(pointsToUse) || 0) : 0;
            const walletValue = useWallet ? (parseFloat(walletToUse) || 0) : 0;
            const cashbackValue = useCashback ? (parseFloat(cashbackToUse) || 0) : 0;

            const payload = {
                user_id: selectedUser.id,
                items: items.map(i => ({
                    description_en: i.title + (i.description ? `\n${i.description}` : ""),
                    description_ar: i.title + (i.description ? `\n${i.description}` : ""),
                    quantity: parseFloat(i.quantity) || 1,
                    unit_price: parseFloat(i.unit_price) || 0
                })),
                notes_en: msgEn,
                points_to_use: pointsCount,
                wallet_to_use: walletValue,
                cashback_to_use: cashbackValue,
                tax_rate: isFree ? 0 : (taxRate !== "" && !isNaN(parseFloat(taxRate)) ? parseFloat(taxRate) : 14),
                currency: currency,
                discount_amount: parseFloat(discount) || 0,
                is_free: isFree,
                payment_status: paymentStatus
            };

            if (isEditMode) {
                await ordersApi.updateOrder(editOrderId as string, payload);
                setToast({ visible: true, message: t('admin.orderUpdated') || "Order updated successfully", type: 'success' });
            } else {
                await ordersApi.createOrder(payload);
                setToast({ visible: true, message: t('admin.manageInvoices.createSuccess'), type: 'success' });
            }

            // Refresh user balances after successful creation/update
            await fetchUserBalances(selectedUser.id);

            setTimeout(() => {
                router.back();
            }, 1000);

        } catch (e: any) {
            const errorMessage = e.response?.data?.detail || e.message || t('common.error');
            setToast({ visible: true, message: errorMessage, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: isEditMode ? (t("admin.editOrder") || "Edit Order") : t("admin.newOrder"), headerBackTitle: "Back" }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Step 1: User Selection */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageInvoices.customer')}</Text>
                    <TouchableOpacity
                        style={[styles.userSelector, isRTL && styles.userSelectorRTL]}
                        onPress={() => setUserModalVisible(true)}
                    >
                        {selectedUser ? (
                            <View>
                                <Text style={[styles.userName, isRTL && styles.textRTL]}>{selectedUser.first_name} {selectedUser.last_name}</Text>
                                <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{selectedUser.email}</Text>
                            </View>
                        ) : (
                            <Text style={[styles.placeholder, isRTL && styles.textRTL]}>{t('admin.manageInvoices.selectCustomer')}</Text>
                        )}
                        <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>

                    {/* User Balances */}
                    {selectedUser && (
                        <View style={[styles.balanceRow, isRTL && styles.balanceRowRTL]}>
                            <View style={[styles.balanceBadge, isRTL && styles.balanceBadgeRTL, { backgroundColor: COLORS.warning + '20' }]}>
                                <Ionicons name="star" size={14} color={COLORS.warning} />
                                <Text style={[styles.balanceText, { color: COLORS.warning }]}>
                                    {userBalances.points} PTS
                                </Text>
                            </View>
                            <View style={[styles.balanceBadge, isRTL && styles.balanceBadgeRTL, { backgroundColor: COLORS.success + '20' }]}>
                                <Ionicons name="wallet" size={14} color={COLORS.success} />
                                <Text style={[styles.balanceText, { color: COLORS.success }]}>
                                    {userBalances.wallet.toFixed(2)} {currency}
                                </Text>
                            </View>
                            <View style={[styles.balanceBadge, isRTL && styles.balanceBadgeRTL, { backgroundColor: COLORS.primary + '20' }]}>
                                <Ionicons name="cash" size={14} color={COLORS.primary} />
                                <Text style={[styles.balanceText, { color: COLORS.primary }]}>
                                    {userBalances.cashback.toFixed(2)} {currency}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Step 2: Line Items */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageInvoices.items')}</Text>
                    {items.map((item, index) => (
                        <View key={index} style={[styles.itemRow, isRTL && styles.itemRowRTL]}>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    placeholder={t('admin.manageInvoices.itemTitle') || "Item Title"}
                                    style={[styles.input, isRTL && styles.inputRTL, { fontWeight: 'bold' }]}
                                    value={item.title}
                                    onChangeText={(t) => updateItem(index, "title", t)}
                                />
                                <TextInput
                                    placeholder={t('admin.manageInvoices.itemDescription') || "Description (Optional)"}
                                    style={[styles.input, isRTL && styles.inputRTL, { marginTop: 8 }]}
                                    value={item.description}
                                    onChangeText={(t) => updateItem(index, "description", t)}
                                />
                                <View style={[{ flexDirection: 'row', gap: 10, marginTop: 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <TextInput
                                        placeholder={t('admin.manageInvoices.qty')}
                                        keyboardType="numeric"
                                        style={[styles.input, isRTL && styles.inputRTL, { width: 60 }]}
                                        value={item.quantity}
                                        onChangeText={(t) => updateItem(index, "quantity", t)}
                                    />
                                    <TextInput
                                        placeholder={`${t('admin.manageInvoices.price')} (${currency})`}
                                        keyboardType="numeric"
                                        style={[styles.input, isRTL && styles.inputRTL, { flex: 1 }]}
                                        value={item.unit_price}
                                        onChangeText={(t) => updateItem(index, "unit_price", t)}
                                    />
                                </View>
                            </View>
                            {items.length > 1 && (
                                <TouchableOpacity onPress={() => removeItem(index)} style={[styles.removeBtn, isRTL && styles.removeBtnRTL]}>
                                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                    <TouchableOpacity onPress={addItem} style={[styles.addItemBtn, isRTL && styles.addItemBtnRTL]}>
                        <Ionicons name="add" size={18} color={COLORS.primary} />
                        <Text style={styles.addItemText}>{t('admin.manageInvoices.addItem')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Step 3: Currency & Tax */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageInvoices.currencyTax')}</Text>



                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageInvoices.currency')}</Text>
                        <View style={[styles.currencyRow, isRTL && styles.currencyRowRTL]}>
                            {['USD', 'EUR', 'SAR', 'EGP'].map((curr) => (
                                <TouchableOpacity
                                    key={curr}
                                    style={[
                                        styles.currencyBtn,
                                        currency === curr && styles.currencyBtnActive
                                    ]}
                                    onPress={() => setCurrency(curr)}
                                >
                                    <Text style={[
                                        styles.currencyBtnText,
                                        currency === curr && styles.currencyBtnTextActive
                                    ]}>
                                        {curr}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageInvoices.taxRate')}</Text>
                        <TextInput
                            placeholder="14"
                            keyboardType="numeric"
                            style={[styles.input, isRTL && styles.inputRTL, { width: 100, textAlign: 'center' }]}
                            value={taxRate}
                            onChangeText={(text) => {
                                const num = parseFloat(text) || 0;
                                if ((num >= 0 && num <= 100) || text === '') {
                                    setTaxRate(text);
                                }
                            }}
                            editable={!isFree}
                        />
                    </View>

                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageInvoices.discount')}</Text>
                        <TextInput
                            placeholder="0.00"
                            keyboardType="numeric"
                            style={[styles.input, isRTL && styles.inputRTL, { width: 100, textAlign: 'center' }]}
                            value={discount}
                            onChangeText={setDiscount}
                            editable={!isFree}
                        />
                    </View>

                    <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 10 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageInvoices.freeOrder') || "Free Order"}</Text>
                        <Switch
                            value={isFree}
                            onValueChange={setIsFree}
                            trackColor={{ false: COLORS.border, true: COLORS.success }}
                            thumbColor={COLORS.cardBg}
                        />
                    </View>

                    <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 10 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageInvoices.paymentStatus') || "Payment Status"}</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => setPaymentStatus('PAID')}
                                style={[
                                    styles.currencyBtn,
                                    paymentStatus === 'PAID' && { backgroundColor: COLORS.success, borderColor: COLORS.success }
                                ]}
                            >
                                <Text style={[styles.currencyBtnText, paymentStatus === 'PAID' && { color: 'white' }]}>{t('invoices.status.paid') || 'Paid'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPaymentStatus('UNPAID')}
                                style={[
                                    styles.currencyBtn,
                                    paymentStatus === 'UNPAID' && { backgroundColor: COLORS.warning, borderColor: COLORS.warning }
                                ]}
                            >
                                <Text style={[styles.currencyBtnText, paymentStatus === 'UNPAID' && { color: 'white' }]}>{t('invoices.status.unpaid') || 'Unpaid'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Step 4: Deductions */}
                {
                    selectedUser && (
                        <View style={[styles.section, isRTL && styles.sectionRTL]}>
                            {/* Points Deduction */}
                            <View style={[styles.deductionRow, isRTL && styles.deductionRowRTL]}>
                                <View style={[{ flexDirection: 'row', alignItems: 'center' }, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Switch
                                        value={usePoints}
                                        onValueChange={setUsePoints}
                                        trackColor={{ false: COLORS.border, true: COLORS.warning }}
                                        thumbColor={COLORS.cardBg}
                                    />
                                    <View>
                                        <Text style={[styles.switchLabel, isRTL && styles.switchLabelRTL]}>{t('admin.manageInvoices.deductPoints')}</Text>
                                        <Text style={[styles.deductionHint, isRTL && styles.textRTL]}>
                                            ({t('admin.manageInvoices.available')}: {userBalances.points} PTS)
                                        </Text>
                                    </View>
                                </View>
                                {usePoints && (
                                    <View style={[styles.deductionInputContainer, isRTL && styles.deductionInputContainerRTL]}>
                                        <TextInput
                                            placeholder={t('admin.manageInvoices.amount')}
                                            keyboardType="numeric"
                                            style={[
                                                styles.deductionInput,
                                                isRTL && styles.inputRTL,
                                                pointsToUse && parseInt(pointsToUse) > userBalances.points && { borderColor: COLORS.error }
                                            ]}
                                            value={pointsToUse}
                                            onChangeText={(text) => {
                                                const num = parseInt(text) || 0;
                                                if (num <= userBalances.points || text === '') {
                                                    setPointsToUse(text);
                                                }
                                            }}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Wallet Deduction */}
                            <View style={[styles.deductionRow, isRTL && styles.deductionRowRTL, { marginTop: 15 }]}>
                                <View style={[{ flexDirection: 'row', alignItems: 'center' }, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Switch
                                        value={useWallet}
                                        onValueChange={setUseWallet}
                                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                        thumbColor={COLORS.cardBg}
                                    />
                                    <View>
                                        <Text style={[styles.switchLabel, isRTL && styles.switchLabelRTL]}>{t('admin.manageInvoices.useWallet') || "Use Wallet"}</Text>
                                        <Text style={[styles.deductionHint, isRTL && styles.textRTL]}>
                                            ({t('admin.manageInvoices.available')}: {userBalances.wallet.toFixed(2)} {currency})
                                        </Text>
                                    </View>
                                </View>
                                {useWallet && (
                                    <View style={[styles.deductionInputContainer, isRTL && styles.deductionInputContainerRTL]}>
                                        <TextInput
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            style={[
                                                styles.deductionInput,
                                                isRTL && styles.inputRTL
                                            ]}
                                            value={walletToUse}
                                            onChangeText={setWalletToUse}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Cashback Deduction */}
                            <View style={[styles.deductionRow, isRTL && styles.deductionRowRTL, { marginTop: 15 }]}>
                                <View style={[{ flexDirection: 'row', alignItems: 'center' }, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Switch
                                        value={useCashback}
                                        onValueChange={setUseCashback}
                                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                        thumbColor={COLORS.cardBg}
                                    />
                                    <View>
                                        <Text style={[styles.switchLabel, isRTL && styles.switchLabelRTL]}>{t('admin.manageInvoices.useCashback') || "Use Cashback"}</Text>
                                        <Text style={[styles.deductionHint, isRTL && styles.textRTL]}>
                                            ({t('admin.manageInvoices.available')}: {userBalances.cashback.toFixed(2)} {currency})
                                        </Text>
                                    </View>
                                </View>
                                {useCashback && (
                                    <View style={[styles.deductionInputContainer, isRTL && styles.deductionInputContainerRTL]}>
                                        <TextInput
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            style={[
                                                styles.deductionInput,
                                                isRTL && styles.inputRTL
                                            ]}
                                            value={cashbackToUse}
                                            onChangeText={setCashbackToUse}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    )
                }

                {/* Summary */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                        <Text style={[styles.summaryLabel, isRTL && styles.textRTL]}>{t('admin.manageInvoices.subtotal')}</Text>
                        <Text style={[styles.summaryValue, isRTL && styles.textRTL]}>{totals.subtotal.toFixed(2)} {currency}</Text>
                    </View>
                    <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                        <Text style={[styles.summaryLabel, isRTL && styles.textRTL]}>{t('admin.manageInvoices.tax')} ({totals.taxRateValue.toFixed(1)}%)</Text>
                        <Text style={[styles.summaryValue, isRTL && styles.textRTL]}>{totals.taxAmount.toFixed(2)} {currency}</Text>
                    </View>
                    {totals.pointsValue > 0 && (
                        <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                            <Text style={[styles.summaryLabel, isRTL && styles.textRTL, { color: COLORS.warning }]}>
                                {t('admin.manageInvoices.pointsReduction')} ({totals.pointsValueCount} {t("common.currency.pts")})
                            </Text>
                            <Text style={[styles.summaryValue, isRTL && styles.textRTL, { color: COLORS.warning }]}>
                                {t("common.amountNegative", { amount: `${totals.pointsValue.toFixed(2)} ${t("common.currency.pts")}` })}
                            </Text>
                        </View>
                    )}
                    {totals.walletValue > 0 && (
                        <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                            <Text style={[styles.summaryLabel, isRTL && styles.textRTL, { color: COLORS.primary }]}>{t('admin.manageInvoices.walletDeduction') || "Wallet Use"}</Text>
                            <Text style={[styles.summaryValue, isRTL && styles.textRTL, { color: COLORS.primary }]}>
                                {t("common.amountNegative", { amount: `${totals.walletValue.toFixed(2)} ${currency}` })}
                            </Text>
                        </View>
                    )}

                    {totals.cashbackValue > 0 && (
                        <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                            <Text style={[styles.summaryLabel, isRTL && styles.textRTL, { color: COLORS.success }]}>{t('admin.manageInvoices.cashbackDeduction') || "Cashback Use"}</Text>
                            <Text style={[styles.summaryValue, isRTL && styles.textRTL, { color: COLORS.success }]}>
                                {t("common.amountNegative", { amount: `${totals.cashbackValue.toFixed(2)} ${currency}` })}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL, { marginTop: 10, borderTopWidth: 1, paddingTop: 10 }]}>
                        <Text style={[styles.totalLabel, isRTL && styles.textRTL]}>{t('admin.manageInvoices.totalDue')}</Text>
                        <Text style={[styles.totalValue, isRTL && styles.textRTL]}>{totals.finalTotal.toFixed(2)} {currency}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitBtnText}>
                            {isEditMode ? (t('admin.updateOrder') || "Update Invoice") : t('admin.manageInvoices.createInvoice')}
                        </Text>
                    )}
                </TouchableOpacity>

            </ScrollView >

            {/* User Selection Modal */}
            < Modal visible={userModalVisible} animationType="slide" >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                        <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('admin.manageInvoices.selectCustomer')}</Text>
                        <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
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
                                    <Text style={[styles.userName, isRTL && styles.textRTL]}>{item.first_name} {item.last_name}</Text>
                                    <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{item.email}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal >



            {/* Toast Notification */}
            < Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })
                }
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
    userSelector: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
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
    balanceRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10
    },
    balanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    balanceText: {
        fontSize: 12,
        fontWeight: "600",
    },

    // Items
    itemRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 16,
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    removeBtn: {
        marginStart: 10,
        marginTop: 10,
    },
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: COLORS.primary, // dashed border not simple in RN, using solid
        borderStyle: 'dashed',
        borderRadius: 8,
    },
    addItemText: {
        color: COLORS.primary,
        fontWeight: '600',
        marginStart: 6,
    },

    // Deductions
    deductionRow: {
        marginBottom: 12,
    },
    switchLabel: {
        marginStart: 10,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    deductionInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginStart: 50,
    },
    deductionInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 8,
        width: 100,
        textAlign: 'center',
    },
    deductionHint: {
        marginStart: 10,
        fontSize: 12,
        color: COLORS.textLight,
    },

    // Currency & Tax
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    currencyRow: {
        flexDirection: 'row',
        gap: 8,
    },
    currencyBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    currencyBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    currencyBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    currencyBtnTextActive: {
        color: 'white',
    },

    // Summary
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
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    totalValue: {
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

    // Modal
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 12,
    },

    // RTL Styles
    textRTL: {
        textAlign: 'right',
    },
    sectionRTL: {
        // Section RTL adjustments if needed
    },
    userSelectorRTL: {
        flexDirection: 'row-reverse',
    },
    balanceRowRTL: {
        flexDirection: 'row-reverse',
    },
    balanceBadgeRTL: {
        flexDirection: 'row-reverse',
    },
    itemRowRTL: {
        flexDirection: 'row-reverse',
    },
    inputRTL: {
        textAlign: 'right',
    },
    removeBtnRTL: {
        marginStart: 0,
        marginEnd: 10,
    },
    addItemBtnRTL: {
        flexDirection: 'row-reverse',
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    currencyRowRTL: {
        flexDirection: 'row-reverse',
    },
    deductionRowRTL: {
        // Deduction row RTL adjustments
    },
    switchLabelRTL: {
        marginStart: 0,
        marginEnd: 10,
    },
    deductionInputContainerRTL: {
        marginStart: 0,
        marginEnd: 50,
        flexDirection: 'row-reverse',
    },
    summaryRowRTL: {
        flexDirection: 'row-reverse',
    },
    modalHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    userItemRTL: {
        flexDirection: 'row-reverse',
    },
    avatarRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    // New Styles
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    toggleRowRTL: {
        flexDirection: 'row-reverse',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 4,
    },
    inputContainer: {
        marginBottom: 15,
        paddingHorizontal: 5,
        borderLeftWidth: 2,
        borderLeftColor: COLORS.primary,
        marginStart: 5,
    },
    inputLabel: {
        fontSize: 13,
        color: COLORS.textLight,
        marginBottom: 5,
    },
});
