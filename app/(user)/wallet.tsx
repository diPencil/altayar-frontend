import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { walletApi, type WalletBalance } from "../../src/services/api";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  error: "#ef4444",
};

interface Transaction {
  id: string;
  transaction_type?: string;
  type?: string; // Legacy support
  amount: number;
  description?: string;
  description_en?: string;
  description_ar?: string;
  currency?: string;
  created_at: string;
}

export default function WalletScreen() {
  const { isRTL, language } = useLanguage();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [walletCurrency, setWalletCurrency] = useState("USD");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ]);

      if (balanceRes.status === 'fulfilled') {
        const wb = balanceRes.value as WalletBalance | undefined;
        setBalance(wb?.balance ?? 0);
        setWalletCurrency(wb?.currency || "USD");
      }
      if (transRes.status === 'fulfilled') {
        setTransactions((transRes.value as any) || []);
      }
    } catch (error) {
      console.log('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('wallet.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, isRTL && styles.textRTL]}>
            {t('wallet.balance')}
          </Text>
          <Text style={styles.balanceAmount}>
            {balance.toLocaleString()} {formatCurrencyLabel(walletCurrency, t)}
          </Text>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t('wallet.transactions')}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.lightGray} />
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t('wallet.noTransactions')}
              </Text>
            </View>
          ) : (
            transactions.map((trans) => {
              // Determine if transaction is a credit (add) or debit (subtract)
              const transactionType = trans.transaction_type || trans.type || '';
              const isCredit = ['DEPOSIT', 'REFUND', 'CASHBACK', 'BONUS', 'TRANSFER_IN'].includes(transactionType);
              const isDebit = ['WITHDRAWAL', 'PAYMENT', 'TRANSFER_OUT', 'DEDUCTION'].includes(transactionType);
              
              // Amount is always positive in backend, we determine the sign based on type
              const displayAmount = isDebit ? -Math.abs(trans.amount) : Math.abs(trans.amount);
              const displayColor = isCredit ? COLORS.success : COLORS.error;
              const description = trans.description || trans.description_en || trans.description_ar || t('wallet.transaction', 'Transaction');
              const currencyCode = trans.currency || walletCurrency || "USD";

              return (
                <View key={trans.id} style={[styles.transactionItem]}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: isCredit ? '#dcfce7' : '#fee2e2' }
                  ]}>
                    <Ionicons
                      name={isCredit ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={displayColor}
                    />
                  </View>
                  <View style={[styles.transactionInfo, isRTL && styles.transactionInfoRTL]}>
                    <Text style={[styles.transactionDesc, isRTL && styles.textRTL]}>
                      {description}
                    </Text>
                    <Text style={[styles.transactionDate, isRTL && styles.textRTL]}>
                      {formatDate(trans.created_at)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: displayColor }
                  ]}>
                    {displayAmount > 0 ? '+' : ''}{displayAmount.toFixed(2)} {formatCurrencyLabel(currencyCode, t)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 8,
  },
  textRTL: {
    textAlign: "right",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: {
    flex: 1,
    marginStart: 12,
  },
  transactionInfoRTL: {
//     marginStart: 0,  /* removed double-flip for Native RTL */
//     marginEnd: 12,  /* removed double-flip for Native RTL */
    alignItems: "flex-start",
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
});
