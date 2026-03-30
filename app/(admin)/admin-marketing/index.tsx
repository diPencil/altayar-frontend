import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { offersApi, Offer } from "../../../src/services/api";
import Toast from "../../../src/components/Toast";
import ConfirmModal from "../../../src/components/ConfirmModal";

const COLORS = {
  primary: "#1071b8",
  background: "#f8fafc",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  purple: "#8b5cf6",
  danger: "#ef4444",
};

export default function AdminMarketingDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL } = useLanguage();

  const [recentItems, setRecentItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: "" });
  const shownToastRef = useRef<string | null>(null);

  const ACTIONS: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    params: Record<string, string>;
  }> = [
    {
      id: "offer",
      label: t("marketingDashboard.quickActions.sendOffer", "Send Offer"),
      icon: "pricetag",
      color: COLORS.primary,
      params: { type: "PACKAGE" },
    },
    {
      id: "discount",
      label: t("marketingDashboard.quickActions.sendDiscount", "Send Discount"),
      icon: "trending-down",
      color: COLORS.danger,
      params: { type: "DISCOUNT", discount: "true" },
    },
    {
      id: "voucher",
      label: t("marketingDashboard.quickActions.sendVoucher", "Send Voucher"),
      icon: "ticket",
      color: COLORS.purple,
      params: { type: "VOUCHER", voucher: "true" },
    },
    {
      id: "broadcast",
      label: t("marketingDashboard.quickActions.broadcast", "Broadcast"),
      icon: "megaphone",
      color: COLORS.warning,
      params: { type: "BROADCAST", broadcast: "true" },
    },
  ];

  const fetchRecentItems = async () => {
    try {
      setLoading(true);
      const data = await offersApi.getAll({ offer_source: "MARKETING" });
      const sorted = data.sort(
        (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      setRecentItems(sorted.slice(0, 20));
    } catch (error) {
      console.log("Error fetching marketing items:", error);
      setToast({ visible: true, message: t("common.errorOccurred", "Error occurred"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const toastParam = typeof (params as any)?.toast === "string" ? ((params as any).toast as string) : undefined;
    if (!toastParam || shownToastRef.current === toastParam) return;
    shownToastRef.current = toastParam;
    const msg =
      toastParam === "updated"
        ? t("offers.messages.successUpdate", "Updated")
        : toastParam === "deleted"
          ? t("offers.messages.deleted", "Deleted")
          : t("offers.messages.success", "Created");
    setToast({ visible: true, message: msg, type: "success" });
    // Clear query param so the same toast can show next time
    router.replace("/(admin)/admin-marketing" as any);
  }, [params, t]);

  useFocusEffect(
    useCallback(() => {
      fetchRecentItems();
    }, [])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return COLORS.success;
      case "EXPIRED":
        return COLORS.danger;
      case "PAUSED":
        return COLORS.warning;
      default:
        return COLORS.textLight;
    }
  };

  const getTypeLabel = (type: string) => {
    if (type === "VOUCHER") return t("offers.voucherTitle", "Voucher");
    if (type === "DISCOUNT") return t("offers.discountTitle", "Discount");
    if (type === "OTHER" || type === "BROADCAST") return t("offers.broadcastTitle", "Broadcast");
    return type;
  };

  const getItemTheme = (type: string) => {
    if (type === "VOUCHER") {
      return {
        icon: "ticket" as const,
        iconBg: "rgba(139, 92, 246, 0.12)",
        iconColor: COLORS.purple,
        badgeBg: "rgba(139, 92, 246, 0.12)",
        badgeColor: COLORS.purple,
      };
    }

    if (type === "DISCOUNT") {
      return {
        icon: "trending-down" as const,
        iconBg: "rgba(239, 68, 68, 0.12)",
        iconColor: COLORS.danger,
        badgeBg: "rgba(239, 68, 68, 0.12)",
        badgeColor: COLORS.danger,
      };
    }

    if (type === "BROADCAST" || type === "OTHER") {
      return {
        icon: "megaphone" as const,
        iconBg: "rgba(245, 158, 11, 0.14)",
        iconColor: COLORS.warning,
        badgeBg: "rgba(245, 158, 11, 0.14)",
        badgeColor: COLORS.warning,
      };
    }

    return {
      icon: "pricetag" as const,
      iconBg: "rgba(16, 113, 184, 0.10)",
      iconColor: COLORS.primary,
      badgeBg: "rgba(16, 113, 184, 0.10)",
      badgeColor: COLORS.primary,
    };
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ visible: true, id });
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    setDeleteModal({ visible: false, id: "" });
    try {
      setLoading(true);
      await offersApi.delete(id);
      setToast({
        visible: true,
        message: t("offers.messages.deleted", "Item deleted successfully"),
        type: "success",
      });
      fetchRecentItems();
    } catch (error) {
      console.log(error);
      setToast({ visible: true, message: t("common.errorOccurred", "Error occurred"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Offer }) => (
    (() => {
      const theme = getItemTheme(item.offer_type);
      return (
    <TouchableOpacity
      style={[styles.listItem, { flexDirection: 'row', backgroundColor: item.offer_type === "VOUCHER" ? "#faf5ff" : COLORS.cardBg }]}
      onPress={() => router.push({ pathname: "/(admin)/admin-marketing/create" as any, params: { id: item.id } })}
    >
      <View
        style={[
          styles.itemIcon,
          {
            backgroundColor: theme.iconBg,
          },
        ]}
      >
        <Ionicons
          name={theme.icon}
          size={20}
          color={theme.iconColor}
        />
      </View>

      <View style={[styles.itemInfo, { marginStart: isRTL ? 0 : 12, marginEnd: isRTL ? 12 : 0 }]}>
        <Text style={[styles.itemTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
          {isRTL ? item.title_ar : item.title_en}
        </Text>
        <View style={[styles.itemMeta, { flexDirection: 'row' }]}>
          <Text style={styles.itemType}>{getTypeLabel(item.offer_type)}</Text>
          <Text style={styles.dot}>{t("common.bulletDot")}</Text>
          <Text style={styles.itemDate}>{new Date(item.created_at || "").toLocaleDateString()}</Text>
        </View>
        {!!(item.created_by_name || item.created_by_email || item.created_by_user_id) && (
          <Text style={[styles.itemCreator, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
            {t("common.createdBy", "Created by")}:{" "}
            {item.created_by_name || item.created_by_email || item.created_by_user_id}
            {item.created_by_role
              ? ` (${t(`common.role.${item.created_by_role}`, item.created_by_role)})`
              : ""}
          </Text>
        )}
      </View>

      <View style={[styles.itemActions, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={{ padding: 4 }}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteClick(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
      );
    })()
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t("admin.marketing", "Marketing"),
          headerBackTitle: t("common.back", "Back"),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.background },
        }}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("admin.marketing", "Marketing")}
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
          {t("marketingDashboard.subtitle", "Create and manage your campaigns")}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <View style={[styles.actionRow, { flexDirection: 'row' }]}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                { flexDirection: 'row' },
                action.id === "voucher" && styles.voucherActionCard,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/admin-marketing/create" as any,
                  params: action.params,
                })
              }
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: action.color, marginEnd: isRTL ? 0 : 10, marginStart: isRTL ? 10 : 0 },
                  action.id === "voucher" && styles.voucherActionIcon,
                ]}
              >
                <Ionicons name={action.icon as any} size={20} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionLabel, { textAlign: isRTL ? "right" : "left" }, action.id === "voucher" && styles.voucherActionLabel]}>
                  {action.label}
                </Text>
                {action.id === "voucher" && (
                  <Text style={[styles.voucherActionSub, { textAlign: isRTL ? "right" : "left" }]}>
                    {t("marketingDashboard.quickActions.voucherHintShort")}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.listContainer}>
        <Text style={[styles.listHeader, { textAlign: isRTL ? "right" : "left" }]}>
          {t("marketingDashboard.recentActivity", "Recent Activity")}
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={recentItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="list" size={48} color={COLORS.textLight} style={{ opacity: 0.5 }} />
                <Text style={styles.emptyText}>{t("marketingDashboard.empty", "No items yet")}</Text>
              </View>
            }
          />
        )}
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type as any}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <ConfirmModal
        visible={deleteModal.visible}
        title={t("common.delete", "Delete")}
        message={t("common.deleteConfirm", "Are you sure you want to delete this item?")}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ visible: false, id: "" })}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.text },
  headerSubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },

  actionsContainer: { paddingHorizontal: 15, marginBottom: 20 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  actionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 12,
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voucherActionCard: {
    backgroundColor: "#f5f3ff",
    borderColor: "rgba(139, 92, 246, 0.22)",
    shadowColor: COLORS.purple,
    shadowOpacity: 0.08,
  },
  voucherActionIcon: {
    backgroundColor: COLORS.purple,
  },
  voucherActionLabel: {
    fontWeight: "900",
    color: COLORS.text,
  },
  voucherActionSub: {
    marginTop: 2,
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: "700",
  },
  voucherCard: {
    marginTop: 12,
    backgroundColor: "#f5f3ff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.18)",
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    overflow: "hidden",
  },
  voucherTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  voucherLabelWrap: {
    flex: 1,
  },
  voucherKicker: {
    color: COLORS.purple,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  voucherTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  voucherSubtitle: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: "88%",
  },
  voucherStamp: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.18)",
  },
  voucherFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voucherPerforation: {
    flex: 1,
    height: 1,
    marginEnd: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 92, 246, 0.18)",
    borderStyle: "dashed",
  },
  voucherPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  voucherPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  voucherDecorLeft: {
    position: "absolute",
    top: -18,
    left: -18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  voucherDecorRight: {
    position: "absolute",
    bottom: -20,
    right: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
  },
  actionIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text, flex: 1 },

  listContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  listHeader: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 16 },
  listItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  itemIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  itemMeta: { flexDirection: "row", alignItems: "center" },
  itemType: { fontSize: 12, color: COLORS.textLight, fontWeight: "500" },
  dot: { fontSize: 12, color: COLORS.textLight, marginHorizontal: 6 },
  itemDate: { fontSize: 12, color: COLORS.textLight },
  itemCreator: { marginTop: 2, fontSize: 12, color: COLORS.textLight },
  itemActions: { gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { marginTop: 10, color: COLORS.textLight, fontSize: 14 },
});

