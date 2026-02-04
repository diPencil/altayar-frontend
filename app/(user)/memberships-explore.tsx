import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { membershipsApi } from "../../src/services/api";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
  primary: "#0891b2",
  background: "#f1f5f9",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
};

// Same lounge-style assets/themes used in `/(user)/membership-journey`
const TIER_IMAGES: Record<string, any> = {
  silver: require("../../assets/images/silver.png"),
  gold: require("../../assets/images/gold.png"),
  platinum: require("../../assets/images/platinum.png"),
  vip: require("../../assets/images/vip.png"),
  diamond: require("../../assets/images/diamond.png"),
  business: require("../../assets/images/business.png"),
};

const TIER_THEMES: Record<string, any> = {
  silver: {
    color: "#9ca3af",
    gradientColors: ["#E0E7FF", "#FAFAFA"],
    primaryColor: "#475569",
    accentColor: "#64748b",
  },
  gold: {
    color: "#f59e0b",
    gradientColors: ["#FEF3C7", "#FFFBEB"],
    primaryColor: "#b45309",
    accentColor: "#d97706",
  },
  platinum: {
    color: "#8b5cf6",
    gradientColors: ["#F3E8FF", "#FAF5FF"],
    primaryColor: "#7e22ce",
    accentColor: "#9333ea",
  },
  vip: {
    color: "#10b981",
    gradientColors: ["#ECFDF5", "#F0FDF4"],
    primaryColor: "#047857",
    accentColor: "#059669",
  },
  diamond: {
    color: "#06b6d4",
    gradientColors: ["#E0F2FE", "#F0F9FF"],
    primaryColor: "#0369a1",
    accentColor: "#0284c7",
  },
  business: {
    color: "#1e293b",
    gradientColors: ["#FEE2E2", "#FEF2F2"],
    primaryColor: "#b91c1c",
    accentColor: "#dc2626",
  },
};

const ARABIC_TIER_TITLES: Record<string, string> = {
  silver: "الباقة الفضية",
  gold: "الباقة الذهبية",
  platinum: "الباقة البلاتينية",
  vip: "باقة كبار الأشخاص",
  diamond: "الباقة الماسية",
  business: "باقة البزنس",
};

