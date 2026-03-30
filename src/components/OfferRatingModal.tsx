import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  visible: boolean;
  offerTitle?: string;
  initialRating?: number;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (rating: number) => void;
};

const COLORS = {
  primary: "#1071b8",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc",
  white: "#ffffff",
  star: "#f59e0b",
};

export default function OfferRatingModal({
  visible,
  offerTitle,
  initialRating = 0,
  submitting = false,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [rating, setRating] = useState<number>(initialRating || 0);

  useEffect(() => {
    if (visible) setRating(initialRating || 0);
  }, [visible, initialRating]);

  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isRTL && { alignItems: "flex-end" }]}>
          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t("offers.rateTitle", "Rate this offer")}
          </Text>
          {!!offerTitle && (
            <Text style={[styles.subtitle, isRTL && styles.textRTL]} numberOfLines={2}>
              {offerTitle}
            </Text>
          )}
          <Text style={[styles.hint, isRTL && styles.textRTL]}>
            {t("offers.rateSubtitle", "Tap a star from 1 to 5.")}
          </Text>

          <View style={[styles.starsRow]}>
            {stars.map((n) => {
              const active = rating >= n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  activeOpacity={0.8}
                  style={styles.starBtn}
                  disabled={submitting}
                >
                  <Ionicons
                    name={active ? "star" : "star-outline"}
                    size={30}
                    color={active ? COLORS.star : COLORS.textLight}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.actionsRow]}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelText}>{t("common.cancel", "Cancel")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.confirmBtn,
                (!rating || submitting) && styles.confirmBtnDisabled,
              ]}
              onPress={() => onConfirm(rating)}
              disabled={!rating || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{t("common.ok", "OK")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textRTL: { textAlign: "right" },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "700",
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textLight,
  },
  starsRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  starBtn: {
    padding: 4,
    borderRadius: 10,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "900",
  },
});

