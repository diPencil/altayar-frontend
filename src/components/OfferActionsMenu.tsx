import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  isFavorited: boolean;
  ratingCount: number;
  onClose: () => void;
  onPressFavorite: () => void;
  onPressRate: () => void;
};

const COLORS = {
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  white: "#ffffff",
  overlay: "rgba(0,0,0,0.35)",
  star: "#f59e0b",
  heart: "#FF3B30",
};

export default function OfferActionsMenu({
  visible,
  isFavorited,
  ratingCount,
  onClose,
  onPressFavorite,
  onPressRate,
}: Props) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menuCard, isRTL && { alignItems: "flex-end" }]}>
          <Text style={[styles.menuTitle, isRTL && styles.textRTL]}>
            {t("offers.actionsTitle", "Offer actions")}
          </Text>

          <TouchableOpacity
            style={[styles.row]}
            onPress={onPressFavorite}
            activeOpacity={0.85}
          >
            <Ionicons name={isFavorited ? "heart" : "heart-outline"} size={18} color={COLORS.heart} />
            <Text style={[styles.rowText, isRTL && styles.textRTL]}>
              {isFavorited
                ? t("offers.actionFavoriteRemove", "Remove from favorites")
                : t("offers.actionFavoriteAdd", "Add to favorites")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row]}
            onPress={onPressRate}
            activeOpacity={0.85}
          >
            <Ionicons name="star-outline" size={18} color={COLORS.star} />
            <Text style={[styles.rowText, isRTL && styles.textRTL]}>
              {t("offers.actionRate", "Rate offer")} ({ratingCount})
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  menuCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
  },

  rowText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },
  textRTL: { textAlign: "right" },
});

