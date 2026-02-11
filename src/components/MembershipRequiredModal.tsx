import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";
import { router } from "expo-router";

const COLORS = {
  primary: "#1071b8",
  background: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
};

export function MembershipRequiredModal({
  visible,
  onClose,
  source,
}: {
  visible: boolean;
  onClose: () => void;
  source?: string;
}) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const goMemberships = () => {
    onClose();
    router.push({
      pathname: "/(user)/memberships-explore" as any,
      params: source ? { source } : undefined,
    } as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, isRTL && styles.cardRTL]}>
          <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
            <View style={styles.icon}>
              <Ionicons name="lock-closed" size={22} color={COLORS.primary} />
            </View>
            <Text style={[styles.title, isRTL && styles.textRTL]}>
              {t("membership.locked.title", "Subscribe to unlock")}
            </Text>
          </View>

          <Text style={[styles.body, isRTL && styles.textRTL]}>
            {t("membership.locked.body", "Subscribe to explore the app and access all features.")}
          </Text>

          <View style={[styles.actions, isRTL && styles.actionsRTL]}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>
                {t("common.cancel", "Cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={goMemberships}>
              <Text style={styles.btnPrimaryText}>
                {t("membership.locked.cta", "View memberships")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRTL: {},
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  headerRowRTL: {
    flexDirection: "row-reverse",
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    flex: 1,
  },
  body: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 20,
  },
  textRTL: { textAlign: "right" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  actionsRTL: {
    flexDirection: "row-reverse",
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: { color: COLORS.text, fontWeight: "800" },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "800" },
});

