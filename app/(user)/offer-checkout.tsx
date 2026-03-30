import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { offersApi, Offer } from "../../src/services/api";
import { isMembershipActive } from "../../src/utils/membership";
import { LinearGradient } from "expo-linear-gradient";
import { MembershipRequiredModal } from "../../src/components/MembershipRequiredModal";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
};

export default function OfferCheckoutScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = String((params as any)?.id || "");

  const isMember = isMembershipActive(user);

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [paying, setPaying] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await offersApi.getOffer(id);
        if (!mounted) return;
        setOffer(data);
      } catch (e) {
        if (!mounted) return;
        setOffer(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
    else setLoading(false);
    return () => {
      mounted = false;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!offer) return "";
    return language === "ar" ? offer.title_ar : offer.title_en;
  }, [offer, language]);

  const price = useMemo(() => {
    if (!offer) return 0;
    return offer.discounted_price || offer.original_price || 0;
  }, [offer]);

  const currency = useMemo(() => {
    if (!offer) return "";
    return offer.currency || "";
  }, [offer]);

  const goToChat = () => {
    if (!offer) return;
    const prefill = t("offers.bookingChatMessage", {
      offerTitle: title,
      price,
      currency,
      defaultValue: `Hello Altayar, I want to book this offer: ${title}. Price: ${price} ${currencyLabel}.`,
    });

    router.push({
      pathname: "/(user)/inbox",
      params: {
        autoSend: "1",
        prefill,
        offerId: String(offer.id),
      },
    } as any);
  };

  const proceedToPayment = async () => {
    if (!offer) return;
    if (!isMember) {
      setMembershipModalVisible(true);
      return;
    }
    try {
      setPaying(true);
      // Keep save_card disabled by default to avoid gateway/tokenization issues in dev.
      const response = await offersApi.bookOffer(offer.id, false);
      const paymentUrl = String((response as any)?.payment_url || "");
      const paymentId = String((response as any)?.payment_id || "");

      if (!paymentUrl || !paymentId) {
        Alert.alert(
          t("common.error", "Error"),
          (response as any)?.detail ||
            t("offers.checkoutPaymentMissing", "Payment link is not available right now. Please try again.")
        );
        return;
      }

      if (paymentUrl) {
        router.push({
          pathname: "/(user)/payment/[paymentId]",
          params: {
            paymentId,
            paymentUrl,
          },
        } as any);
      }
    } catch (e: any) {
      Alert.alert(
        t("common.error", "Error"),
        e?.response?.data?.detail ||
          e?.message ||
          t("offers.checkoutPaymentFailed", "Failed to start payment. Please try again.")
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MembershipRequiredModal
        visible={membershipModalVisible}
        source="offer_checkout"
        onClose={() => setMembershipModalVisible(false)}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t("offers.checkoutTitle", "Offer checkout")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !offer ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>
            {t("common.error", "Error")}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={[styles.cartCard, isRTL && styles.cartCardRTL]}>
            <View style={[styles.cartRow]}>
              <View style={styles.cartIcon}>
                <Ionicons name="pricetag" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.cartInfo}>
                <Text style={[styles.cartTitle, isRTL && styles.textRTL]} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={[styles.cartSub, isRTL && styles.textRTL]}>
                  {t("offers.checkoutOneItem", "1 item")}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={[styles.totalRow]}>
              <Text style={[styles.totalLabel, isRTL && styles.textRTL]}>
                {t("common.total", "Total")}
              </Text>
              <Text style={styles.totalValue}>
                {price} {formatCurrencyLabel(currency || "USD", t)}
              </Text>
            </View>
          </View>

          <LinearGradient colors={[COLORS.primary, "#0e7490"]} style={styles.actionsCard}>
            <Text style={[styles.actionsHint, isRTL && styles.textRTL]}>
              {t(
                "offers.checkoutHint",
                "Proceed to payment to complete your booking, or contact us if you need help."
              )}
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn]}
              onPress={proceedToPayment}
              disabled={paying}
              activeOpacity={0.85}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {t("offers.checkoutProceedPayment", "Proceed to payment")}
                  </Text>
                  <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn]}
              onPress={goToChat}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#0e7490" />
              <Text style={styles.secondaryBtnText}>
                {t("offers.checkoutContactUs", "Contact us")}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  textRTL: { textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  errorText: { color: COLORS.textLight, fontWeight: "700" },
  body: { padding: 16, gap: 14 },
  cartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cartCardRTL: { alignItems: "flex-start" },
  cartRow: { flexDirection: "row", gap: 12, alignItems: "center" },

  cartIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  cartInfo: { flex: 1 },
  cartTitle: { fontSize: 15, fontWeight: "900", color: COLORS.text },
  cartSub: { marginTop: 4, fontSize: 12, color: COLORS.textLight, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  totalLabel: { fontSize: 13, color: COLORS.textLight, fontWeight: "800" },
  totalValue: { fontSize: 16, color: COLORS.text, fontWeight: "900" },

  actionsCard: {
    borderRadius: 18,
    padding: 16,
  },
  actionsHint: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "700",
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  secondaryBtnText: { color: "#0e7490", fontWeight: "900" },
});