export default function MembershipsExploreScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await membershipsApi.getPlans(true);
        if (!mounted) return;
        setPlans(Array.isArray(res) ? res : []);
      } catch {
        if (!mounted) return;
        setPlans([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const introText = useMemo(() => {
    return t(
      "membership.plans.intro",
      "Explore our membership tiers. Contact us to subscribe and unlock the full app experience."
    );
  }, [t]);

  const contactUs = (plan: any) => {
    const planName = language === "ar" ? (plan?.tier_name_ar || plan?.tier_name_en) : (plan?.tier_name_en || plan?.tier_name_ar);
    const planCode = String(plan?.tier_code || "").toUpperCase();
    const prefill = t("membership.plans.autoChatMessage", {
      planName,
      planCode,
      defaultValue: `Hello Altayar, I want to subscribe to ${planName} (${planCode}).`,
    });

    router.push({
      pathname: "/(user)/inbox",
      params: {
        autoSend: "1",
        prefill,
        planId: String(plan?.id || ""),
        planCode,
      },
    } as any);
  };

  const tiers = useMemo(() => {
    const normalizeCode = (c: string) => {
      const lc = c?.toLowerCase() || "";
      const uc = c?.toUpperCase() || "";
      if (lc === "vm-club member" || lc.includes("vip") || uc.startsWith("VM")) return "vip";
      if (lc.includes("gold") || uc.startsWith("GM")) return "gold";
      if (lc.includes("platinum") || uc.startsWith("PM")) return "platinum";
      if (lc.includes("diamond") || uc.startsWith("DM")) return "diamond";
      if (lc.includes("business") || uc.startsWith("BM")) return "business";
      if (lc.includes("silver") || uc.startsWith("SM")) return "silver";
      return lc;
    };

    const POINTS_MAP: Record<string, number> = {
      silver: 1500,
      gold: 4000,
      platinum: 8500,
      vip: 18000,
      diamond: 47000,
      business: 100000,
    };

    const mapped = (plans || []).map((p: any) => {
      const rawCode = String(p?.tier_code || "");
      let code = normalizeCode(rawCode);

      // Fallback by name (if backend codes are inconsistent)
      if (!TIER_THEMES[code]) {
        const nameLower = String(p?.tier_name_en || "").toLowerCase();
        const nameLowerAr = String(p?.tier_name_ar || "").toLowerCase();
        if (nameLower.includes("gold") || nameLowerAr.includes("ذهبي")) code = "gold";
        else if (nameLower.includes("platinum") || nameLowerAr.includes("بلاتيني")) code = "platinum";
        else if (nameLower.includes("vip") || nameLowerAr.includes("vip")) code = "vip";
        else if (nameLower.includes("diamond") || nameLowerAr.includes("ماسي")) code = "diamond";
        else if (nameLower.includes("business") || nameLowerAr.includes("أعمال")) code = "business";
        else if (nameLower.includes("silver") || nameLowerAr.includes("فضي")) code = "silver";
      }

      const theme = TIER_THEMES[code] || TIER_THEMES.silver;
      const price = typeof p?.price === "number" ? p.price : Number(p?.price || 0);
      const currency = String(p?.currency || "").toUpperCase() || "USD";
      const pointsFromPerks = p?.perks?.points;
      const pointsNeeded = typeof pointsFromPerks === "number" ? pointsFromPerks : (POINTS_MAP[code] || 0);

      return {
        id: String(p?.id || ""),
        code,
        nameEn: String(p?.tier_name_en || ""),
        nameAr: String(p?.tier_name_ar || ""),
        descriptionEn: String(p?.description_en || p?.description || ""),
        descriptionAr: String(p?.description_ar || p?.description || ""),
        pointsNeeded,
        price,
        currency,
        image: TIER_IMAGES[code] || TIER_IMAGES.silver,
        gradientColors: theme.gradientColors,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
        plan: p,
      };
    });

    return mapped.sort((a, b) => (a.pointsNeeded || 0) - (b.pointsNeeded || 0));
  }, [plans]);

  const renderTierCard = (tier: any) => {
    const tierName = language === "ar" ? tier.nameAr : tier.nameEn;
    const description = language === "ar" ? tier.descriptionAr : tier.descriptionEn;

    const title =
      language === "ar" && tier.code && ARABIC_TIER_TITLES[String(tier.code).toLowerCase()]
        ? ARABIC_TIER_TITLES[String(tier.code).toLowerCase()]
        : String(tierName || "").replace(/Membership/i, "").trim();

    const showPoints = typeof tier.pointsNeeded === "number" && tier.pointsNeeded > 0;
    const showPrice = tier.price && tier.price > 0;

    return (
      <LinearGradient
        colors={tier.gradientColors || ["#ffffff", "#f8fafc"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.loungeCard, isRTL && { flexDirection: "row-reverse" }]}
      >
        <View
          style={[
            styles.loungeContent,
            isRTL ? { paddingLeft: 10, paddingRight: 0, alignItems: "flex-end" } : { paddingRight: 10, alignItems: "flex-start" },
          ]}
        >
          <Text style={[styles.loungeTitle, { color: tier.primaryColor, textAlign: isRTL ? "right" : "left" }]}>
            {title}
          </Text>

          {!!description && (
            <Text style={[styles.loungeDesc, { color: tier.accentColor, textAlign: isRTL ? "right" : "left" }]} numberOfLines={3}>
              {description}
            </Text>
          )}

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, marginTop: 4 }}>
            {showPoints && (
              <Text style={[styles.loungePoints, { color: tier.accentColor }]}>
                {Number(tier.pointsNeeded).toLocaleString()} {t("common.pts", "PTS")}
              </Text>
            )}

            {showPrice && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 1, height: 12, backgroundColor: tier.accentColor, opacity: 0.3, marginHorizontal: 12 }} />
                <Text style={[styles.loungePoints, { color: tier.primaryColor, fontWeight: "800" }]}>
                  {tier.price.toLocaleString()} {tier.currency}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.loungeCtaRow, isRTL && styles.loungeCtaRowRTL]}>
            <Text style={[styles.loungeCtaHint, isRTL && styles.textRTL]} numberOfLines={2}>
              {t("membership.plans.subscribeHint", "To subscribe to this tier, tap Subscribe.")}
            </Text>
            <TouchableOpacity
              style={[styles.loungeCtaBtn, isRTL && styles.loungeCtaBtnRTL]}
              onPress={() => contactUs(tier.plan)}
              activeOpacity={0.9}
            >
              <Text style={styles.loungeCtaBtnText}>{t("membership.plans.subscribeCta", "Subscribe")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!!tier.image && (
          <Image
            source={tier.image}
            style={[
              styles.loungeImage,
              isRTL && { right: undefined, left: -15, transform: [{ rotate: "10deg" }] },
            ]}
            resizeMode="contain"
          />
        )}
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.push("/(user)"))}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t("membership.plans.title", "Memberships")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t("common.loading", "Loading...")}</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 140 }}>
          <LinearGradient
            colors={[COLORS.primary, "#0e7490"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={[styles.heroTopRow, isRTL && styles.heroTopRowRTL]}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="sparkles" size={22} color="#fff" />
              </View>

              <View style={styles.heroTextCol}>
                <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>
                  {t("membership.plans.categoriesTitle", "Membership tiers")}
                </Text>
                <Text style={[styles.heroSubtitle, isRTL && styles.textRTL]}>{introText}</Text>
              </View>
            </View>

            <View style={[styles.heroHintRow, isRTL && styles.heroHintRowRTL]}>
              <Ionicons name="chatbubbles-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={[styles.heroHintText, isRTL && styles.textRTL]} numberOfLines={2}>
                {t("membership.plans.subscribeHint", "To subscribe to this tier, tap Subscribe.")}
              </Text>
            </View>
          </LinearGradient>

          {tiers.map((tier: any) => (
            <View key={tier.id || tier.code} style={styles.tierItem}>
              {renderTierCard(tier)}
            </View>
          ))}

          {plans.length === 0 && (
            <Text style={[styles.empty, isRTL && styles.textRTL]}>
              {t("membership.plans.empty", "No membership plans available right now.")}
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRTL: { flexDirection: "row-reverse" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  body: { padding: 16 },
  textRTL: { textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  loadingText: { marginTop: 8, color: COLORS.textLight },
  introCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  introRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  introRowRTL: { flexDirection: "row-reverse" },
  introTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, flex: 1 },
  introText: { color: COLORS.textLight, lineHeight: 20 },

  heroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroTopRowRTL: {
    flexDirection: "row-reverse",
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.92)",
    lineHeight: 20,
  },
  heroHintRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  heroHintRowRTL: {
    flexDirection: "row-reverse",
  },
  heroHintText: {
    color: "rgba(255,255,255,0.9)",
    flex: 1,
    lineHeight: 18,
    fontWeight: "700",
    fontSize: 12,
  },

  tierItem: {
    marginBottom: 16,
  },

  loungeCtaRow: {
    marginTop: 10,
    alignSelf: "stretch",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 8,
  },
  loungeCtaRowRTL: { alignItems: "flex-end" },
  loungeCtaHint: {
    color: COLORS.textLight,
    flex: 1,
  },
  loungeCtaBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  loungeCtaBtnRTL: {
    alignSelf: "flex-end",
  },
  loungeCtaBtnText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  // Lounge card styles (aligned with `membership-journey`)
  loungeCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    height: 200,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  loungeContent: {
    flex: 1,
    paddingRight: 10,
    zIndex: 2,
    justifyContent: "center",
  },
  loungeImage: {
    width: 110,
    height: 110,
    position: "absolute",
    right: -15,
    bottom: -15,
    opacity: 0.9,
    transform: [{ rotate: "-10deg" }],
  },
  loungeTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  loungeDesc: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 6,
  },
  loungePoints: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },

  empty: { textAlign: "center", color: COLORS.textLight, marginTop: 10 },
});

