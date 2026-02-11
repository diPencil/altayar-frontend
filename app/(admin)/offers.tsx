import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Modal, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, offersApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";

const COLORS = {
    primary: "#1071b8",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

export default function AdminOffers() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [offers, setOffers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState<any>(null);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        fetchCategories();
        fetchOffers();
    }, []);

    useEffect(() => {
        fetchOffers();
    }, [selectedCategory]);

    const fetchCategories = async () => {
        try {
            const data = await offersApi.getCategories(false);
            setCategories(data || []);
        } catch (e) {
            // Silently handle errors
        }
    };

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getAllOffers({ offer_source: 'ADMIN' });
            let filtered = res || [];

            // Filter by category if selected
            if (selectedCategory) {
                filtered = filtered.filter((offer: any) => offer.category_id === selectedCategory);
            }

            setOffers(filtered);
        } catch (e) {
            // Silently handle errors
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOffers();
        setRefreshing(false);
    }, []);

    const handleDeleteRequest = (offer: any) => {
        setOfferToDelete(offer);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!offerToDelete) return;
        try {
            await offersApi.delete(offerToDelete.id);
            setDeleteModalVisible(false);
            setOfferToDelete(null);
            setToast({ visible: true, message: t('admin.manageOffers.deleteSuccess'), type: 'success' });
            fetchOffers();
        } catch (e: any) {
            setDeleteModalVisible(false);
            setToast({ visible: true, message: e.response?.data?.detail || t('common.error'), type: 'error' });
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageOffers.title"), headerBackTitle: t("common.back") }} />

            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t("admin.manageOffers.title")}</Text>
                    <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>{offers.length} {t("admin.manageOffers.activeOffers")}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createBtn, isRTL && styles.createBtnRTL]}
                    onPress={() => router.push("/(admin)/offers/create")}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.createBtnText}>{t("admin.manageOffers.newOffer")}</Text>
                </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                        style={[
                            styles.pill,
                            selectedCategory === "" && styles.pillActive,
                            selectedCategory === "" && { backgroundColor: COLORS.primary }
                        ]}
                        onPress={() => setSelectedCategory("")}
                    >
                        <Text style={[styles.pillText, selectedCategory === "" && { color: 'white' }]}>
                            {t('common.all')}
                        </Text>
                    </TouchableOpacity>
                    {categories.map(category => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.pill,
                                selectedCategory === category.id && styles.pillActive,
                                selectedCategory === category.id && { backgroundColor: COLORS.primary }
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text style={[styles.pillText, selectedCategory === category.id && { color: 'white' }]}>
                                {isRTL ? category.name_ar : category.name_en}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
                ) : offers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="pricetag-outline" size={64} color={COLORS.textLight} />
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t("admin.manageOffers.empty")}</Text>
                    </View>
                ) : (
                    offers.map((offer: any) => (
                        <OfferCard
                            key={offer.id}
                            offer={offer}
                            onDelete={() => handleDeleteRequest(offer)}
                            onEdit={() => router.push({ pathname: "/(admin)/offers/create", params: { id: offer.id } })}
                        />
                    ))
                )}
            </ScrollView>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteModalVisible}
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="warning" size={48} color={COLORS.error} />
                            <Text style={styles.modalTitle}>{t('admin.manageOffers.deleteConfirmTitle')}</Text>
                        </View>

                        <Text style={styles.modalMessage}>
                            {t('admin.manageOffers.deleteConfirmMsg')}
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.deleteBtn]}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View >
    );
}

function OfferCard({ offer, onDelete, onEdit }: any) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const statusColor = offer.status === 'ACTIVE' ? COLORS.success : COLORS.textLight;

    const statusLabels: any = {
        ACTIVE: t("admin.manageOffers.status.active"),
        INACTIVE: t("admin.manageOffers.status.inactive"),
    };

    return (
        <View style={[styles.card, isRTL && styles.cardRTL]}>
            <Image source={{ uri: offer.image_url }} style={[styles.offerImage, isRTL && styles.offerImageRTL]} />
            <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
                <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                    <Text style={[styles.offerTitle, isRTL && styles.textRTL]} numberOfLines={1}>{isRTL ? (offer.title_ar || offer.title_en) : offer.title_en}</Text>
                    <View style={[styles.actionsContainer, isRTL && styles.actionsContainerRTL]}>
                        <TouchableOpacity onPress={onEdit}>
                            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onDelete}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabels[offer.status] || offer.status}</Text>
                        </View>
                    </View>
                </View>
                <Text style={[styles.offerDest, isRTL && styles.textRTL]}>{offer.destination}</Text>

                <View style={[styles.priceRow, isRTL && styles.priceRowRTL]}>
                    {offer.original_price > offer.discounted_price && (
                        <Text style={[styles.originalPrice, isRTL && styles.textRTL]}>{offer.original_price}</Text>
                    )}
                    <Text style={[styles.discountedPrice, isRTL && styles.textRTL]}>{offer.discounted_price} {t(`common.currency.${offer.currency?.toLowerCase()}`) || offer.currency}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    pageSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '600',
        marginStart: 6,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
        flexDirection: 'row',
        height: 100,
    },
    offerImage: {
        width: 100,
        height: '100%',
        backgroundColor: '#eee',
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    offerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    offerDest: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    originalPrice: {
        fontSize: 12,
        color: COLORS.textLight,
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.success,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS.textLight,
        fontSize: 16,
    },
    // RTL Styles
    headerRowRTL: {
        flexDirection: 'row-reverse',
    },
    textRTL: {
        textAlign: 'right',
    },
    createBtnRTL: {
        flexDirection: 'row-reverse',
    },
    cardRTL: {
        flexDirection: 'row-reverse',
    },
    offerImageRTL: {
    },
    cardContentRTL: {
        alignItems: 'flex-end',
    },
    cardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    actionsContainerRTL: {
        flexDirection: 'row-reverse',
    },
    priceRowRTL: {
        flexDirection: 'row-reverse',
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginEnd: 8,
    },
    pillActive: {
        borderColor: 'transparent',
    },
    pillText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 12,
    },
    modalMessage: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    deleteBtn: {
        backgroundColor: COLORS.error,
    },
    cancelBtnText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    deleteBtnText: {
        color: 'white',
        fontWeight: '600',
    },
});
