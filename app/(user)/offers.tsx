import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { offersApi, Offer } from "../../src/services/api";
import OfferRatingModal from "../../src/components/OfferRatingModal";
import OfferActionsMenu from "../../src/components/OfferActionsMenu";
import ConfirmModal from "../../src/components/ConfirmModal";
import Toast from "../../src/components/Toast";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#1071b8",
  secondary: "#167dc1",
  background: "#f0f9ff",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  border: "#e2e8f0",
  purple: "#8b5cf6",
  white: "#ffffff",
};

export default function OffersScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("all");

  // Two separate lists
  const [targetedOffers, setTargetedOffers] = useState<Offer[]>([]); // "For You"
  const [globalOffers, setGlobalOffers] = useState<Offer[]>([]); // "Special Offers" (Filtered)
  const [allPublicOffers, setAllPublicOffers] = useState<Offer[]>([]); // "Special Offers" (Raw / All)

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingFavId, setTogglingFavId] = useState<string | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingOffer, setRatingOffer] = useState<Offer | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [actionsMenuVisible, setActionsMenuVisible] = useState(false);
  const [actionsOffer, setActionsOffer] = useState<Offer | null>(null);
  const [favoriteConfirmVisible, setFavoriteConfirmVisible] = useState(false);
  const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Initial Data Load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter Logic: Runs when category changes or data updates
  useEffect(() => {
    if (activeCategory === 'all') {
      setGlobalOffers(allPublicOffers);
    } else {
      const filtered = allPublicOffers.filter((o: Offer) => o.category_id === activeCategory);
      setGlobalOffers(filtered);
    }
  }, [activeCategory, allPublicOffers]);

  const loadCategories = async () => {
    try {
      const data = await offersApi.getCategories(true).catch(() => []);
      setCategories(data || []);
    } catch (e) {
      console.log('Error loading categories', e);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCategories(), loadOffers()]);
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      // 1. Fetch Targeted Offers (For You) - source = MARKETING
      const myOffersRaw = await offersApi.getMyOffers().catch(() => []);
      const myOffers = myOffersRaw.filter(o => o.offer_source === 'MARKETING');
      setTargetedOffers(myOffers);

      // 2. Fetch Global Offers (Special Offers)
      // Fetch ALL public offers
      const publicOffersRaw = await offersApi.getPublic().catch(() => []);
      const allPublic = publicOffersRaw.filter((o: Offer) => !o.offer_source || o.offer_source === 'ADMIN');
      setAllPublicOffers(allPublic);

      // Note: globalOffers will be set by the useEffect hook
    } catch (error) {
      console.log("Error loading offers:", error);
      setTargetedOffers([]);
      setAllPublicOffers([]);
    }
  };

  const toggleOfferFavorite = async (offer: Offer) => {
    const isFav = !!offer?.is_favorited;
    try {
      setTogglingFavId(offer.id);
      if (isFav) {
        await offersApi.removeFavorite(offer.id);
      } else {
        await offersApi.addFavorite(offer.id);
      }

      const next = { ...offer, is_favorited: !isFav };
      setAllPublicOffers(prev => prev.map(o => (o.id === offer.id ? next : o)));
      setTargetedOffers(prev => prev.map(o => (o.id === offer.id ? next : o)));
    } catch (e) {
      console.log("Failed to toggle offer favorite:", e);
      showToast(t('common.error'), 'error');
    } finally {
      setTogglingFavId(null);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOffers(); // Re-fetch data
    setRefreshing(false);
  }, []);

  const openRatingModal = (offer: Offer) => {
    setRatingOffer(offer);
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setRatingOffer(null);
    setRatingSubmitting(false);
  };

  const submitRating = async (rating: number) => {
    if (!ratingOffer?.id) return;
    try {
      setRatingSubmitting(true);
      const res = await offersApi.rateOffer(ratingOffer.id, rating);

      const next: Offer = {
        ...(ratingOffer as any),
        rating_count: res?.rating_count,
        average_rating: res?.average_rating,
        my_rating: res?.my_rating,
      };

      setAllPublicOffers((prev) => prev.map((o) => (o.id === ratingOffer.id ? next : o)));
      setTargetedOffers((prev) => prev.map((o) => (o.id === ratingOffer.id ? next : o)));
      setRatingOffer(next);
      setRatingModalVisible(false);
    } catch (e) {
      console.log("Failed to rate offer:", e);
      showToast(t('common.error'), 'error');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const openActionsMenu = (offer: Offer) => {
    setActionsOffer(offer);
    setActionsMenuVisible(true);
  };

  const closeActionsMenu = () => {
    setActionsMenuVisible(false);
    setActionsOffer(null);
  };

  const openFavoriteConfirm = (offer: Offer) => {
    setActionsOffer(offer);
    setFavoriteConfirmVisible(true);
  };

  const closeFavoriteConfirm = () => {
    setFavoriteConfirmVisible(false);
    setFavoriteSubmitting(false);
  };

  const confirmFavoriteToggle = async () => {
    if (!actionsOffer?.id) return;
    try {
      setFavoriteSubmitting(true);
      await toggleOfferFavorite(actionsOffer);
      setFavoriteConfirmVisible(false);
      setActionsMenuVisible(false);
      setActionsOffer(null);
    } finally {
      setFavoriteSubmitting(false);
    }
  };


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
        <Text style={styles.headerTitle}>{t("dashboard.specialOffers")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={globalOffers}
          keyExtractor={(item, index) => item.id || `global-${index}`}
          numColumns={2}
          contentContainerStyle={[styles.listContent, isRTL && { transform: [{ scaleX: -1 }] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={[isRTL && { transform: [{ scaleX: -1 }] }]}>
              {/* Categories Filter - ScrollView needs to be RTL too, so flip it (-1) and unflip pills (-1) */}
              {/* Context: Header is Normal (1). Puts ScrollView (-1). Pills (-1). Net Pills (1). */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categories}
                style={[{ marginBottom: 20 }, isRTL && { transform: [{ scaleX: -1 }] }]}
              >
                <View style={[isRTL && { transform: [{ scaleX: -1 }] }]}>
                  <CategoryPill
                    label={t("common.all")}
                    isActive={activeCategory === "all"}
                    onPress={() => setActiveCategory("all")}
                  />
                </View>
                {categories.map((cat, index) => (
                  <View key={cat.id || index} style={[isRTL && { transform: [{ scaleX: -1 }] }]}>
                    <CategoryPill
                      label={language === 'ar' ? cat.name_ar : cat.name_en}
                      isActive={activeCategory === cat.id}
                      onPress={() => setActiveCategory(cat.id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[{ width: '48%', marginHorizontal: '1%', marginBottom: 16 }, isRTL && { transform: [{ scaleX: -1 }] }]}>
              <OfferCard
                offer={item}
                isRTL={isRTL}
                language={language}
                t={t}
                onOpenActionsMenu={openActionsMenu}
                togglingFav={togglingFavId === item.id}
              />
            </View>
          )}
          ListEmptyComponent={
            globalOffers.length === 0 ? (
              <View style={[styles.emptyState, isRTL && { transform: [{ scaleX: -1 }] }]}>
                <Ionicons name="pricetags-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>{t("dashboard.noOffers")}</Text>
              </View>
            ) : null
          }
        />
      )}

      <OfferRatingModal
        visible={ratingModalVisible}
        offerTitle={
          ratingOffer ? (language === "ar" ? ratingOffer.title_ar : ratingOffer.title_en) : undefined
        }
        initialRating={ratingOffer?.my_rating || 0}
        submitting={ratingSubmitting}
        onClose={closeRatingModal}
        onConfirm={submitRating}
      />

      <OfferActionsMenu
        visible={actionsMenuVisible}
        isFavorited={!!actionsOffer?.is_favorited}
        ratingCount={typeof actionsOffer?.rating_count === "number" ? actionsOffer!.rating_count! : 0}
        onClose={closeActionsMenu}
        onPressFavorite={() => {
          if (!actionsOffer) return;
          setActionsMenuVisible(false);
          openFavoriteConfirm(actionsOffer);
        }}
        onPressRate={() => {
          if (!actionsOffer) return;
          setActionsMenuVisible(false);
          openRatingModal(actionsOffer);
        }}
      />

      <ConfirmModal
        visible={favoriteConfirmVisible}
        type="info"
        title={t("offers.favoriteConfirmTitle", "Favorites")}
        message={
          actionsOffer?.is_favorited
            ? t("offers.favoriteConfirmRemove", "Are you sure you want to remove this offer from favorites?")
            : t("offers.favoriteConfirmAdd", "Are you sure you want to add this offer to favorites?")
        }
        confirmText={t("common.confirm", "Confirm")}
        cancelText={t("common.cancel", "Cancel")}
        loading={favoriteSubmitting}
        onConfirm={confirmFavoriteToggle}
        onCancel={closeFavoriteConfirm}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

function OfferCard({ offer, isRTL, language, t, isTargeted, togglingFav, onOpenActionsMenu }: any) {
  const getImage = (cat: string) => {
    if (cat === 'hotel') return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600';
    return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600';
  }

  const isBroadcast = offer.offer_type === 'BROADCAST' || offer.offer_type === 'OTHER';
  const isVoucher = offer.offer_type === 'OTHER' && !isBroadcast;

  const onPress = () => {
    router.push({
      pathname: "/(user)/offer/[id]",
      params: { id: offer.id, backPath: "/(user)/offers" }
    });
  };

  return (
    <TouchableOpacity style={[styles.card, isTargeted && styles.cardTargeted]} onPress={onPress}>
      <View style={{ position: 'relative' }}>
        {/* Image */}
        <Image
          source={{ uri: offer.image_url || getImage(offer.category) }}
          style={styles.cardImage}
        />

        {/* Actions Menu Button */}
        <TouchableOpacity
          style={[
            styles.actionsBtn,
            isRTL ? { left: 12, right: undefined } : { right: 12, left: undefined },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onOpenActionsMenu?.(offer);
          }}
          disabled={!!togglingFav}
          activeOpacity={0.85}
        >
          <Ionicons
            name="menu"
            size={18}
            color={COLORS.text}
          />
        </TouchableOpacity>

        {/* Discount Badge */}
        {offer.discount_percentage && !isBroadcast && (
          <View style={[styles.discountBadge, isRTL ? { right: 12 } : { left: 12 }]}>
            <Text style={styles.discountText}>{offer.discount_percentage}% {t('common.off')}</Text>
          </View>
        )}
      </View>

      <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
        <Text style={[styles.cardTitle, isRTL && styles.textRTL]} numberOfLines={1}>
          {language === 'ar' ? offer.title_ar : offer.title_en}
        </Text>

        {!isBroadcast && (
          <Text style={[styles.price, isRTL && styles.textRTL]}>
            {t('common.from')} {offer.discounted_price || offer.original_price} {offer.currency}
          </Text>
        )}

        {isBroadcast && (
          <Text style={[styles.price, isRTL && styles.textRTL]} numberOfLines={1}>
            {t('common.readMore')}
          </Text>
        )}

        <View style={[styles.metaRow, isRTL && styles.metaRowRTL]}>
          <View style={[styles.metaItem, isRTL && styles.metaItemRTL]}>
            <Ionicons name="star" size={14} color={COLORS.warning} />
            <Text style={styles.metaText}>
              {typeof offer?.rating_count === "number" ? offer.rating_count : 0}
            </Text>
          </View>

          {!!offer?.duration_days && (
            <View style={[styles.metaItem, isRTL && styles.metaItemRTL]}>
              <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.metaText}>
                {t('common.duration_day', { count: offer.duration_days })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

function CategoryPill({ label, isActive, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.pill, isActive && styles.pillActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
        {label}
      </Text>
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
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 8
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  categories: {
    paddingHorizontal: 0,
    gap: 8,
  },
  categoriesRTL: {
    flexDirection: "row-reverse",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  pillTextActive: {
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
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative'
  },
  cardTargeted: {
    borderWidth: 1.5,
    borderColor: COLORS.purple,
    backgroundColor: '#faf5ff'
  },
  cardImage: {
    width: "100%",
    height: 120, // Reduced height to match compacter look
  },
  favoriteBtn: {
    position: "absolute",
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  actionsBtn: {
    position: "absolute",
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRowRTL: {
    flexDirection: "row-reverse",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaItemRTL: {
    flexDirection: "row-reverse",
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "700",
  },
  discountText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },
  cardContent: {
    padding: 12,
  },
  cardContentRTL: {
    alignItems: "flex-end",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  textRTL: {
    textAlign: "right",
  },
  price: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 20
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
});
