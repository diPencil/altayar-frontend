import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { offersApi, Offer } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { isMembershipActive } from '../../../src/utils/membership';
import { MembershipRequiredModal } from '../../../src/components/MembershipRequiredModal';
import OfferRatingModal from '../../../src/components/OfferRatingModal';
import OfferActionsMenu from '../../../src/components/OfferActionsMenu';
import ConfirmModal from '../../../src/components/ConfirmModal';

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
};

export default function OfferDetailsScreen() {
    const { id, backPath } = useLocalSearchParams();
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const { user } = useAuth();
    const isMember = isMembershipActive(user);
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveCard, setSaveCard] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [membershipModalVisible, setMembershipModalVisible] = useState(false);
    const [togglingFav, setTogglingFav] = useState(false);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [actionsMenuVisible, setActionsMenuVisible] = useState(false);
    const [favoriteConfirmVisible, setFavoriteConfirmVisible] = useState(false);
    const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);

    useEffect(() => {
        console.log("OfferDetailsScreen mounted. ID param:", id);
        if (id) {
            loadOffer(id as string);
        } else {
            console.error("No ID param found via useLocalSearchParams");
        }
    }, [id]);

    const handleBack = () => {
        if (backPath) {
            router.push(backPath as any);
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.push("/(user)/offers"); // Fallback default
            }
        }
    };

    const handlePurchase = async () => {
        if (!offer || !id) return;
        if (!isMember) {
            setMembershipModalVisible(true);
            return;
        }
        try {
            setIsProcessing(true);

            // 1. Call the new API to book and initiate payment
            const response = await offersApi.bookOffer(id as string, saveCard);

            if (response && response.payment_url) {
                // 2. Navigate to payment WebView with the payment URL
                router.push({
                    pathname: '/(user)/payment/[paymentId]',
                    params: {
                        paymentId: response.payment_id,
                        paymentUrl: response.payment_url,
                    },
                });
            } else {
                Alert.alert(t('common.error'), "فشل بدء عملية الدفع");
            }
        } catch (error: any) {
            console.error("Purchase error:", error);
            Alert.alert(
                t('common.error'),
                error.message || "Failed to book offer. Please try again."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const loadOffer = async (offerId: string) => {
        try {
            console.log("Fetching offer with ID:", offerId);
            setLoading(true);
            const data = await offersApi.getOffer(offerId);
            console.log("Offer fetched successfully:", data);
            setOffer(data);
        } catch (error) {
            console.error("Error loading offer:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async () => {
        if (!offer) return;
        const isFav = !!(offer as any)?.is_favorited;
        try {
            setTogglingFav(true);
            if (isFav) {
                await offersApi.removeFavorite(offer.id);
            } else {
                await offersApi.addFavorite(offer.id);
            }
            setOffer({ ...(offer as any), is_favorited: !isFav } as any);
        } catch (e) {
            console.error("Failed to toggle favorite:", e);
        } finally {
            setTogglingFav(false);
        }
    };

    const submitRating = async (rating: number) => {
        if (!offer) return;
        try {
            setRatingSubmitting(true);
            const res = await offersApi.rateOffer(offer.id, rating);
            setOffer({
                ...(offer as any),
                rating_count: res?.rating_count,
                average_rating: res?.average_rating,
                my_rating: res?.my_rating,
            } as any);
            setRatingModalVisible(false);
        } catch (e) {
            console.error("Failed to rate offer:", e);
        } finally {
            setRatingSubmitting(false);
        }
    };

    const confirmFavoriteToggle = async () => {
        try {
            setFavoriteSubmitting(true);
            await toggleFavorite();
            setFavoriteConfirmVisible(false);
            setActionsMenuVisible(false);
        } finally {
            setFavoriteSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!offer) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t("offers.notFoundWithId", { id })}</Text>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Text style={{ color: COLORS.primary }}>{t("common.back")}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Fallback image
    const getImage = (cat: string | undefined) => {
        if (cat === 'hotel') return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600';
        return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600';
    }

    return (
        <SafeAreaView style={styles.container}>
            <MembershipRequiredModal
                visible={membershipModalVisible}
                source="offer_details"
                onClose={() => setMembershipModalVisible(false)}
            />
            <ScrollView bounces={false}>
                {/* Header Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: offer.image_url || getImage(offer.category) }}
                        style={styles.image}
                    />
                    <TouchableOpacity
                        style={[styles.headerBackBtn, isRTL ? { right: 16 } : { left: 16 }]}
                        onPress={handleBack}
                    >
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionsBtn, isRTL ? { left: 16, right: undefined } : { right: 16, left: undefined }]}
                        onPress={() => setActionsMenuVisible(true)}
                        disabled={togglingFav}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="menu"
                            size={24}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.imageOverlay}
                    />
                </View>

                <View style={styles.content}>
                    <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
                        <View style={{ flex: 1 }}>
                            {offer.offer_type && (
                                <Text style={[styles.typeLabel, isRTL && styles.textRTL]}>
                                    {t(`offers.types.${offer.offer_type}`, offer.offer_type)}
                                </Text>
                            )}
                            <Text style={[styles.title, isRTL && styles.textRTL]}>
                                {language === 'ar' ? offer.title_ar : offer.title_en}
                            </Text>
                            <View style={[styles.badgesRow, isRTL && styles.rowRTL]}>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{t(`offers.types.${offer.category}`, offer.category || t('offers.general', 'General'))}</Text>
                                </View>
                                {offer.duration_days && (
                                    <View style={[styles.durationBadge, isRTL && styles.rowRTL]}>
                                        <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                                        <Text style={[styles.durationText, isRTL && styles.durationTextRTL]}>
                                            {t('common.duration_day', { count: offer.duration_days })}
                                        </Text>
                                    </View>
                                )}
                                <View style={[styles.durationBadge, isRTL && styles.rowRTL]}>
                                    <Ionicons name="star" size={14} color={COLORS.warning} />
                                    <Text style={[styles.durationText, isRTL && styles.durationTextRTL]}>
                                        {typeof (offer as any)?.rating_count === "number" ? (offer as any).rating_count : 0}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {offer.discount_percentage && (
                            <View style={[styles.discountBadge, isRTL ? { marginRight: 10, marginLeft: 0 } : { marginLeft: 10, marginRight: 0 }]}>
                                <Text style={styles.discountText}>{isRTL ? `${offer.discount_percentage}% ${t('common.off', 'OFF')}` : `${offer.discount_percentage}% OFF`}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {isMember ? (
                        <>
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('common.description', 'Description')}</Text>
                                <Text style={[styles.description, isRTL && styles.textRTL]}>
                                    {language === 'ar' ? offer.description_ar : offer.description_en}
                                </Text>
                            </View>

                            {(offer.includes || offer.excludes) && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={[styles.rowContainer, isRTL && styles.rowContainerRTL]}>
                                        {offer.includes && (
                                            <View style={[styles.halfSection, { marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }]}>
                                                <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { color: COLORS.success }]}>{t('offers.includes', 'Included')}</Text>
                                                <View>
                                                    {(Array.isArray(offer.includes) ? offer.includes : [offer.includes]).map((item, idx) => (
                                                        <View key={idx} style={[styles.listItem, isRTL && styles.rowRTL]}>
                                                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                                            <Text style={[styles.listText, isRTL && styles.textRTL]}>{item}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                        {offer.excludes && (
                                            <View style={[styles.halfSection, { marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }]}>
                                                <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { color: COLORS.error }]}>{t('offers.excludes', 'Excluded')}</Text>
                                                <View>
                                                    {(Array.isArray(offer.excludes) ? offer.excludes : [offer.excludes]).map((item, idx) => (
                                                        <View key={idx} style={[styles.listItem, isRTL && styles.rowRTL]}>
                                                            <Ionicons name="close-circle" size={16} color={COLORS.error} />
                                                            <Text style={[styles.listText, isRTL && styles.textRTL]}>{item}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </>
                            )}

                            {offer.terms && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('offers.terms', 'Terms & Conditions')}</Text>
                                        <Text style={[styles.description, isRTL && styles.textRTL, { fontSize: 14 }]}>
                                            {offer.terms}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </>
                    ) : (
                        <View style={styles.lockedCard}>
                            <View style={[styles.lockedRow, isRTL && styles.rowRTL]}>
                                <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
                                <Text style={[styles.lockedTitle, isRTL && styles.textRTL]}>
                                    {t('membership.locked.title', 'Subscribe to unlock')}
                                </Text>
                            </View>
                            <Text style={[styles.lockedText, isRTL && styles.textRTL]}>
                                {t('offers.lockedDetails', 'Subscribe to view offer details and book this offer.')}
                            </Text>
                            <TouchableOpacity style={styles.lockedBtn} onPress={() => setMembershipModalVisible(true)}>
                                <Text style={styles.lockedBtnText}>
                                    {t('membership.locked.cta', 'View memberships')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Price section - Hide for Broadcast */}
                    {offer.offer_type !== 'BROADCAST' && (
                        <View style={styles.priceSection}>
                            <View style={[styles.priceRow, isRTL && styles.rowRTL]}>
                                <Text style={styles.priceLabel}>{t('common.price')}</Text>
                                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                                    <Text style={styles.finalPrice}>
                                        {offer.discounted_price || offer.original_price} {offer.currency}
                                    </Text>
                                    {offer.discounted_price && (
                                        <Text style={styles.originalPrice}>
                                            {offer.original_price} {offer.currency}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Validity Dates */}
                            {(offer.valid_from || offer.valid_until) && (
                                <View style={[styles.priceRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 15 }, isRTL && styles.rowRTL]}>
                                    <Text style={styles.priceLabel}>{t('offers.validity', 'Valid Period')}</Text>
                                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                                        <Text style={{ color: COLORS.text, fontWeight: '600' }}>
                                            {offer.valid_from ? new Date(offer.valid_from).toLocaleDateString() : ''}
                                            {offer.valid_until ? ` - ${new Date(offer.valid_until).toLocaleDateString()}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                </View>
            </ScrollView>

            <OfferRatingModal
                visible={ratingModalVisible}
                offerTitle={language === 'ar' ? offer.title_ar : offer.title_en}
                initialRating={(offer as any)?.my_rating || 0}
                submitting={ratingSubmitting}
                onClose={() => {
                    setRatingModalVisible(false);
                    setRatingSubmitting(false);
                }}
                onConfirm={submitRating}
            />

            <OfferActionsMenu
                visible={actionsMenuVisible}
                isFavorited={!!(offer as any)?.is_favorited}
                ratingCount={typeof (offer as any)?.rating_count === "number" ? (offer as any).rating_count : 0}
                onClose={() => setActionsMenuVisible(false)}
                onPressFavorite={() => {
                    setActionsMenuVisible(false);
                    setFavoriteConfirmVisible(true);
                }}
                onPressRate={() => {
                    setActionsMenuVisible(false);
                    setRatingModalVisible(true);
                }}
            />

            <ConfirmModal
                visible={favoriteConfirmVisible}
                type="info"
                title={t("offers.favoriteConfirmTitle", "Favorites")}
                message={
                    (offer as any)?.is_favorited
                        ? t("offers.favoriteConfirmRemove", "Are you sure you want to remove this offer from favorites?")
                        : t("offers.favoriteConfirmAdd", "Are you sure you want to add this offer to favorites?")
                }
                confirmText={t("common.confirm", "Confirm")}
                cancelText={t("common.cancel", "Cancel")}
                loading={favoriteSubmitting}
                onConfirm={confirmFavoriteToggle}
                onCancel={() => {
                    setFavoriteConfirmVisible(false);
                    setFavoriteSubmitting(false);
                }}
            />

            {/* Bottom CTA */}
            <View style={styles.footer}>
                {offer.offer_type !== 'BROADCAST' && (
                    <View style={styles.saveCardContainer}>
                        <TouchableOpacity
                            style={[styles.checkbox, saveCard && styles.checkboxChecked]}
                            onPress={() => setSaveCard(!saveCard)}
                        >
                            {saveCard && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </TouchableOpacity>
                        <Text style={[styles.saveCardText, isRTL && styles.textRTL]}>
                            {t('offers.saveCard', 'Save card for future payments')}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => {
                        if (offer.offer_type === 'BROADCAST') {
                            router.push('/(user)/help-center' as any);
                            return;
                        }
                        if (!isMember) {
                            setMembershipModalVisible(true);
                            return;
                        }
                        router.push({ pathname: '/(user)/offer-checkout', params: { id: offer.id } } as any);
                    }}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.bookBtnText}>
                            {offer.offer_type === 'BROADCAST' ? t('common.needHelp', 'Need Help?') : t('common.bookNow', 'Book Now')}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 16,
        marginBottom: 16,
    },
    backBtn: {
        padding: 10,
    },
    imageContainer: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    headerBackBtn: {
        position: 'absolute',
        top: 50,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    actionsBtn: {
        position: 'absolute',
        top: 50,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    content: {
        padding: 20,
        marginTop: -20,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 500,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    textRTL: {
        textAlign: 'right',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    categoryBadge: {
        backgroundColor: COLORS.secondary + '20', // transparent
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryText: {
        color: COLORS.secondary,
        fontWeight: '600',
        fontSize: 12,
    },
    discountBadge: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 10,
    },
    discountText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
    },
    section: {
        marginBottom: 20,
    },
    description: {
        fontSize: 16,
        color: COLORS.textLight,
        lineHeight: 24,
    },
    priceSection: {
        marginTop: 20,
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 16,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 16,
        color: COLORS.textLight,
    },
    finalPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: COLORS.textLight,
        textDecorationLine: 'line-through',
    },
    footer: {
        padding: 16,
        paddingBottom: 110, // Lifted to sit above floating tab bar
        backgroundColor: COLORS.cardBg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    bookBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 30, // Capsule shape for more premium feel
        alignItems: 'center',
    },
    bookBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    typeLabel: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    durationText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginLeft: 4,
        fontWeight: '500',
    },
    durationTextRTL: {
        marginLeft: 0,
        marginRight: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rowContainerRTL: {
        flexDirection: 'row-reverse',
    },
    halfSection: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    listText: {
        fontSize: 14,
        color: COLORS.text,
        marginLeft: 8,
    },
    saveCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
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
    lockedCard: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
    },
    lockedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    lockedTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    lockedText: {
        color: COLORS.textLight,
        lineHeight: 20,
        marginBottom: 12,
    },
    lockedBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    lockedBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
