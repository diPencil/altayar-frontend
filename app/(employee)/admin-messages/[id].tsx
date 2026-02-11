import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { employeeApi } from "../../../src/services/api";

const COLORS = {
  primary: "#1071b8",
  background: "#f1f5f9",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  error: "#ef4444",
  warning: "#f59e0b",
};

export default function EmployeeAdminMessageDetails() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const params = useLocalSearchParams();
  const id = useMemo(() => String((params as any)?.id || ""), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setError(t("common.somethingWentWrong", "Something went wrong"));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await employeeApi.getAdminMessage(id);
        if (!mounted) return;
        setData(res);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || t("common.somethingWentWrong", "Something went wrong"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, t]);

  const createdAtLabel = useMemo(() => {
    const v = data?.created_at;
    if (!v) return "";
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
    }
  }, [data?.created_at]);

  const isUrgent = String(data?.priority || "").toUpperCase() === "HIGH";

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t("employee.dashboard.adminMessages.title", "Admin Messages")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, isRTL && styles.textRTL]}>{t("common.loading", "Loading...")}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={COLORS.error} />
          <Text style={[styles.errorText, isRTL && styles.textRTL]}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.card}>
            <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
              <Text style={[styles.title, isRTL && styles.textRTL]}>{data?.title || ""}</Text>
              {isUrgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>
                    {t("employee.dashboard.adminMessages.urgent", "Urgent")}
                  </Text>
                </View>
              )}
            </View>

            {!!createdAtLabel && (
              <Text style={[styles.time, isRTL && styles.textRTL]}>{createdAtLabel}</Text>
            )}

            <View style={styles.divider} />
            <Text style={[styles.message, isRTL && styles.textRTL]}>{data?.message || ""}</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRTL: { flexDirection: "row-reverse" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  textRTL: { textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  loadingText: { marginTop: 8, color: COLORS.textLight },
  errorText: { marginTop: 8, color: COLORS.textLight, textAlign: "center" },
  body: { padding: 16 },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titleRowRTL: { flexDirection: "row-reverse" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text, flex: 1 },
  urgentBadge: {
    backgroundColor: `${COLORS.warning}20`,
    borderColor: COLORS.warning,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  urgentText: { color: COLORS.warning, fontWeight: "800", fontSize: 12 },
  time: { marginTop: 6, color: COLORS.textLight, fontSize: 12 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  message: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
});

