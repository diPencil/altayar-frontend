import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { adminApi, offersApi, Category } from "../../../src/services/api";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import Toast from "../../../src/components/Toast";
import ConfirmModal from "../../../src/components/ConfirmModal";

const COLORS = {
  primary: "#0891b2",
  background: "#f0f9ff",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  border: "#e2e8f0",
  purple: "#8b5cf6",
};

export default function CreateAdminMarketingOffer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"offer" | "broadcast" | "voucher" | "discount">("offer");

  const targetingOptions = [
    { key: "ALL", label: t("offers.targetAll", "All users"), icon: "people" },
    { key: "ASSIGNED", label: t("offers.targetAssigned", "Assigned"), icon: "person" },
    { key: "SPECIFIC", label: t("offers.targetSpecific", "Specific"), icon: "options" },
  ];

  const [formData, setFormData] = useState({
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
    original_price: "",
    discounted_price: "",
    offer_type: (params.type as string) || "PACKAGE",
    image: null as string | null,
    target_audience: "SPECIFIC",
    target_user_ids: [] as string[],
    currency: "USD",
    category_id: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [dates, setDates] = useState({ valid_from: "", valid_until: "" });

  const [showUserModal, setShowUserModal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [deleteModal, setDeleteModal] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await offersApi.getCategories(true);
      setCategories(data);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (params.id) {
      const fetchOffer = async () => {
        try {
          setLoading(true);
          const offer = await offersApi.getById(params.id as string);

          if (offer.offer_type === "VOUCHER") setMode("voucher");
          else if (offer.offer_type === "DISCOUNT") setMode("discount");
          else if (offer.offer_type === "OTHER" || offer.offer_type === "BROADCAST") setMode("broadcast");
          else setMode("offer");

          setFormData({
            title_ar: offer.title_ar,
            title_en: offer.title_en,
            description_ar: offer.description_ar || "",
            description_en: offer.description_en || "",
            original_price: offer.original_price?.toString?.() ?? "",
            discounted_price: offer.discounted_price ? offer.discounted_price.toString() : "",
            offer_type: offer.offer_type,
            image: offer.image_url || null,
            target_audience: (offer.target_audience as any) || "SPECIFIC",
            target_user_ids: offer.target_user_ids
              ? Array.isArray(offer.target_user_ids)
                ? offer.target_user_ids
                : []
              : [],
            currency: offer.currency,
            category_id: offer.category_id || "",
          });

          setDates({
            valid_from: offer.valid_from
              ? new Date(offer.valid_from).toISOString().split("T")[0].replace(/-/g, "/")
              : "",
            valid_until: offer.valid_until
              ? new Date(offer.valid_until).toISOString().split("T")[0].replace(/-/g, "/")
              : "",
          });

          if (offer.target_user_ids) {
            const ids = Array.isArray(offer.target_user_ids) ? offer.target_user_ids : [];
            setSelectedUsers(new Set(ids));
          }
        } catch {
          Alert.alert(t("common.error", "Error"), t("offers.messages.failedLoad", "Failed to load"));
        } finally {
          setLoading(false);
        }
      };
      fetchOffer();
      return;
    }

    if (params.type) {
      setFormData((prev) => ({ ...prev, offer_type: params.type as string }));
    }
    if (params.voucher === "true") {
      setMode("voucher");
      setFormData((prev) => ({
        ...prev,
        title_en: t("offers.messages.specialVoucher", "Special voucher"),
        title_ar: t("offers.messages.specialVoucherAr", "قسيمة خاصة"),
        offer_type: "VOUCHER",
      }));
    } else if (params.broadcast === "true") {
      setMode("broadcast");
      setFormData((prev) => ({
        ...prev,
        offer_type: "BROADCAST",
        original_price: "1",
        target_audience: "SPECIFIC",
      }));
    } else if (params.discount === "true") {
      setMode("discount");
    } else {
      setMode("offer");
    }
  }, [params.id, params.type, params.voucher, params.broadcast, params.discount, t]);

  const formatDateInput = (value: string): string => {
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + "/" + cleaned.slice(4);
    if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + "/" + cleaned.slice(7, 9);
    return cleaned.slice(0, 10);
  };

  const isValidDate = (date: string): boolean => {
    if (!date || date.length !== 10) return false;
    const parts = date.split("/");
    if (parts.length !== 3) return false;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    return true;
  };

  // Backend expects a full datetime (not just YYYY-MM-DD)
  const toIsoDateTime = (date: string, endOfDay: boolean): string => {
    const normalized = date.replace(/\//g, "-"); // YYYY-MM-DD
    return endOfDay ? `${normalized}T23:59:59` : `${normalized}T00:00:00`;
  };

  const fetchUsersForSelection = async () => {
    try {
      setUsersLoading(true);
      const res = await adminApi.getAllUsers({ role: "CUSTOMER", limit: 100 });
      setUsersList(res.users || []);
    } catch (e) {
      console.log(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleUserSelection = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const handleSave = async () => {
    if (!formData.title_en || !formData.original_price) {
      Alert.alert(t("common.error", "Error"), t("common.fillRequired", "Please fill required fields"));
      return;
    }

    if (dates.valid_from && !isValidDate(dates.valid_from)) {
      Alert.alert(t("common.error", "Error"), t("common.invalidDate", "Invalid Date"));
      return;
    }
    if (dates.valid_until && !isValidDate(dates.valid_until)) {
      Alert.alert(t("common.error", "Error"), t("common.invalidDate", "Invalid Date"));
      return;
    }

    try {
      setLoading(true);

      const selectedCategory = categories.find((c) => c.id === formData.category_id);

      const payload: any = {
        title_ar: formData.title_ar || formData.title_en,
        title_en: formData.title_en,
        description_ar: formData.description_ar,
        description_en: formData.description_en,
        original_price: parseFloat(formData.original_price),
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : undefined,
        offer_type: formData.offer_type,
        category_id: formData.category_id || undefined,
        category: selectedCategory ? selectedCategory.name_en : undefined,
        image_url: formData.image,
        valid_from: dates.valid_from ? toIsoDateTime(dates.valid_from, false) : undefined,
        valid_until: dates.valid_until ? toIsoDateTime(dates.valid_until, true) : undefined,
        status: "ACTIVE",
        currency: formData.currency,
        target_audience: formData.target_audience,
        target_user_ids: Array.from(selectedUsers),
        offer_source: "MARKETING",
      };

      if (params.id) {
        await offersApi.update(params.id as string, payload);
        router.replace("/(admin)/admin-marketing?toast=updated" as any);
      } else {
        await offersApi.create(payload);
        router.replace("/(admin)/admin-marketing?toast=created" as any);
      }
    } catch (e: any) {
      const msg = e?.message || t("offers.messages.failed", "Failed");
      setToast({ visible: true, message: msg, type: "error" });
      Alert.alert(t("common.error", "Error"), msg);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal(false);
      setLoading(true);
      await offersApi.delete(params.id as string);
      router.replace("/(admin)/admin-marketing?toast=deleted" as any);
    } catch (e: any) {
      const msg = e?.message || t("common.errorOccurred", "Error occurred");
      setToast({ visible: true, message: msg, type: "error" });
      Alert.alert(t("common.error", "Error"), msg);
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    switch (mode) {
      case "broadcast":
        return t("offers.broadcastTitle", "Broadcast");
      case "voucher":
        return t("offers.voucherTitle", "Voucher");
      case "discount":
        return t("offers.discountTitle", "Discount");
      default:
        return t("offers.createTitle", "Create");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? "right" : "left" }]}>{getPageTitle()}</Text>
        {params.id ? (
          <TouchableOpacity
            onPress={() => setDeleteModal(true)}
            style={{ padding: 8, opacity: loading ? 0.5 : 1 }}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{t("common.imageUrl", "Image URL")}</Text>
          <TextInput
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            value={formData.image || ""}
            onChangeText={(v) => setFormData({ ...formData, image: v })}
            placeholder="https://example.com/image.jpg"
            autoCapitalize="none"
          />
          {formData.image ? (
            <Image
              source={{ uri: formData.image }}
              style={[styles.previewImage, { height: 200, borderRadius: 12, marginTop: 10 }]}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>
            {mode === "broadcast" ? t("common.messageTitle", "Title") : t("common.titleEn", "Title (EN)")} *
          </Text>
          <TextInput
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
            value={formData.title_en}
            onChangeText={(v) => setFormData({ ...formData, title_en: v })}
            placeholder={t("offers.placeholders.offerTitle", "Offer title")}
          />

          {mode === "offer" && (
            <>
              <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{t("offers.category", "Category")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15, flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setFormData({ ...formData, category_id: cat.id })}
                    style={[styles.pill, formData.category_id === cat.id && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, formData.category_id === cat.id && styles.pillTextActive]}>
                      {isRTL ? cat.name_ar : cat.name_en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>
            {mode === "broadcast" ? t("common.messageBody", "Message") : t("common.descriptionEn", "Description (EN)")}
          </Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top", textAlign: isRTL ? "right" : "left" }]}
            value={formData.description_en}
            onChangeText={(v) => setFormData({ ...formData, description_en: v })}
            multiline
            placeholder={t("offers.placeholders.description", "Description")}
          />
        </View>

        {mode !== "broadcast" && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{t("offers.originalPrice", "Original price")} *</Text>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
                  value={formData.original_price}
                  onChangeText={(v) => setFormData({ ...formData, original_price: v })}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{t("offers.currency", "Currency")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                  {["USD", "SAR", "EGP", "EUR"].map((curr) => (
                    <TouchableOpacity
                      key={curr}
                      onPress={() => setFormData({ ...formData, currency: curr })}
                      style={[styles.currencyPill, formData.currency === curr && styles.currencyPillActive]}
                    >
                      <Text style={[styles.currencyText, formData.currency === curr && styles.currencyTextActive]}>{curr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { textAlign: isRTL ? "right" : "left" }]}>{t("offers.discountedPrice", "Discounted price")}</Text>
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
                  value={formData.discounted_price}
                  onChangeText={(v) => setFormData({ ...formData, discounted_price: v })}
                  keyboardType="numeric"
                  placeholder={t("offers.placeholders.optional", "Optional")}
                />
              </View>
            </View>
          </View>
        )}

        {mode !== "broadcast" && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t("offers.validity", "Validity")}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.dateLabel}>{t("common.validFrom", "Valid From")}</Text>
                <TextInput
                  style={styles.input}
                  value={dates.valid_from}
                  onChangeText={(text) => setDates((prev) => ({ ...prev, valid_from: formatDateInput(text) }))}
                  placeholder="YYYY/MM/DD"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {dates.valid_from && !isValidDate(dates.valid_from) && <Text style={styles.errorText}>{t("common.invalidDate")}</Text>}
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.dateLabel}>{t("common.validUntil", "Valid Until")}</Text>
                <TextInput
                  style={styles.input}
                  value={dates.valid_until}
                  onChangeText={(text) => setDates((prev) => ({ ...prev, valid_until: formatDateInput(text) }))}
                  placeholder="YYYY/MM/DD"
                  keyboardType="numeric"
                  maxLength={10}
                />
                {dates.valid_until && !isValidDate(dates.valid_until) && <Text style={styles.errorText}>{t("common.invalidDate")}</Text>}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>{t("offers.targeting", "Targeting")}</Text>
          <View style={styles.targetingOptions}>
            {targetingOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.targetOption,
                  formData.target_audience === opt.key && styles.targetOptionActive,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
                onPress={() => {
                  setFormData((prev) => ({ ...prev, target_audience: opt.key as any }));
                  if (opt.key === "SPECIFIC") {
                    fetchUsersForSelection();
                    setShowUserModal(true);
                  }
                }}
              >
                <Ionicons name={opt.icon as any} size={20} color={formData.target_audience === opt.key ? COLORS.primary : COLORS.textLight} />
                <Text
                  style={[
                    styles.targetText,
                    formData.target_audience === opt.key && styles.targetTextActive,
                    { [isRTL ? "marginRight" : "marginLeft"]: 10, textAlign: isRTL ? "right" : "left" } as any,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{t("common.create", "Create")}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showUserModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUserModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("offers.selection.selectTitle", "Select users")}</Text>
            <TouchableOpacity onPress={() => setShowUserModal(false)}>
              <Text style={{ color: COLORS.primary, fontSize: 16 }}>{t("offers.selection.done", "Done")}</Text>
            </TouchableOpacity>
          </View>

          {usersLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 15 }}>
              {usersList.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userItem, selectedUsers.has(u.id) && styles.userItemActive, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  onPress={() => toggleUserSelection(u.id)}
                >
                  <View style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
                    <Text style={[styles.userName, { textAlign: isRTL ? "right" : "left" }]}>{u.first_name} {u.last_name}</Text>
                    <Text style={[styles.userEmail, { textAlign: isRTL ? "right" : "left" }]}>{u.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type as any} onHide={() => setToast((prev) => ({ ...prev, visible: false }))} />

      <ConfirmModal
        visible={deleteModal}
        title={t("common.delete", "Delete")}
        message={t("common.confirmDelete", "Are you sure you want to delete this item?")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(false)}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: "space-between",
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, flex: 1, textAlign: "center" },
  content: { padding: 20 },
  previewImage: { width: "100%", height: "100%" },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  targetingOptions: { gap: 10 },
  targetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetOptionActive: { borderColor: COLORS.primary, backgroundColor: "#eff6ff" },
  targetText: { marginLeft: 10, fontSize: 15, color: COLORS.text, fontWeight: "500" },
  targetTextActive: { color: COLORS.primary, fontWeight: "700" },
  modalContainer: { flex: 1, backgroundColor: "#fff", marginTop: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  userItemActive: { backgroundColor: "#f0f9ff" },
  userName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  userEmail: { fontSize: 12, color: COLORS.textLight },
  dateLabel: { fontSize: 12, color: COLORS.textLight },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { color: COLORS.textLight, fontSize: 13 },
  pillTextActive: { color: "#fff", fontWeight: "600" },
  currencyPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  currencyPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  currencyText: { fontSize: 12, color: COLORS.text },
  currencyTextActive: { color: "#fff", fontWeight: "bold" },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: -8, marginBottom: 8 },
});

