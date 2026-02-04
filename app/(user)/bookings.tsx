import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { bookingsApi, Booking } from "../../src/services/api";
import { initiateBookingPayment } from "../../src/services/paymentHelpers";
import { useAuth } from "../../src/contexts/AuthContext";

const { width } = Dimensions.get("window");

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

export default function BookingsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saveCard, setSaveCard] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('[User Bookings] Fetching bookings...');
      const data = await bookingsApi.getMyBookings();
      console.log('[User Bookings] Fetched:', data?.length || 0, 'bookings');
      console.log('[User Bookings] Data:', JSON.stringify(data, null, 2));
      setBookings(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("[User Bookings] Error loading bookings:", error);
      console.error("[User Bookings] Error message:", error?.message);
      // Don't throw - just set empty array and let UI show empty state
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, []);

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    const status = b.status ? b.status.toUpperCase() : "";
    if (activeTab === "upcoming") return status === "CONFIRMED" || status === "PENDING" || status === "PAID";
    if (activeTab === "completed") return status === "COMPLETED";
    if (activeTab === "cancelled") return status === "CANCELLED" || status === "REFUNDED" || status === "NO_SHOW";
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('common.myBookings', 'My Bookings')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, isRTL && styles.tabsRTL]}>
        <TabButton
          label={t("bookings.upcoming")}
          isActive={activeTab === "upcoming"}
          onPress={() => setActiveTab("upcoming")}
        />
        <TabButton
          label={t("bookings.completed")}
          isActive={activeTab === "completed"}
          onPress={() => setActiveTab("completed")}
        />
        <TabButton
          label={t("bookings.cancelled")}
          isActive={activeTab === "cancelled"}
          onPress={() => setActiveTab("cancelled")}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking, index) => (
            <View key={booking.id || index}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: "/(user)/bookings/[id]", params: { id: booking.id } })}
              >
                <BookingCard booking={booking} isRTL={isRTL} t={t} user={user} saveCard={saveCard} setSaveCard={setSaveCard} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>{t("bookings.noBookings")}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper function to format dates safely
function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateString);
  }
}

function BookingCard({ booking, isRTL, t, user, saveCard, setSaveCard }: any) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return COLORS.success;
      case "pending": return COLORS.warning;
      case "cancelled": return COLORS.error;
      case "completed": return COLORS.primary;
      default: return COLORS.textLight;
    }
  };

  // Helper for currency
  const { language } = useLanguage();
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const statusLower = booking.status ? booking.status.toLowerCase() : "";
  const statusLabel = t(`bookings.status.${statusLower}`, booking.status);
  const paymentStatus = booking.payment_status ? booking.payment_status.toLowerCase() : "";
  const needsPayment = (statusLower === "pending" || statusLower === "confirmed") && paymentStatus === "unpaid";

  const handlePayNow = async (e: any) => {
    e.stopPropagation();
    if (!user) return;
    await initiateBookingPayment(booking, user.email, user.full_name || user.email, saveCard);
  };

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bookingTitle, isRTL && styles.textRTL]}>
            {isRTL ? booking.title_ar : booking.title_en}
          </Text>
          <Text style={[styles.bookingId, isRTL && styles.textRTL]}>
            {booking.booking_number}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statusLower) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(statusLower) }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[styles.cardBody, isRTL && styles.cardBodyRTL]}>
        <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.infoText}>
            {formatDate(booking.start_date)} {booking.end_date ? `- ${formatDate(booking.end_date)}` : ''}
          </Text>
        </View>
        <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.textLight} />
          <Text style={[styles.infoText, { fontWeight: '600', color: COLORS.primary }]}>
            {formatPrice(booking.total_amount, booking.currency)}
          </Text>
        </View>
      </View>

      {needsPayment && (
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

          <TouchableOpacity style={styles.payButton} onPress={handlePayNow}>
            <Ionicons name="card-outline" size={18} color="#fff" />
            <Text style={styles.payButtonText}>{t('common.payNow', 'ادفع الآن')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function TabButton({ label, isActive, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, isActive && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    padding: 6,
    margin: 16,
    borderRadius: 12,
  },
  tabsRTL: {
    flexDirection: "row-reverse",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderRTL: {
    flexDirection: "row-reverse",
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  textRTL: {
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  cardBodyRTL: {
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoRowRTL: {
    flexDirection: "row-reverse",
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
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
