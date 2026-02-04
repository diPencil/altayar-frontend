import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
    Platform
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { offersApi } from "../../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import Toast from "../../../src/components/Toast";
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
    primary: "#0891b2",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

const OFFER_TYPES = ["HOTEL", "FLIGHT", "PACKAGE", "ACTIVITY", "TRANSFER", "CRUISE", "VOUCHER", "OTHER"];
const CURRENCIES = ["USD", "EUR", "SAR", "EGP"];

export default function CreateOffer() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const params = useLocalSearchParams();
    const offerId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState<'from' | 'until'>('from');

    // Form State
    const [titleEn, setTitleEn] = useState("");
    const [titleAr, setTitleAr] = useState("");
    const [descriptionEn, setDescriptionEn] = useState("");
    const [descriptionAr, setDescriptionAr] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [offerType, setOfferType] = useState("PACKAGE");
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [destination, setDestination] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [discountedPrice, setDiscountedPrice] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [discountPercentage, setDiscountPercentage] = useState("");
    const [durationDays, setDurationDays] = useState("");
    const [durationNights, setDurationNights] = useState("");
    const [validFrom, setValidFrom] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [status, setStatus] = useState("DRAFT");
    const [isFeatured, setIsFeatured] = useState(false);
    const [isHot, setIsHot] = useState(false);
    const [displayOrder, setDisplayOrder] = useState("0");
    const [includes, setIncludes] = useState("");
    const [excludes, setExcludes] = useState("");
    const [terms, setTerms] = useState("");

    // Date formatting helper
    const formatDateInput = (value: string): string => {
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + '/' + cleaned.slice(4);
        if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + '/' + cleaned.slice(7, 9);
        return cleaned.slice(0, 10);
    };

    // Date validation helper
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

    useEffect(() => {
        fetchCategories();
        if (offerId) {
            loadOfferDetails(offerId);
        }
    }, [offerId]);

    const fetchCategories = async () => {
        try {
            const data = await offersApi.getCategories(false);
            setCategories(data || []);
        } catch (e) {
            console.error("Failed to fetch categories:", e);
            setToast({ visible: true, message: t('common.errorLoadCategories') || "Failed to load categories", type: 'error' });
        }
    };

    const loadOfferDetails = async (id: string) => {
        try {
            setLoading(true);
            const offer = await offersApi.getById(id);
            if (offer) {
                setTitleEn(offer.title_en);
                setTitleAr(offer.title_ar);
                setDescriptionEn(offer.description_en || "");
                setDescriptionAr(offer.description_ar || "");
                setImageUrl(offer.image_url || "");
                setOfferType(offer.offer_type);

                // We need to resolve category object from ID if possible, or just mock it if we don't have the full list yet
                // For now we rely on fetchCategories populating the list roughly at the same time
                if (offer.category_id) {
                    // Logic to find category will be handled when categories load or we just set it if we have the list
                    // Since categories might load after, we'll try to find it in the render or use a simpler approach
                }

                setDestination(offer.destination || "");
                setOriginalPrice(offer.original_price?.toString() || "");
                setDiscountedPrice(offer.discounted_price?.toString() || "");
                setCurrency(offer.currency || "USD");
                setDurationDays(offer.duration_days?.toString() || "");
                setDurationNights(offer.duration_nights?.toString() || "");
                setValidFrom(offer.valid_from ? offer.valid_from.split('T')[0] : "");
                setValidUntil(offer.valid_until ? offer.valid_until.split('T')[0] : "");
                setStatus(offer.status);
                setIsFeatured(offer.is_featured || false);
                setIsHot(offer.is_hot || false);
                setDisplayOrder(offer.display_order?.toString() || "0");

                if (offer.includes) {
                    try {
                        const parsed = typeof offer.includes === 'string' ? JSON.parse(offer.includes) : offer.includes;
                        setIncludes(Array.isArray(parsed) ? parsed.join('\n') : (typeof parsed === 'string' ? parsed : ""));
                    } catch (e) {
                        setIncludes(Array.isArray(offer.includes) ? offer.includes.join('\n') : (typeof offer.includes === 'string' ? offer.includes : ""));
                    }
                }

                if (offer.excludes) {
                    try {
                        const parsed = typeof offer.excludes === 'string' ? JSON.parse(offer.excludes) : offer.excludes;
                        setExcludes(Array.isArray(parsed) ? parsed.join('\n') : (typeof parsed === 'string' ? parsed : ""));
                    } catch (e) {
                        setExcludes(Array.isArray(offer.excludes) ? offer.excludes.join('\n') : (typeof offer.excludes === 'string' ? offer.excludes : ""));
                    }
                }

                setTerms(offer.terms || "");
            }
        } catch (e) {
            setToast({ visible: true, message: "Failed to load offer details", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const calculateDiscount = () => {
        if (originalPrice && discountedPrice) {
            const orig = parseFloat(originalPrice);
            const disc = parseFloat(discountedPrice);
            if (orig > 0 && disc < orig) {
                const percentage = Math.round(((orig - disc) / orig) * 100);
                setDiscountPercentage(percentage.toString());
            } else {
                setDiscountPercentage("");
            }
        } else {
            setDiscountPercentage("");
        }
    };

    useEffect(() => {
        calculateDiscount();
    }, [originalPrice, discountedPrice]);

    // Update selected category once categories are loaded and if we have an offer loaded
    useEffect(() => {
        if (offerId && categories.length > 0) {
            // Find logic could go here if we tracked category_id in state
        }
    }, [categories]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            if (dateType === 'from') setValidFrom(dateStr);
            else setValidUntil(dateStr);
        }
    };

    const handleSubmit = async () => {
        if (!titleEn || !titleAr) {
            setToast({ visible: true, message: t('admin.manageOffers.errorTitleRequired') || "Please fill in title", type: 'error' });
            return;
        }
        if (!originalPrice) {
            setToast({ visible: true, message: t('admin.manageOffers.errorPriceRequired') || "Please enter original price", type: 'error' });
            return;
        }

        try {
            setSubmitting(true);

            const payload: any = {
                title_en: titleEn,
                title_ar: titleAr,
                description_en: descriptionEn || null,
                description_ar: descriptionAr || null,
                image_url: imageUrl || null,
                offer_type: offerType,
                destination: destination || null,
                original_price: parseFloat(originalPrice),
                discounted_price: discountedPrice ? parseFloat(discountedPrice) : null,
                currency: currency,
                offer_source: 'ADMIN', // Admin creates Global offers
                discount_percentage: discountPercentage ? parseInt(discountPercentage) : null,
                duration_days: durationDays ? parseInt(durationDays) : null,
                duration_nights: durationNights ? parseInt(durationNights) : null,
                valid_from: validFrom ? validFrom.replace(/\//g, '-') + 'T00:00:00Z' : null,
                valid_until: validUntil ? validUntil.replace(/\//g, '-') + 'T23:59:59Z' : null,
                status: status,
                is_featured: isFeatured,
                is_hot: isHot,
                display_order: parseInt(displayOrder) || 0,
                terms: terms || null,
                target_audience: 'ALL' // Admin creates Global offers
            };

            if (selectedCategory) {
                payload.category_id = selectedCategory.id;
                payload.category = selectedCategory.slug;
            }

            if (includes) {
                payload.includes = includes.split('\n').filter(item => item.trim());
            }
            if (excludes) {
                payload.excludes = excludes.split('\n').filter(item => item.trim());
            }

            if (offerId) {
                await offersApi.update(offerId, payload);
                setToast({ visible: true, message: t('admin.manageOffers.updateSuccess') || "Offer updated successfully", type: 'success' });
            } else {
                await offersApi.create(payload);
                setToast({ visible: true, message: t('admin.manageOffers.createSuccess'), type: 'success' });
            }

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
            <Stack.Screen options={{ title: offerId ? t('admin.manageOffers.editTitle') : t('admin.manageOffers.createTitle'), headerBackTitle: t("common.back") }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <>
                        {/* Basic Info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.basicInfo')}</Text>

                            <Text style={styles.label}>{t('admin.manageOffers.titleEn')} *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Summer Package"
                                value={titleEn}
                                onChangeText={setTitleEn}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.titleAr')} *</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.inputRTL]}
                                placeholder="مثلاً: باقة الصيف"
                                textAlign={isRTL ? 'right' : 'left'}
                                value={titleAr}
                                onChangeText={setTitleAr}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.descriptionEn')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Offer description..."
                                multiline
                                numberOfLines={3}
                                value={descriptionEn}
                                onChangeText={setDescriptionEn}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.descriptionAr')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, isRTL && styles.inputRTL]}
                                placeholder="وصف العرض..."
                                multiline
                                numberOfLines={3}
                                textAlign={isRTL ? 'right' : 'left'}
                                value={descriptionAr}
                                onChangeText={setDescriptionAr}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.imageUrl')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://example.com/image.jpg"
                                value={imageUrl}
                                onChangeText={setImageUrl}
                            />
                        </View>

                        {/* Category & Type */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.categoryAndType')}</Text>

                            <Text style={styles.label}>{t('admin.manageOffers.category')}</Text>
                            <TouchableOpacity
                                style={styles.selectBtn}
                                onPress={() => setCategoryModalVisible(true)}
                            >
                                <Text style={selectedCategory ? styles.selectText : styles.placeholderText}>
                                    {selectedCategory ? (isRTL ? selectedCategory.name_ar : selectedCategory.name_en) : t('admin.manageOffers.selectCategory')}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                            </TouchableOpacity>

                            <Text style={styles.label}>{t('admin.manageOffers.offerType')}</Text>
                            <View style={styles.typeRow}>
                                {OFFER_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeBtn,
                                            offerType === type && styles.typeBtnActive
                                        ]}
                                        onPress={() => setOfferType(type)}
                                    >
                                        <Text style={[
                                            styles.typeBtnText,
                                            offerType === type && styles.typeBtnTextActive
                                        ]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{t('admin.manageOffers.destination')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Sharm El Sheikh"
                                value={destination}
                                onChangeText={setDestination}
                            />
                        </View>

                        {/* Pricing */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.pricing')}</Text>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.label}>{t('admin.manageOffers.originalPrice')} *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="1000"
                                        keyboardType="numeric"
                                        value={originalPrice}
                                        onChangeText={setOriginalPrice}
                                    />
                                </View>
                                <View style={{ width: 100, marginLeft: 8 }}>
                                    <Text style={styles.label}>{t('common.currencyLabel')}</Text>
                                    <TouchableOpacity
                                        style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }]}
                                        onPress={() => {
                                            const currentIndex = CURRENCIES.indexOf(currency);
                                            const nextIndex = (currentIndex + 1) % CURRENCIES.length;
                                            setCurrency(CURRENCIES[nextIndex]);
                                        }}
                                    >
                                        <Text>{currency}</Text>
                                        <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.label}>{t('admin.manageOffers.discountedPrice')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="800"
                                keyboardType="numeric"
                                value={discountedPrice}
                                onChangeText={setDiscountedPrice}
                            />

                            {discountPercentage ? (
                                <View style={{ marginTop: -12, marginBottom: 12 }}>
                                    <Text style={[styles.hint, { color: COLORS.success }]}>
                                        Discount: {discountPercentage}%
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Duration & Validity */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.validity')}</Text>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.label}>{t('admin.manageOffers.durationDays')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="7"
                                        keyboardType="numeric"
                                        value={durationDays}
                                        onChangeText={setDurationDays}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.label}>{t('admin.manageOffers.durationNights')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="6"
                                        keyboardType="numeric"
                                        value={durationNights}
                                        onChangeText={setDurationNights}
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>{t('admin.manageOffers.validFrom')}</Text>
                            <View style={styles.dateInput}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]}
                                    value={validFrom}
                                    onChangeText={(text) => setValidFrom(formatDateInput(text))}
                                    placeholder="YYYY/MM/DD"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                                <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
                            </View>
                            {validFrom && !isValidDate(validFrom) && (
                                <Text style={styles.errorText}>{t('admin.manageOffers.invalidDate')}</Text>
                            )}

                            <Text style={styles.label}>{t('admin.manageOffers.validUntil')}</Text>
                            <View style={styles.dateInput}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0 }]}
                                    value={validUntil}
                                    onChangeText={(text) => setValidUntil(formatDateInput(text))}
                                    placeholder="YYYY/MM/DD"
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                                <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
                            </View>
                            {validUntil && !isValidDate(validUntil) && (
                                <Text style={styles.errorText}>{t('admin.manageOffers.invalidDate')}</Text>
                            )}
                        </View>

                        {/* Status & Display */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.statusAndDisplay')}</Text>

                            <Text style={styles.label}>{t('common.status')}</Text>
                            <View style={styles.statusRow}>
                                {['DRAFT', 'ACTIVE', 'PAUSED'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[
                                            styles.statusBtn,
                                            status === s && styles.statusBtnActive
                                        ]}
                                        onPress={() => setStatus(s)}
                                    >
                                        <Text style={[
                                            styles.statusBtnText,
                                            status === s && styles.statusBtnTextActive
                                        ]}>
                                            {s}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>{t('admin.manageOffers.featured')}</Text>
                                <Switch
                                    value={isFeatured}
                                    onValueChange={setIsFeatured}
                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>{t('admin.manageOffers.hotDeal')}</Text>
                                <Switch
                                    value={isHot}
                                    onValueChange={setIsHot}
                                    trackColor={{ false: COLORS.border, true: COLORS.warning }}
                                />
                            </View>

                            <Text style={styles.label}>{t('admin.manageOffers.displayOrder')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                keyboardType="numeric"
                                value={displayOrder}
                                onChangeText={setDisplayOrder}
                            />
                        </View>

                        {/* Additional Info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('admin.manageOffers.additionalInfo')}</Text>

                            <Text style={styles.label}>{t('admin.manageOffers.includes')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Breakfast\nWiFi\nAirport Transfer"
                                multiline
                                numberOfLines={4}
                                value={includes}
                                onChangeText={setIncludes}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.excludes')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Flights\nVisa fees"
                                multiline
                                numberOfLines={4}
                                value={excludes}
                                onChangeText={setExcludes}
                            />

                            <Text style={styles.label}>{t('admin.manageOffers.terms')}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Terms and conditions..."
                                multiline
                                numberOfLines={3}
                                value={terms}
                                onChangeText={setTerms}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitBtnText}>{offerId ? t('admin.manageOffers.submitUpdate') : t('admin.manageOffers.submitCreate')}</Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </>
                )}
            </ScrollView>

            {/* Category Selection Modal */}
            <Modal visible={categoryModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('admin.manageOffers.selectCategory')}</Text>
                        <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={categories}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.categoryItem}
                                onPress={() => {
                                    setSelectedCategory(item);
                                    setCategoryModalVisible(false);
                                }}
                            >
                                <Text style={styles.categoryName}>
                                    {isRTL ? item.name_ar : item.name_en}
                                </Text>
                                {selectedCategory?.id === item.id && (
                                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>{t('admin.manageOffers.noCategories')}</Text>
                            </View>
                        }
                    />
                </View>
            </Modal>

            {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                    value={dateType === 'from' ? (validFrom ? new Date(validFrom) : new Date()) : (validUntil ? new Date(validUntil) : new Date())}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.primary,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 6,
        fontWeight: "500",
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 16,
    },
    inputRTL: {
        textAlign: 'right',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    selectBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    selectText: {
        fontSize: 14,
        color: COLORS.text,
    },
    placeholderText: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    typeBtn: {
        paddingHorizontal: 12,
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
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.text,
    },
    typeBtnTextActive: {
        color: 'white',
    },

    statusRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    statusBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    statusBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    statusBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: COLORS.text,
    },
    statusBtnTextActive: {
        color: 'white',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    switchLabel: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    hint: {
        fontSize: 12,
        marginTop: -12,
        marginBottom: 16,
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: 'white',
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
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    categoryName: {
        fontSize: 16,
        color: COLORS.text,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        padding: 20,
    },
    emptyText: {
        color: COLORS.textLight,
        fontSize: 16,
    },
    dateInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    dateText: {
        fontSize: 14,
        color: COLORS.text
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        marginTop: -12,
        marginBottom: 12
    }
});
