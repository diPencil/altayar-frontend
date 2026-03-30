import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../src/contexts/LanguageContext';
import { adminApi } from '../../../../src/services/api';
import Toast from '../../../../src/components/Toast';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;

const COLORS = {
  primary: "#1071b8",
  secondary: "#167dc1",
  background: "#f8fafc",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

export default function MembershipBenefitsManagement() {
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>((planId as string) || '');
  const [showPlansDropdown, setShowPlansDropdown] = useState(false);
  const [showUpgradeDropdown, setShowUpgradeDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Image
    image_url: '',

    // Welcome Message
    welcome_message_en: '',
    welcome_message_ar: '',

    // Hotel Discounts & Free Night Coupons
    hotel_discounts_en: [] as any[],
    hotel_discounts_ar: [] as any[],

    // Membership Benefits (Lifetime benefits / Program coupons)
    membership_benefits_en: [] as any[],
    membership_benefits_ar: [] as any[],

    // Flight Coupons / Free Flight Terms
    flight_coupons_en: [] as any[],
    flight_coupons_ar: [] as any[],
    free_flight_terms_en: '',
    free_flight_terms_ar: '',

    // Car Rental & Airport Transfers
    car_rental_services_en: [] as any[],
    car_rental_services_ar: [] as any[],

    // Restaurant Benefits (Dinner invitations / Restaurant vouchers)
    restaurant_benefits_en: [] as any[],
    restaurant_benefits_ar: [] as any[],

    // Immediate Activation Coupons ($250, $100×10)
    immediate_coupons_en: [] as any[],
    immediate_coupons_ar: [] as any[],

    // Additional Tourism Services (Medical trips, visas, conferences, match tickets, honeymoon)
    tourism_services_en: [] as any[],
    tourism_services_ar: [] as any[],

    // Terms & Conditions
    terms_conditions_en: '',
    terms_conditions_ar: '',
    comparison_guarantee_en: '',
    comparison_guarantee_ar: '',
    availability_terms_en: '',
    availability_terms_ar: '',
    coupon_usage_terms_en: '',
    coupon_usage_terms_ar: '',

    // Upgrade Info
    upgrade_to_plan_id: '',
    upgrade_info_en: '',
    upgrade_info_ar: '',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (selectedPlanId) {
      loadPlanBenefits();
    }
  }, [selectedPlanId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllMemberships();
      console.log('📋 Loaded plans:', res);
      if (res && Array.isArray(res)) {
        console.log('✅ Plans array length:', res.length);
        // Sort plans by price (ascending)
        const sortedPlans = res.sort((a: any, b: any) => {
          const priceA = parseFloat(a.price) || 0;
          const priceB = parseFloat(b.price) || 0;
          return priceA - priceB;
        });
        setPlans(sortedPlans);
        // If planId is provided, set it as selected
        if (planId && !selectedPlanId) {
          setSelectedPlanId(planId as string);
        }
      } else {
        console.log('⚠️ Response is not an array:', res);
        setPlans([]);
      }
    } catch (error) {
      console.error('❌ Error loading plans:', error);
      setToast({ visible: true, message: t('common.error', 'Error loading plans'), type: 'error' });
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanBenefits = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getMembershipBenefits(selectedPlanId);
      if (data) {
        setFormData({
          image_url: data.image_url || '',
          welcome_message_en: data.welcome_message_en || '',
          welcome_message_ar: data.welcome_message_ar || '',
          hotel_discounts_en: data.hotel_discounts_en || [],
          hotel_discounts_ar: data.hotel_discounts_ar || [],
          membership_benefits_en: data.membership_benefits_en || [],
          membership_benefits_ar: data.membership_benefits_ar || [],
          flight_coupons_en: data.flight_coupons_en || [],
          flight_coupons_ar: data.flight_coupons_ar || [],
          free_flight_terms_en: data.free_flight_terms_en || '',
          free_flight_terms_ar: data.free_flight_terms_ar || '',
          car_rental_services_en: data.car_rental_services_en || [],
          car_rental_services_ar: data.car_rental_services_ar || [],
          restaurant_benefits_en: data.restaurant_benefits_en || [],
          restaurant_benefits_ar: data.restaurant_benefits_ar || [],
          immediate_coupons_en: data.immediate_coupons_en || [],
          immediate_coupons_ar: data.immediate_coupons_ar || [],
          tourism_services_en: data.tourism_services_en || [],
          tourism_services_ar: data.tourism_services_ar || [],
          terms_conditions_en: data.terms_conditions_en || '',
          terms_conditions_ar: data.terms_conditions_ar || '',
          comparison_guarantee_en: data.comparison_guarantee_en || '',
          comparison_guarantee_ar: data.comparison_guarantee_ar || '',
          availability_terms_en: data.availability_terms_en || '',
          availability_terms_ar: data.availability_terms_ar || '',
          coupon_usage_terms_en: data.coupon_usage_terms_en || '',
          coupon_usage_terms_ar: data.coupon_usage_terms_ar || '',
          upgrade_to_plan_id: data.upgrade_to_plan_id || '',
          upgrade_info_en: data.upgrade_info_en || '',
          upgrade_info_ar: data.upgrade_info_ar || '',
        });
      }
    } catch (error: any) {
      console.log('Error loading plan benefits:', error);
      // If 404, benefits don't exist yet - that's okay
      if (error.response?.status !== 404) {
        setToast({ visible: true, message: t('common.error', 'Error loading benefits'), type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPlanId) {
      setToast({ visible: true, message: t('admin.selectPlanFirst', 'Please select a membership plan first'), type: 'error' });
      return;
    }
    try {
      setSaving(true);
      // Prepare data for API - convert empty strings to null and ensure proper types
      const dataToSend = {
        ...formData,
        // Convert empty upgrade_to_plan_id to null
        upgrade_to_plan_id: formData.upgrade_to_plan_id || null,
        // Ensure arrays are arrays (not null/undefined)
        hotel_discounts_en: formData.hotel_discounts_en || [],
        hotel_discounts_ar: formData.hotel_discounts_ar || [],
        membership_benefits_en: formData.membership_benefits_en || [],
        membership_benefits_ar: formData.membership_benefits_ar || [],
        flight_coupons_en: formData.flight_coupons_en || [],
        flight_coupons_ar: formData.flight_coupons_ar || [],
        car_rental_services_en: formData.car_rental_services_en || [],
        car_rental_services_ar: formData.car_rental_services_ar || [],
        restaurant_benefits_en: formData.restaurant_benefits_en || [],
        restaurant_benefits_ar: formData.restaurant_benefits_ar || [],
        immediate_coupons_en: formData.immediate_coupons_en || [],
        immediate_coupons_ar: formData.immediate_coupons_ar || [],
        tourism_services_en: formData.tourism_services_en || [],
        tourism_services_ar: formData.tourism_services_ar || [],
      };
      await adminApi.updateMembershipBenefits(selectedPlanId, dataToSend);
      setToast({ visible: true, message: t('common.saveSuccess', 'Saved successfully'), type: 'success' });
      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      console.error('Error saving benefits:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('common.error', 'Error saving');
      setToast({ visible: true, message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for managing list items
  const addListItem = (key: string, lang: 'en' | 'ar') => {
    const fullKey = `${key}_${lang}`;
    setFormData(prev => ({
      ...prev,
      [fullKey]: [...(prev[fullKey as keyof typeof prev] as any[]), { title: '', description: '', value: '' }]
    }));
  };

  const updateListItem = (key: string, lang: 'en' | 'ar', index: number, field: string, value: string) => {
    const fullKey = `${key}_${lang}`;
    const items = [...(formData[fullKey as keyof typeof formData] as any[])];
    items[index] = { ...items[index], [field]: value };
    setFormData(prev => ({ ...prev, [fullKey]: items }));
  };

  const removeListItem = (key: string, lang: 'en' | 'ar', index: number) => {
    const fullKey = `${key}_${lang}`;
    const items = [...(formData[fullKey as keyof typeof formData] as any[])];
    items.splice(index, 1);
    setFormData(prev => ({ ...prev, [fullKey]: items }));
  };

  const renderListSection = (
    titleKey: string,
    title: string,
    icon: string,
    dataKey: string,
    fields: { key: string; placeholder: string; placeholderAr: string }[]
  ) => {
    const enItems = formData[`${dataKey}_en` as keyof typeof formData] as any[];
    const arItems = formData[`${dataKey}_ar` as keyof typeof formData] as any[];

    // Define icons for fields based on their key
    const getFieldIcon = (key: string) => {
      switch (key) {
        case 'title': return 'text';
        case 'description': return 'document-text';
        case 'value': return 'pricetag';
        default: return 'create';
      }
    };

    const renderItemCard = (item: any, index: number, lang: 'en' | 'ar') => (
      <View key={index} style={styles.listItemCard}>
        {/* Card Header: Index & Delete */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardIndex}>{t("common.numberWithHash", { number: index + 1 })}</Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeListItem(dataKey, lang, index)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Card Body: Form Inputs */}
        <View style={styles.cardContent}>

          {/* Title and Value in one row */}
          <View style={[styles.titleValueRow]}>
            {/* Title Input */}
            <View style={styles.titleInputGroup}>
              <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
                {lang === 'en' ? t("common.title", { lng: "en" }) : t("common.title", { lng: "ar" })}
              </Text>
              <TextInput
                style={[styles.textInput, isRTL && styles.textRTL]}
                value={item['title'] || ''}
                onChangeText={(text) => updateListItem(dataKey, lang, index, 'title', text)}
                placeholder={lang === 'en' ? 'Ex: Welcome Gift' : 'مثال: هدية ترحيبية'}
                textAlign={isRTL && lang === 'ar' ? 'right' : 'left'}
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Value Input */}
            <View style={styles.valueInputGroup}>
              <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
                {lang === 'en' ? t("common.value", { lng: "en" }) : t("common.value", { lng: "ar" })}
              </Text>
              <View style={[styles.valueInputWrapper]}>
                <TextInput
                  style={[styles.valueInput, isRTL && styles.textRTL]}
                  value={item['value'] || ''}
                  onChangeText={(text) => updateListItem(dataKey, lang, index, 'value', text)}
                  placeholder={lang === 'en' ? '20' : '20'}
                  textAlign={isRTL && lang === 'ar' ? 'right' : 'left'}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                />
                <Text style={styles.valueSuffix}>{t("common.percentSymbol")}</Text>
              </View>
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
              {lang === 'en' ? fields[1].placeholder : fields[1].placeholderAr}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea, isRTL && styles.textRTL]}
              value={item['description'] || ''}
              onChangeText={(text) => updateListItem(dataKey, lang, index, 'description', text)}
              placeholder={lang === 'en' ? 'Enter detailed description...' : 'أدخل وصفاً تفصيلياً...'}
              multiline
              numberOfLines={3}
              textAlign={isRTL && lang === 'ar' ? 'right' : 'left'}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

        </View>
      </View>
    );

    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader]}>
          <View style={[styles.iconBox, { backgroundColor: `${COLORS.primary}15` }]}>
            <Ionicons name={icon as any} size={24} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {title}
          </Text>
        </View>

        {/* English Section */}
        <View style={styles.langSection}>
          <View style={[styles.langHeader]}>
            <Text style={[styles.langLabel, { marginBottom: 0 }]}>{t("common.english", { lng: "en" })}</Text>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{t("common.langCode.en")}</Text>
            </View>
          </View>
          {enItems.map((item, index) => renderItemCard(item, index, 'en'))}
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => addListItem(dataKey, 'en')}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.addItemText}>{t("common.addItem", { lng: "en" })}</Text>
          </TouchableOpacity>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Arabic Section */}
        <View style={styles.langSection}>
          <View style={[styles.langHeader]}>
            <Text style={[styles.langLabel, { marginBottom: 0 }]}>{t("common.arabic", { lng: "ar" })}</Text>
            <View style={[styles.langBadge, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.langBadgeText, { color: '#059669' }]}>{t("common.langCode.ar")}</Text>
            </View>
          </View>
          {arItems.map((item, index) => renderItemCard(item, index, 'ar'))}
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => addListItem(dataKey, 'ar')}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.addItemText}>{t("common.addItem", { lng: "ar" })}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTextAreaSection = (
    title: string,
    icon: string,
    enKey: string,
    arKey: string,
    placeholderEn: string,
    placeholderAr: string
  ) => {
    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader]}>
          <Ionicons name={icon as any} size={24} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {title}
          </Text>
        </View>

        <View style={styles.langSection}>
          <Text style={[styles.langLabel, isRTL && styles.textRTL]}>{t("common.english", { lng: "en" })}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, isRTL && styles.textRTL]}
            value={formData[enKey as keyof typeof formData] as string}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [enKey]: text }))}
            placeholder={placeholderEn}
            multiline
            numberOfLines={6}
          />
        </View>

        <View style={styles.langSection}>
          <Text style={[styles.langLabel, isRTL && styles.textRTL]}>{t("common.arabic", { lng: "ar" })}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, isRTL && styles.textRTL]}
            value={formData[arKey as keyof typeof formData] as string}
            onChangeText={(text) => setFormData(prev => ({ ...prev, [arKey]: text }))}
            placeholder={placeholderAr}
            multiline
            numberOfLines={6}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
      </View>
    );
  };

  if (loading && !selectedPlanId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t('admin.membershipBenefits', 'Membership Benefits')}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.save', 'Save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Selection */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader]}>
            <Ionicons name="diamond" size={24} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('admin.selectMembershipPlan', 'Select Membership Plan')}
            </Text>
          </View>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={[styles.pickerWrapper]}
              onPress={() => setShowPlansDropdown(!showPlansDropdown)}
            >
              <Ionicons name="diamond-outline" size={20} color={COLORS.textLight} style={[styles.pickerIcon, isRTL && styles.pickerIconRTL]} />
              <View style={styles.picker}>
                <Text style={[styles.pickerLabel, isRTL && styles.textRTL]}>
                  {selectedPlanId
                    ? (() => {
                      const selectedPlan = plans.find(p => p.id === selectedPlanId);
                      if (!selectedPlan) return 'Select Plan';
                      const planName = language === 'ar'
                        ? (selectedPlan.tier_name_ar || selectedPlan.plan_name_ar || selectedPlan.name_ar)
                        : (selectedPlan.tier_name_en || selectedPlan.plan_name_en || selectedPlan.name_en);
                      return planName || selectedPlan.tier_name_en || selectedPlan.tier_name_ar || selectedPlan.plan_name_en || selectedPlan.plan_name_ar || selectedPlan.name || selectedPlan.tier_code || 'Select Plan';
                    })()
                    : t('admin.selectPlan', 'Select a membership plan')
                  }
                </Text>
              </View>
              <Ionicons
                name={showPlansDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
            {showPlansDropdown && plans.length > 0 && (
              <View style={styles.plansDropdown}>
                <ScrollView style={styles.plansDropdownScroll} nestedScrollEnabled>
                  {plans.map((plan) => {
                    const planName = language === 'ar'
                      ? (plan.tier_name_ar || plan.plan_name_ar || plan.name_ar)
                      : (plan.tier_name_en || plan.plan_name_en || plan.name_en);
                    const displayName = planName || plan.tier_name_en || plan.tier_name_ar || plan.plan_name_en || plan.plan_name_ar || plan.name || plan.tier_code || 'Unnamed Plan';
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planOption,
                          isSelected && styles.planOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedPlanId(plan.id);
                          setShowPlansDropdown(false);
                        }}
                      >
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color={isSelected ? COLORS.primary : COLORS.textLight}
                        />
                        <Text style={[
                          styles.planOptionText,
                          isSelected && styles.planOptionTextSelected,
                          isRTL && styles.textRTL
                        ]}>
                          {displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {showPlansDropdown && plans.length === 0 && (
              <View style={styles.plansDropdown}>
                <View style={styles.emptyPlansState}>
                  <Text style={[styles.emptyPlansText, isRTL && styles.textRTL]}>
                    {t('admin.noPlansAvailable', 'No membership plans available')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader]}>
            <Ionicons name="image" size={24} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('common.imageUrl', 'Image URL')}
            </Text>
          </View>
          <TextInput
            style={[styles.textInput, isRTL && styles.textRTL]}
            value={formData.image_url}
            onChangeText={(text) => setFormData(prev => ({ ...prev, image_url: text }))}
            placeholder="https://example.com/image.jpg"
            autoCapitalize="none"
            keyboardType="url"
          />
          {formData.image_url ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: formData.image_url }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </View>

        {/* Welcome Message */}
        {renderTextAreaSection(
          t('admin.welcomeMessage', 'Welcome Message'),
          'heart',
          'welcome_message_en',
          'welcome_message_ar',
          'Enter welcome message...',
          'أدخل رسالة الترحيب...'
        )}

        {/* Hotel Discounts & Free Night Coupons */}
        {renderListSection(
          'hotelDiscounts',
          t('admin.hotelDiscounts', 'Hotel Discounts & Free Night Coupons'),
          'bed',
          'hotel_discounts',
          [
            { key: 'title', placeholder: 'Discount/Coupon Title', placeholderAr: 'عنوان الخصم/الكوبون' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Value (e.g., 20% or Free Night)', placeholderAr: 'القيمة (مثال: 20% أو ليلة مجانية)' }
          ]
        )}

        {/* Membership Benefits (Lifetime benefits / Program coupons) */}
        {renderListSection(
          'membershipBenefits',
          t('admin.membershipBenefitsLifetime', 'Membership Benefits (Lifetime / Program Coupons)'),
          'diamond',
          'membership_benefits',
          [
            { key: 'title', placeholder: 'Benefit Title', placeholderAr: 'عنوان الميزة' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Value or Coupon Code', placeholderAr: 'القيمة أو رمز الكوبون' }
          ]
        )}

        {/* Flight Coupons */}
        {renderListSection(
          'flightCoupons',
          t('admin.flightCoupons', 'Flight Coupons'),
          'airplane',
          'flight_coupons',
          [
            { key: 'title', placeholder: 'Coupon Title', placeholderAr: 'عنوان الكوبون' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Value or Terms', placeholderAr: 'القيمة أو الشروط' }
          ]
        )}

        {/* Free Flight Terms */}
        {renderTextAreaSection(
          t('admin.freeFlightTerms', 'Free Flight Terms & Conditions'),
          'document-text',
          'free_flight_terms_en',
          'free_flight_terms_ar',
          'Enter terms for free flight eligibility...',
          'أدخل شروط الحصول على تذاكر مجانية...'
        )}

        {/* Car Rental & Airport Transfers */}
        {renderListSection(
          'carRental',
          t('admin.carRentalTransfers', 'Car Rental & Airport Transfers'),
          'car',
          'car_rental_services',
          [
            { key: 'title', placeholder: 'Service Title', placeholderAr: 'عنوان الخدمة' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Discount or Terms', placeholderAr: 'الخصم أو الشروط' }
          ]
        )}

        {/* Restaurant Benefits */}
        {renderListSection(
          'restaurantBenefits',
          t('admin.restaurantBenefits', 'Restaurant Benefits (Dinner Invitations / Vouchers)'),
          'restaurant',
          'restaurant_benefits',
          [
            { key: 'title', placeholder: 'Benefit Title', placeholderAr: 'عنوان الميزة' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Voucher Value or Terms', placeholderAr: 'قيمة القسيمة أو الشروط' }
          ]
        )}

        {/* Immediate Activation Coupons */}
        {renderListSection(
          'immediateCoupons',
          t('admin.immediateCoupons', 'Immediate Activation Coupons ($250, $100×10)'),
          'flash',
          'immediate_coupons',
          [
            { key: 'title', placeholder: 'Coupon Title (e.g., $250 Welcome)', placeholderAr: 'عنوان الكوبون (مثال: 250$ ترحيبي)' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Value (e.g., $250 or $100×10)', placeholderAr: 'القيمة (مثال: 250$ أو 100$×10)' }
          ]
        )}

        {/* Additional Tourism Services */}
        {renderListSection(
          'tourismServices',
          t('admin.tourismServices', 'Additional Tourism Services (Medical trips, visas, conferences, match tickets, honeymoon)'),
          'map',
          'tourism_services',
          [
            { key: 'title', placeholder: 'Service Title', placeholderAr: 'عنوان الخدمة' },
            { key: 'description', placeholder: 'Description', placeholderAr: 'الوصف' },
            { key: 'value', placeholder: 'Terms or Benefits', placeholderAr: 'الشروط أو المزايا' }
          ]
        )}

        {/* Terms & Conditions */}
        {renderTextAreaSection(
          t('admin.termsConditions', 'Terms & Conditions'),
          'document-text',
          'terms_conditions_en',
          'terms_conditions_ar',
          'Enter general terms and conditions...',
          'أدخل الشروط والأحكام العامة...'
        )}

        {/* Comparison / Best Price Guarantee */}
        {renderTextAreaSection(
          t('admin.comparisonGuarantee', 'Comparison / Best Price Guarantee'),
          'shield-checkmark',
          'comparison_guarantee_en',
          'comparison_guarantee_ar',
          'Enter comparison and best price guarantee terms...',
          'أدخل شروط المقارنة وضمان أفضل سعر...'
        )}

        {/* Availability Terms */}
        {renderTextAreaSection(
          t('admin.availabilityTerms', 'Availability Terms'),
          'calendar',
          'availability_terms_en',
          'availability_terms_ar',
          'Enter availability terms...',
          'أدخل شروط التوافر...'
        )}

        {/* Coupon Usage Terms */}
        {renderTextAreaSection(
          t('admin.couponUsageTerms', 'Coupon Usage Terms'),
          'ticket',
          'coupon_usage_terms_en',
          'coupon_usage_terms_ar',
          'Enter coupon usage terms and conditions...',
          'أدخل شروط استخدام الكوبونات...'
        )}

        {/* Upgrade Information */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader]}>
            <Ionicons name="trending-up" size={24} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('admin.upgradeInfo', 'Upgrade Information')}
            </Text>
          </View>

          {/* Current Plan Display */}
          {selectedPlanId && (() => {
            const currentPlan = plans.find(p => p.id === selectedPlanId);
            if (currentPlan) {
              const currentPlanName = language === 'ar'
                ? (currentPlan.tier_name_ar || currentPlan.plan_name_ar || currentPlan.name_ar)
                : (currentPlan.tier_name_en || currentPlan.plan_name_en || currentPlan.name_en);
              const displayCurrentName = currentPlanName || currentPlan.tier_name_en || currentPlan.tier_name_ar || currentPlan.plan_name_en || currentPlan.plan_name_ar || currentPlan.name || currentPlan.tier_code || 'Current Plan';

              return (
                <View style={[styles.currentPlanCard, isRTL && styles.currentPlanCardRTL]}>
                  <View style={[styles.currentPlanBadgeContainer]}>
                    <View style={[styles.currentPlanBadgeItem, { backgroundColor: COLORS.background }]}>
                      <Ionicons name="diamond" size={18} color={COLORS.primary} />
                      <View style={styles.currentPlanBadgeTextContainer}>
                        <Text style={[styles.currentPlanBadgeLabel, isRTL && styles.textRTL]}>
                          {isRTL ? 'العضوية الحالية' : 'Current'}
                        </Text>
                        <Text style={[styles.currentPlanBadgeName, isRTL && styles.textRTL]} numberOfLines={1} ellipsizeMode="tail">
                          {displayCurrentName}
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isRTL ? "arrow-back" : "arrow-forward"}
                      size={18}
                      color={COLORS.textLight}
                      style={styles.upgradeArrow}
                    />

                    {formData.upgrade_to_plan_id ? (() => {
                      const upgradePlan = plans.find(p => p.id === formData.upgrade_to_plan_id);
                      if (upgradePlan) {
                        const upgradePlanName = language === 'ar'
                          ? (upgradePlan.tier_name_ar || upgradePlan.plan_name_ar || upgradePlan.name_ar)
                          : (upgradePlan.tier_name_en || upgradePlan.plan_name_en || upgradePlan.name_en);
                        const displayUpgradeName = upgradePlanName || upgradePlan.tier_name_en || upgradePlan.tier_name_ar || upgradePlan.plan_name_en || upgradePlan.plan_name_ar || upgradePlan.name || upgradePlan.tier_code || 'Upgrade Plan';

                        return (
                          <View style={[styles.upgradePlanBadgeItem, { backgroundColor: COLORS.primary }]}>
                            <Ionicons name="trending-up" size={18} color="#ffffff" />
                            <View style={styles.upgradePlanBadgeTextContainer}>
                              <Text style={[styles.upgradePlanBadgeLabel, isRTL && styles.textRTL]}>
                                {isRTL ? 'الترقية إلى' : 'Upgrade To'}
                              </Text>
                              <Text style={[styles.upgradePlanBadgeName, isRTL && styles.textRTL]} numberOfLines={1} ellipsizeMode="tail">
                                {displayUpgradeName}
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })() : (
                      <View style={[styles.upgradePlanBadgeItem, { backgroundColor: COLORS.border }]}>
                        <Ionicons name="trending-up" size={18} color={COLORS.textLight} />
                        <View style={styles.upgradePlanBadgeTextContainer}>
                          <Text style={[styles.upgradePlanBadgeLabel, isRTL && styles.textRTL, { color: COLORS.textLight }]}>
                            {isRTL ? 'اختر العضوية' : 'Select Plan'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            }
            return null;
          })()}

          {/* Select Upgrade To Plan */}
          <View style={styles.langSection}>
            <Text style={[styles.langLabel, isRTL && styles.textRTL]}>
              {t('admin.upgradeToPlan', 'Upgrade To Plan')}
            </Text>
            <TouchableOpacity
              style={[styles.pickerWrapper]}
              onPress={() => setShowUpgradeDropdown(!showUpgradeDropdown)}
            >
              <Ionicons name="diamond-outline" size={20} color={COLORS.textLight} style={[styles.pickerIcon, isRTL && styles.pickerIconRTL]} />
              <View style={styles.picker}>
                <Text style={[styles.pickerLabel, isRTL && styles.textRTL]}>
                  {formData.upgrade_to_plan_id
                    ? (() => {
                      const upgradePlan = plans.find(p => p.id === formData.upgrade_to_plan_id);
                      if (!upgradePlan) return 'Select Plan';
                      const planName = language === 'ar'
                        ? (upgradePlan.tier_name_ar || upgradePlan.plan_name_ar || upgradePlan.name_ar)
                        : (upgradePlan.tier_name_en || upgradePlan.plan_name_en || upgradePlan.name_en);
                      return planName || upgradePlan.tier_name_en || upgradePlan.tier_name_ar || upgradePlan.plan_name_en || upgradePlan.plan_name_ar || upgradePlan.name || upgradePlan.tier_code || 'Select Plan';
                    })()
                    : t('admin.selectUpgradePlan', 'Select upgrade plan')
                  }
                </Text>
              </View>
              <Ionicons
                name={showUpgradeDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
            {showUpgradeDropdown && plans.length > 0 && (
              <View style={styles.plansDropdown}>
                <ScrollView style={styles.plansDropdownScroll} nestedScrollEnabled>
                  {plans
                    .filter(plan => plan.id !== selectedPlanId) // Exclude current plan
                    .map((plan) => {
                      const planName = language === 'ar'
                        ? (plan.tier_name_ar || plan.plan_name_ar || plan.name_ar)
                        : (plan.tier_name_en || plan.plan_name_en || plan.name_en);
                      const displayName = planName || plan.tier_name_en || plan.tier_name_ar || plan.plan_name_en || plan.plan_name_ar || plan.name || plan.tier_code || 'Unnamed Plan';
                      const isSelected = formData.upgrade_to_plan_id === plan.id;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          style={[
                            styles.planOption,
                            isSelected && styles.planOptionSelected
                          ]}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, upgrade_to_plan_id: plan.id }));
                            setShowUpgradeDropdown(false);
                          }}
                        >
                          <Ionicons
                            name={isSelected ? "radio-button-on" : "radio-button-off"}
                            size={20}
                            color={isSelected ? COLORS.primary : COLORS.textLight}
                          />
                          <Text style={[
                            styles.planOptionText,
                            isSelected && styles.planOptionTextSelected,
                            isRTL && styles.textRTL
                          ]}>
                            {displayName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Upgrade Description */}
          <View style={styles.langSection}>
            <Text style={[styles.langLabel, isRTL && styles.textRTL]}>{t("common.english", { lng: "en" })}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, isRTL && styles.textRTL]}
              value={formData.upgrade_info_en}
              onChangeText={(text) => setFormData(prev => ({ ...prev, upgrade_info_en: text }))}
              placeholder="Enter upgrade description..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.langSection}>
            <Text style={[styles.langLabel, isRTL && styles.textRTL]}>{t("common.arabic", { lng: "ar" })}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, isRTL && styles.textRTL]}
              value={formData.upgrade_info_ar}
              onChangeText={(text) => setFormData(prev => ({ ...prev, upgrade_info_ar: text }))}
              placeholder="أدخل وصف الترقية..."
              multiline
              numberOfLines={4}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 10 : 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backBtn: {
    padding: isSmallScreen ? 6 : 8,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginHorizontal: isSmallScreen ? 8 : 12,
  },
  saveBtn: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: 'white',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? 12 : 16,
  },
  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: isSmallScreen ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 16 : 20,
    gap: isSmallScreen ? 10 : 12,
  },

  sectionTitle: {
    fontSize: isSmallScreen ? 16 : isMediumScreen ? 17 : 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  langSection: {
    marginBottom: isSmallScreen ? 20 : 24,
  },
  langLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: isSmallScreen ? 10 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 10 : 12,
    fontSize: isSmallScreen ? 13 : 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: isSmallScreen ? 100 : 120,
    textAlignVertical: 'top',
  },
  removeBtn: {
    padding: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
  },
  langBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  pickerContainer: {
    marginTop: 12,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pickerIcon: {
    marginEnd: 12,
  },
  pickerIconRTL: {
    marginEnd: 0,
    marginStart: 12,
  },
  picker: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  titleValueRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  titleInputGroup: {
    flex: 1,
  },
  valueInputGroup: {
    width: 100,
  },
  valueInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    height: 44,
  },

  valueInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
    minWidth: 0,
  },
  valueSuffix: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginStart: 6,
  },
  listItemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: isSmallScreen ? 10 : 12,
    marginBottom: isSmallScreen ? 12 : 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  cardContent: {
    padding: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  plansDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: isSmallScreen ? 10 : 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: isSmallScreen ? 250 : 300,
  },
  plansDropdownScroll: {
    maxHeight: isSmallScreen ? 250 : 300,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: isSmallScreen ? 10 : 12,
  },

  planOptionSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  planOptionText: {
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14,
    color: COLORS.text,
  },
  planOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyPlansState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyPlansText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: {
    width: '100%',
    height: isSmallScreen ? 160 : 200,
    backgroundColor: COLORS.background,
  },
  textRTL: {
    textAlign: 'right',
  },
  currentPlanCard: {
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 16 : 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  currentPlanCardRTL: {
    // No change needed
  },
  currentPlanBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 6 : 10,
    width: '100%',
  },

  currentPlanBadgeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 8 : 10,
    gap: isSmallScreen ? 8 : 10,
    minWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  upgradePlanBadgeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 10 : 12,
    borderRadius: isSmallScreen ? 8 : 10,
    gap: isSmallScreen ? 8 : 10,
    minWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentPlanBadgeTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  upgradePlanBadgeTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  currentPlanBadgeLabel: {
    fontSize: isSmallScreen ? 10 : 11,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  currentPlanBadgeName: {
    fontSize: isSmallScreen ? 12 : 13,
    color: COLORS.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  upgradePlanBadgeLabel: {
    fontSize: isSmallScreen ? 10 : 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 2,
  },
  upgradePlanBadgeName: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#ffffff',
    fontWeight: '700',
    flexShrink: 1,
  },
  upgradeArrow: {
    marginHorizontal: isSmallScreen ? 4 : 8,
  },
});
