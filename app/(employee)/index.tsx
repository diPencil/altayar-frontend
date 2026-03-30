import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#1071b8",
  secondary: "#167dc1",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  purple: "#8b5cf6",
  background: "#f1f5f9",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
};

import { TROPHY_LEVELS } from "../../src/constants/competition";
import { useAuth } from "../../src/contexts/AuthContext";

import { chatApi } from "../../src/services/api";
import { rtlMirroredIconStyle } from "../../src/utils/rtlIcons";
import { useState, useEffect, useCallback } from "react";

export default function EmployeeDashboard() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();

  const userName = user?.first_name || t('common.employee');

  const [stats, setStats] = useState({
    replies: 0,
    customers: 0,
    offers: 0,
    responseRate: "100%"
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [yearlyTotal, setYearlyTotal] = useState(0);

  // Calculate current rank
  const currentLevel = TROPHY_LEVELS.find(l => yearlyTotal >= l.min) || TROPHY_LEVELS[TROPHY_LEVELS.length - 1];

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const { employeeApi } = await import('../../src/services/api');

      // Fetch employee stats
      const statsRes = await employeeApi.getStats();
      setStats({
        replies: statsRes?.chats?.total || 0,
        customers: statsRes?.assigned_customers || 0,
        offers: statsRes?.referrals?.total || 0,
        responseRate: typeof statsRes?.response_rate === 'number'
          ? `${statsRes.response_rate}%`
          : (statsRes?.response_rate || "100%")
      });

      // Fetch assigned chats
      const chatsRes = await chatApi.getAssigned('pending').catch(() => []);
      setChats(chatsRes || []);

      // Fetch competition stats for Rank Icon
      const compRes = await employeeApi.getCompetitionStats().catch(() => ({ yearly_total: 0 }));
      setYearlyTotal(compRes.yearly_total || 0);

      // Fetch admin messages for dashboard
      const msgsRes = await employeeApi.getAdminMessages({ limit: 5 }).catch(() => []);
      const formatted = (Array.isArray(msgsRes) ? msgsRes : []).map((m: any) => ({
        id: String(m?.id || ''),
        title: m?.title || '',
        content: m?.message || '',
        time: m?.created_at ? new Date(m.created_at).toLocaleString() : '',
        urgent: String(m?.priority || '').toUpperCase() === 'HIGH',
      }));
      setMessages(formatted);

    } catch (error) {
      console.log("Error loading employee data", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmployeeData();
    setRefreshing(false);
  }, []);


  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Card */}
      <LinearGradient
        colors={["#1e3a5f", "#2d4a6f"]}
        style={styles.welcomeCard}
      >
        <View style={[styles.welcomeContent]}>
          <View style={isRTL ? { alignItems: "flex-end" } : undefined}>
            <Text style={[styles.welcomeText, isRTL && styles.textRTL]}>
              {t('employee.dashboard.hello')}, {userName}!
            </Text>
            <Text style={[styles.welcomeSubtext, isRTL && styles.textRTL]}>
              {t('employee.dashboard.performanceSummary')}
            </Text>
          </View>
          <View style={[styles.welcomeIcon, { backgroundColor: `${currentLevel.color}20` }]}>
            <Ionicons
              name={currentLevel.icon as any}
              size={32}
              color={currentLevel.color}
              style={rtlMirroredIconStyle(String(currentLevel.icon), isRTL)}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={[styles.statsGrid]}>
        <StatCard
          icon="chatbubbles"
          label={t('employee.dashboard.stats.replies')}
          value={stats.replies.toString()}
          gradient={[COLORS.primary, COLORS.secondary]}
          isRTL={isRTL}
        />
        <StatCard
          icon="people"
          label={t('employee.dashboard.stats.customers')}
          value={stats.customers.toString()}
          gradient={[COLORS.success, "#34d399"]}
          isRTL={isRTL}
        />
        <StatCard
          icon="pricetag"
          label={t('employee.dashboard.stats.offers')}
          value={stats.offers.toString()}
          gradient={[COLORS.warning, "#fbbf24"]}
          isRTL={isRTL}
        />
        <StatCard
          icon="checkmark-circle"
          label={t('employee.dashboard.stats.responseRate')}
          value={stats.responseRate}
          gradient={[COLORS.purple, "#a78bfa"]}
          isRTL={isRTL}
        />
      </View>

      {/* Admin Messages */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <View style={[styles.cardTitleRow]}>
            <Ionicons name="mail" size={22} color={COLORS.error} />
            <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>
              {t('employee.dashboard.adminMessages.title')}
            </Text>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{messages.length}</Text>
          </View>
        </View>

        {messages.length > 0 ? (
          messages.map((msg, i) => (
            <AdminMessage
              key={i}
              title={msg.title}
              message={msg.content}
              time={msg.time}
              urgent={msg.urgent}
              isRTL={isRTL}
              onPress={() => {
                if (msg?.id) {
                  router.push(`/(employee)/admin-messages/${msg.id}` as any);
                } else {
                  Alert.alert(msg.title || t('common.info', 'Info'), msg.content || '');
                }
              }}
            />
          ))
        ) : (
          <Text style={[styles.emptyHint, { textAlign: isRTL ? 'right' : 'center' }]}>
            {t('employee.dashboard.adminMessages.empty')}
          </Text>
        )}
      </View>

      {/* Pending Chats */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <View style={[styles.cardTitleRow]}>
            <Ionicons name="chatbubbles" size={22} color={COLORS.primary} />
            <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>
              {t('employee.dashboard.pendingChats.title')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(employee)/chats')}>
            <Text style={[styles.viewAll, isRTL && styles.textRTL]}>{t('employee.dashboard.pendingChats.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {chats.length > 0 ? (
          chats.map((chat, i) => (
            <ChatItem
              key={i}
              name={chat.customer_name || t('common.customer')}
              message={chat.last_message || ""}
              time={chat.time || t('common.now')}
              unread={chat.unread || 0}
              isRTL={isRTL}
              onPress={() => router.push({ pathname: '/(employee)/chats', params: { id: chat.id } })}
            />
          ))
        ) : (
          <Text style={[styles.emptyHint, { textAlign: isRTL ? 'right' : 'center' }]}>
            {t('employee.dashboard.pendingChats.empty')}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('employee.dashboard.quickActions.title')}
        </Text>
        <View style={[styles.quickActions]}>
          <QuickAction
            icon="pricetag"
            label={t('employee.dashboard.quickActions.sendOffer')}
            color={COLORS.primary}
            isRTL={isRTL}
            onPress={() => router.push({ pathname: '/(employee)/marketing/create' as any, params: { type: 'PACKAGE' } })}
          />
          <QuickAction
            icon="gift"
            label={t('employee.dashboard.quickActions.sendDiscount')}
            color={COLORS.success}
            isRTL={isRTL}
            onPress={() => router.push({ pathname: '/(employee)/marketing/create' as any, params: { type: 'ACTIVITY', discount: 'true' } })}
          />
          <QuickAction
            icon="ticket"
            label={t('employee.dashboard.quickActions.sendVoucher')}
            color={COLORS.warning}
            isRTL={isRTL}
            onPress={() => router.push({ pathname: '/(employee)/marketing/create' as any, params: { type: 'OTHER', voucher: 'true' } })}
          />
          <QuickAction
            icon="megaphone"
            label={t('employee.dashboard.quickActions.broadcast')}
            color={COLORS.purple}
            isRTL={isRTL}
            onPress={() => router.push({ pathname: '/(employee)/marketing/create' as any, params: { type: 'OTHER', broadcast: 'true' } })}
          />
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value, gradient, isRTL }: any) {
  return (
    <LinearGradient colors={gradient} style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={22}
          color="rgba(255,255,255,0.9)"
          style={rtlMirroredIconStyle(icon, isRTL)}
        />
      </View>
      <Text style={[styles.statValue, isRTL && styles.statValueRTL]}>{value}</Text>
      <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{label}</Text>
    </LinearGradient>
  );
}

function AdminMessage({ title, message, time, urgent, isRTL, onPress }: any) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={[styles.messageItem]} onPress={onPress}>
      <View style={[styles.messageIcon, urgent && styles.urgentIcon]}>
        <Ionicons name="mail" size={20} color={urgent ? COLORS.error : COLORS.primary} />
      </View>
      <View style={[styles.messageContent, isRTL && styles.messageContentRTL]}>
        <View style={[styles.messageHeader]}>
          <Text style={[styles.messageTitle, isRTL && styles.textRTL]}>{title}</Text>
          {urgent && <View style={styles.urgentBadge}><Text style={styles.urgentText}>{t('employee.dashboard.adminMessages.urgent', 'Urgent')}</Text></View>}
        </View>
        <Text style={[styles.messageText, isRTL && styles.textRTL]} numberOfLines={1}>{message}</Text>
        <Text style={[styles.messageTime, isRTL && styles.textRTL]}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ChatItem({ name, message, time, unread, isRTL, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.chatItem]} onPress={onPress}>
      <View style={styles.chatAvatar}>
        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={[styles.chatContent, isRTL && styles.chatContentRTL]}>
        <View style={[styles.chatHeader]}>
          <Text style={[styles.chatName, isRTL && styles.textRTL]}>{name}</Text>
          <Text style={[styles.chatTime, isRTL && styles.textRTL]}>{time}</Text>
        </View>
        <View style={[styles.chatFooter]}>
          <Text style={[styles.chatMessage, isRTL && styles.textRTL]} numberOfLines={1}>{message}</Text>
          {unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, color, isRTL, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color} 15` }]}>
        <Ionicons name={icon} size={24} color={color} style={rtlMirroredIconStyle(icon, isRTL)} />
      </View>
      <Text style={[styles.quickActionLabel, isRTL && styles.textRTL]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  welcomeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  textRTL: {
    textAlign: "right",
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  statCard: {
    width: (width - 48) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    alignSelf: "stretch",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    alignSelf: "stretch",
  },
  statValueRTL: {
    writingDirection: "ltr",
    textAlign: "right",
  },
  emptyHint: {
    padding: 20,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginStart: 8,
  },
  cardTitleRTL: {
    marginStart: 0,
    marginEnd: 8,
  },
  newBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  viewAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  urgentIcon: {
    backgroundColor: "#fee2e2",
  },
  messageContent: {
    flex: 1,
    marginStart: 12,
  },
  messageContentRTL: {
    marginStart: 0,
    marginEnd: 12,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  messageTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  urgentBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginStart: 8,
  },
  urgentText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  chatContent: {
    flex: 1,
    marginStart: 12,
  },
  chatContentRTL: {
    marginStart: 0,
    marginEnd: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  chatName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  chatMessage: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginStart: 8,
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  quickAction: {
    alignItems: "center",
    width: (width - 64) / 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: COLORS.text,
    textAlign: "center",
  },
  bottomSpacer: {
    height: 20,
  },
});
