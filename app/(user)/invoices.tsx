import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { ordersApi } from "../../src/services/api";
import { formatCurrency } from "../../src/utils/currency";
import { initiateOrderPayment } from "../../src/services/paymentHelpers";

const COLORS = {
  primary: "#0891b2",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

export default function InvoicesScreen() {
  const { isRTL, language } = useLanguage();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  // const [selectedOrder, setSelectedOrder] = useState<any>(null); // Unused
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [paying, setPaying] = useState(false);
  const [saveCard, setSaveCard] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getMyOrders();
      setOrders(res || []);
    } catch (error) {
      console.log('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const downloadInvoice = async (orderId: string) => {
    try {
      const url = `/api/orders/${orderId}/invoice/download`;
      Linking.openURL(url);
    } catch (error) {
      console.log('Error downloading invoice:', error);
    }
  };

  const openOrderDetails = async (order: any) => {
    // setSelectedOrder(order);
    setDetailsVisible(true);
    setLoadingDetails(true);
    try {
      const details = await ordersApi.getOrder(order.id);
      setOrderDetails(details);
    } catch (error) {
      console.log('Error loading details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePay = async (order: any) => {
    try {
      setPaying(true);
      if (!user) {
        Alert.alert(t('common.error'), t('auth.loginRequired'));
        return;
      }
      // setDetailsVisible(false); // Can keep open or close

      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      await initiateOrderPayment(order, user.email, userName, saveCard);
    } catch (error: any) {
      console.log('Payment error:', error);
      Alert.alert(t('common.error'), t('payment.initiationFailed'));
    } finally {
      setPaying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return COLORS.success;
      case 'PENDING': return COLORS.warning;
      case 'CANCELLED': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('invoices.title')}
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
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.lightGray} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
              {t('invoices.empty')}
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.invoiceCard} onPress={() => openOrderDetails(order)}>
              <View style={[styles.invoiceHeader, isRTL && styles.invoiceHeaderRTL]}>
                <View>
                  <Text style={[styles.invoiceId, isRTL && styles.textRTL]}>
                    #{order.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={[styles.invoiceDate, isRTL && styles.textRTL]}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.payment_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.payment_status) }]}>
                    {String(t(`invoices.status.${order.payment_status?.toLowerCase()}`, order.payment_status))}
                  </Text>
                </View>
              </View>

              <View style={[styles.invoiceBody, isRTL && styles.invoiceBodyRTL]}>
                <Text style={[styles.invoiceAmount, isRTL && styles.textRTL]}>
                  {formatCurrency(order.total_amount || 0, order.currency || 'USD', language === 'ar' ? 'ar-EG' : 'en-US')}
                </Text>
              </View>

              {order.payment_status === 'PAID' && (
                <View
                  style={[styles.downloadBtn, isRTL && styles.downloadBtnRTL]}
                >
                  <Ionicons name="download-outline" size={20} color={COLORS.primary} />
                  <Text style={[styles.downloadBtnText, isRTL && styles.downloadBtnTextRTL]}>
                    {t('invoices.download')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal visible={detailsVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, isRTL && styles.headerRTL]}>
            <Text style={styles.modalTitle}>{t('invoices.details') || "Invoice Details"}</Text>
            <TouchableOpacity onPress={() => setDetailsVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {loadingDetails ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : orderDetails ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Header with Order ID and Status */}
              <View style={[styles.detailsSection, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.detailsLabel}>
                  {t("common.hashId", { id: orderDetails.id?.slice(0, 8).toUpperCase() })}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderDetails.payment_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(orderDetails.payment_status) }]}>
                    {String(t(`invoices.status.${orderDetails.payment_status?.toLowerCase()}`, orderDetails.payment_status))}
                  </Text>
                </View>
              </View>

              {/* Order Date */}
              <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                <Text style={[styles.infoLabel, isRTL && styles.textRTL]}>{t('common.date') || "Date"}:</Text>
                <Text style={[styles.infoValue, isRTL && styles.textRTL]}>
                  {new Date(orderDetails.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Items Section */}
              <Text style={[styles.sectionHeader, isRTL && styles.textRTL]}>{t('admin.manageInvoices.items') || "Items"}</Text>
              {orderDetails.items?.map((item: any, idx: number) => {
                // Split description to get title and description
                const fullDesc = isRTL ? item.description_ar : item.description_en;
                const lines = fullDesc.split('\n');
                const title = lines[0] || fullDesc;
                const description = lines.length > 1 ? lines.slice(1).join('\n') : '';

                return (
                  <View key={idx} style={[styles.itemRow, isRTL && styles.itemRowRTL]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, isRTL && styles.textRTL]}>{title}</Text>
                      {description && (
                        <Text style={[styles.itemDescription, isRTL && styles.textRTL]}>{description}</Text>
                      )}
                      <Text style={[styles.itemParams, isRTL && styles.textRTL]}>
                        {item.quantity} x {formatCurrency(item.unit_price, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')}
                      </Text>
                    </View>
                    <Text style={[styles.itemTotal, isRTL && styles.textRTL]}>
                      {formatCurrency(item.quantity * item.unit_price, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.divider} />

              {/* Summary Section */}
              <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                <Text style={[styles.summaryLabel, isRTL && styles.textRTL]}>{t('admin.manageInvoices.subtotal') || "Subtotal"}</Text>
                <Text style={[styles.summaryValue, isRTL && styles.textRTL]}>{formatCurrency(orderDetails.subtotal, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')}</Text>
              </View>

              {orderDetails.tax_amount > 0 && (
                <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                  <Text style={[styles.summaryLabel, isRTL && styles.textRTL]}>{t('admin.manageInvoices.tax') || "Tax"}</Text>
                  <Text style={[styles.summaryValue, isRTL && styles.textRTL]}>{formatCurrency(orderDetails.tax_amount, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')}</Text>
                </View>
              )}

              {orderDetails.discount_amount > 0 && (
                <View style={[styles.summaryRow, isRTL && styles.summaryRowRTL]}>
                  <Text style={[styles.summaryLabel, isRTL && styles.textRTL, { color: COLORS.warning }]}>{t('common.discount') || "Discount"}</Text>
                  <Text style={[styles.summaryValue, isRTL && styles.textRTL, { color: COLORS.warning }]}>
                    {t("common.amountNegative", {
                      amount: formatCurrency(orderDetails.discount_amount, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')
                    })}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, isRTL && styles.totalRowRTL]}>
                <Text style={[styles.totalLabelLarge, isRTL && styles.textRTL]}>{t('admin.manageInvoices.total') || "Total"}</Text>
                <Text style={[styles.totalValueLarge, isRTL && styles.textRTL]}>{formatCurrency(orderDetails.total_amount, orderDetails.currency, isRTL ? 'ar-EG' : 'en-US')}</Text>
              </View>

              {/* Pay Button inside modal if unpaid */}
              {orderDetails.payment_status !== 'PAID' && (
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
                    style={[styles.payBtn]}
                    onPress={() => handlePay(orderDetails)}
                    disabled={paying}
                  >
                    {paying ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Text style={styles.payBtnText}>{t('invoices.payNow') || "Pay Now"}</Text>
                        <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    paddingTop: 10,
    paddingBottom: 110,
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
  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceHeaderRTL: {
    flexDirection: "row-reverse",
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  invoiceDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  invoiceBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  invoiceBodyRTL: {
    alignItems: "flex-end",
  },
  invoiceAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0f2fe",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  downloadBtnRTL: {
    flexDirection: "row-reverse",
  },
  downloadBtnText: {
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  downloadBtnTextRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  // Modal Styles
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
    marginBottom: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 16,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.text,
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
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryRowRTL: {
    flexDirection: 'row-reverse',
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
  },
  totalRowRTL: {
    flexDirection: 'row-reverse',
  },
  totalLabelLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValueLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  payBtn: {
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  payBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
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
