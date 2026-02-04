import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Share, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../src/services/api";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { useRTLStyles } from "../../../src/hooks/useRTLStyles";

const COLORS = {
  primary: "#0891b2",
  background: "#f8fafc",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};

export default function MemberCard() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isRTL, isReady } = useLanguage();
  const rtlStyles = useRTLStyles(styles);
  const params = useLocalSearchParams();

  // Parse member and plan data from params
  const memberData = params.memberData ? JSON.parse(params.memberData as string) : null;
  const planData = params.planData ? JSON.parse(params.planData as string) : null;
  const [fullMemberData, setFullMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (memberData?.id) {
      fetchMemberDetails();
    }
  }, [memberData?.id]);

  const fetchMemberDetails = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUserDetails(memberData.id);
      setFullMemberData(data);
    } catch (error) {
      console.error("Error fetching member details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!memberData || !planData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('memberCard.errorDataNotAvailable', 'Member data not available')}</Text>
        <Text style={styles.errorSubtext}>
          {t('memberCard.member', 'Member')}: {memberData ? t('common.success', 'OK') : t('common.error', 'Error')}
          {t('memberCard.plan', 'Plan')}: {planData ? t('common.success', 'OK') : t('common.error', 'Error')}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getTierColor = (tierCode: string) => {
    const code = tierCode?.toLowerCase() || '';
    if (code.includes('gold')) return COLORS.gold;
    if (code.includes('silver')) return COLORS.silver;
    if (code.includes('bronze')) return COLORS.bronze;
    return planData.color_hex || COLORS.primary;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const tierColor = getTierColor(planData.tier_code);

  // Wait for language to be ready
  if (!isReady || !i18n.isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t('memberCard.title', 'Membership Card')}
        </Text>
      </View>

      {/* Membership Card */}
      <View style={styles.cardContainer}>
        <View style={[styles.membershipCard, { borderColor: tierColor }]}>
          {/* Header with tier badge */}
          <View style={[styles.cardHeader, { backgroundColor: tierColor }]}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>
                {isRTL ? (planData.tier_name_ar || planData.tier_name_en) : (planData.tier_name_en || planData.tier_name_ar)}
              </Text>
              <Text style={styles.tierCode}>{planData.tier_code}</Text>
            </View>
          </View>

          {/* Member Info */}
          <View style={styles.cardContent}>
            {/* Profile Picture */}
            <View style={styles.profileSection}>
              {memberData.avatar ? (
                <Image source={{ uri: memberData.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: tierColor }]}>
                  <Ionicons name="person" size={40} color={COLORS.cardBg} />
                </View>
              )}
            </View>

            {/* Member Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.memberName}>{memberData.name}</Text>
              <Text style={styles.memberEmail}>{memberData.email}</Text>
              <Text style={styles.memberPhone}>{memberData.phone || 'N/A'}</Text>

              {/* Membership Info */}
              <View style={styles.membershipInfo}>
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.membershipId', 'Membership ID')}:</Text>
                  <Text style={[styles.value, isRTL && styles.textRTL]}>{memberData.membership_id_display || (memberData.id ? `ALT-${memberData.id.substring(0, 8).toUpperCase()}` : 'N/A')}</Text>
                </View>

                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.status', 'Status')}:</Text>
                  <View style={[
                    styles.statusBadge,
                    memberData.membership?.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      memberData.membership?.status === 'ACTIVE' ? styles.activeText : styles.inactiveText
                    ]}>
                      {memberData.membership?.status === 'ACTIVE' ? t('memberCard.active', 'Active') :
                        memberData.membership?.status === 'EXPIRED' ? t('memberCard.expired', 'Expired') :
                          memberData.membership?.status === 'SUSPENDED' ? t('memberCard.suspended', 'Suspended') :
                            memberData.membership?.status === 'CANCELLED' ? t('memberCard.cancelled', 'Cancelled') :
                              memberData.membership?.status === 'PENDING_PAYMENT' ? t('memberCard.pending', 'Pending') :
                                (memberData.membership?.status || 'UNKNOWN')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.startDate', 'Start Date')}:</Text>
                  <Text style={[styles.value, isRTL && styles.textRTL]}>
                    {formatDate(memberData.membership?.start_date)}
                  </Text>
                </View>

                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.expiryDate', 'Expiry Date')}:</Text>
                  <Text style={[styles.value, isRTL && styles.textRTL]}>
                    {formatDate(memberData.membership?.end_date)}
                  </Text>
                </View>

                {/* Points & Cashback - placeholder for now */}
                {/* Points & Cashback */}
                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.loyaltyPoints', 'Loyalty Points')}:</Text>
                  <Text style={[styles.value, isRTL && styles.textRTL]}>
                    {fullMemberData?.points?.current_balance || memberData.points?.current_balance || 0} {t('common.currency.pts', 'PTS')}
                  </Text>
                </View>

                <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t('memberCard.clubGiftsBalance', 'Club Gifts Balance')}:</Text>
                  <Text style={[styles.value, isRTL && styles.textRTL]}>
                    {t('common.currency.usd', 'USD')} {(fullMemberData?.cashback_balance || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>
              {t('memberCard.validMembership', 'Valid Membership • Issued by Altayar')}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionsContainer, isRTL && styles.actionsContainerRTL]}>
        <TouchableOpacity style={[styles.actionButton, isRTL && styles.actionButtonRTL]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={COLORS.cardBg} />
          <Text style={styles.actionButtonText}>{t('memberCard.close', 'Close')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.printButton, isRTL && styles.actionButtonRTL]}
          onPress={async () => {
            try {
              const message = `${t('memberCard.shareMessage', 'Check out my membership card!')}\n\n` +
                `${t('memberCard.memberName', 'Name')}: ${memberData.name}\n` +
                `${t('memberCard.membershipId', 'Membership ID')}: ${memberData.membership_id_display || `ALT-${memberData.id?.substring(0, 8).toUpperCase()}`}\n` +
                `${t('memberCard.plan', 'Plan')}: ${isRTL ? (planData.tier_name_ar || planData.tier_name_en) : (planData.tier_name_en || planData.tier_name_ar)}\n` +
                `${t('memberCard.status', 'Status')}: ${memberData.membership?.status || 'N/A'}`;

              await Share.share({
                message: message,
                title: t('memberCard.title', 'Membership Card'),
              });
            } catch (error) {
              console.error('Error sharing:', error);
            }
          }}
        >
          <Ionicons name="share-social" size={20} color={COLORS.primary} />
          <Text style={[styles.actionButtonText, styles.printButtonText]}>{t('memberCard.shareCard', 'Share Card')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  cardContainer: {
    padding: 20,
  },
  membershipCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tierBadge: {
    alignItems: 'center',
  },
  tierText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.cardBg,
    marginBottom: 4,
  },
  tierCode: {
    fontSize: 14,
    color: COLORS.cardBg,
    opacity: 0.9,
  },
  cardContent: {
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsSection: {
    alignItems: 'center',
  },
  memberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  memberEmail: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  memberPhone: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  membershipInfo: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
  },
  inactiveBadge: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeText: {
    color: COLORS.cardBg,
  },
  inactiveText: {
    color: COLORS.cardBg,
  },
  cardFooter: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  actionButtonRTL: {
    flexDirection: 'row-reverse',
  },
  actionButtonText: {
    color: COLORS.cardBg,
    fontSize: 16,
    fontWeight: '600',
    marginStart: 8,
  },
  printButton: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  printButtonText: {
    color: COLORS.primary,
  },
  textRTL: {
    textAlign: 'right',
  },
});
