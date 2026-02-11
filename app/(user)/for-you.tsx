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

export default function ForYouScreen() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();

    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingFavId, setTogglingFavId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch ONLY Targeted Offers (For You) - source = MARKETING
            const allOffers = await offersApi.getMyOffers().catch(() => []);
            const targeted = allOffers.filter(o => o.offer_source === 'MARKETING');
            setOffers(targeted);
        } catch (error) {
            console.log("Error loading for you offers:", error);
            setOffers([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const toggleOfferFavoriteAndOpen = async (offer: Offer) => {
        const isFav = !!offer?.is_favorited;
        try {
            setTogglingFavId(offer.id);
            if (isFav) {
                await offersApi.removeFavorite(offer.id);
            } else {
                await offersApi.addFavorite(offer.id);
            }
            const next = { ...offer, is_favorited: !isFav };
            setOffers(prev => prev.map(o => (o.id === offer.id ? next : o)));
            router.push({ pathname: "/(user)/favorites", params: { tab: "offers" } } as any);
        } catch (e) {
            console.log("Failed to toggle offer favorite:", e);
        } finally {
            setTogglingFavId(null);
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
                <Text style={styles.headerTitle}>{t("dashboard.offersMadeForYou")}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={offers}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    numColumns={2}
                    contentContainerStyle={[styles.listContent, isRTL && { transform: [{ scaleX: -1 }] }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <View style={[{ width: '48%', marginBottom: 16, marginHorizontal: '1%' }, isRTL && { transform: [{ scaleX: -1 }] }]}>
                            <OfferCard
                                offer={item}
                                isRTL={isRTL}
                                language={language}
                                t={t}
                                isTargeted={true}
                                onToggleFavorite={toggleOfferFavoriteAndOpen}
                                togglingFav={togglingFavId === item.id}
                            />
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={[styles.emptyState, isRTL && { transform: [{ scaleX: -1 }] }]}>
                            <Ionicons name="gift-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>{t("dashboard.noOffers")}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

function OfferCard({ offer, isRTL, language, t, isTargeted, onToggleFavorite, togglingFav }: any) {
    const getImage = (cat: string) => {
        if (cat === 'hotel') return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600';
        return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600';
    }

    const isBroadcast = offer.offer_type === 'BROADCAST' || offer.offer_type === 'OTHER';
    const isVoucher = offer.offer_type === 'OTHER' && !isBroadcast;

    const onPress = () => {
        router.push({
            pathname: "/(user)/offer/[id]",
            params: { id: offer.id, backPath: "/(user)/for-you" }
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

                {/* Favorite Button */}
                <TouchableOpacity
                    style={[styles.favoriteBtn, isRTL ? { left: 12, right: undefined } : { right: 12, left: undefined }]}
                    onPress={(e) => {
                        e.stopPropagation();
                        onToggleFavorite?.(offer);
                    }}
                    disabled={!!togglingFav}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name={offer?.is_favorited ? "heart" : "heart-outline"}
                        size={18}
                        color={offer?.is_favorited ? "#FF3B30" : COLORS.text}
                    />
                </TouchableOpacity>

                {/* Discount Badge */}
                {offer.discount_percentage && !isBroadcast && (
                    <View style={[styles.discountBadge, isRTL ? styles.discountBadgeRTL : { right: 12 }]}>
                        <Text style={styles.discountText}>{offer.discount_percentage}% OFF</Text>
                    </View>
                )}
            </View>

            <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
                <Text style={[styles.cardTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                    {language === 'ar' ? offer.title_ar : offer.title_en}
                </Text>

                {!isBroadcast && (
                    <Text style={[styles.price, isRTL && styles.textRTL]}>
                        {t('common.from', 'From')} {offer.discounted_price || offer.original_price} {offer.currency}
                    </Text>
                )}

                {isBroadcast && (
                    <Text style={[styles.price, isRTL && styles.textRTL]} numberOfLines={1}>
                        {t('common.readMore')}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

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
    listContent: {
        padding: 16,
        paddingTop: 10,
        paddingBottom: 110,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        marginBottom: 16,
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
        height: 120, // Reduced height
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
    discountBadge: {
        position: "absolute",
        top: 12,
        backgroundColor: COLORS.error,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    discountBadgeRTL: {
        left: 12
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
        marginBottom: 8,
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
