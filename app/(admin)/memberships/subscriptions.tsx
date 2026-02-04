import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, Alert, Image, I18nManager
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../src/services/api";
import Toast from "../../../src/components/Toast";
import { useTranslation } from 'react-i18next';
// Attempt to use context for RTL if available, or fallback to i18n dir
// Assuming standard i18next usage from index.ts
import i18n from '../../../src/i18n';
import { getPlanColor, getShortCode } from '../../../src/utils/planColors';

const COLORS = {
    primary: "#2563eb", // Blue
    background: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    purple: "#8b5cf6",
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Fallback to original string if invalid
    return date.toLocaleDateString();
};

export default function ManageMembers() {
    const router = useRouter();
    const { t } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Tab state
    const [activeTab, setActiveTab] = useState<'search' | 'filter'>('search');

    // Filters
    const [search, setSearch] = useState("");
    const [searchField, setSearchField] = useState("username"); // username, email, user_id
    const [planFilter, setPlanFilter] = useState("");
    const [selectedPlanName, setSelectedPlanName] = useState(""); // Store selected plan name for display
    const [statusFilter, setStatusFilter] = useState("");

    // Bulk Actions
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState("");

    // Dropdowns visibility
    const [showFieldDropdown, setShowFieldDropdown] = useState(false);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showBulkDropdown, setShowBulkDropdown] = useState(false);

    // Data for dropdowns
    const [plans, setPlans] = useState<any[]>([]);
    const STATUSES = ["ACTIVE", "PENDING", "CANCELLED", "EXPIRED"];

    useEffect(() => {
        fetchMembers();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await adminApi.getMembershipPlans();
            setPlans(res || []);
        } catch (e) {
            console.log("Error loading plans", e);
        }
    };

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const params: any = { limit: 50 };
            if (search) {
                params.search = search;
                params.search_field = searchField;
            }
            if (planFilter) params.plan_filter = planFilter;
            if (statusFilter) params.status_filter = statusFilter;

            const res = await adminApi.getAllSubscriptions(params);
            setMembers(res.items || []);
            setTotal(res.total || 0);
        } catch (e) {
            console.log("Error fetching members", e);
            setToast({ visible: true, message: t('common.errorLoading', 'Error loading data'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === members.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(members.map(m => m.id));
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;

        try {
            await adminApi.bulkSubscriptionActions(bulkAction, selectedIds);
            setToast({ visible: true, message: t('common.actionSuccess', 'Action completed successfully'), type: 'success' });
            setSelectedIds([]);
            fetchMembers();
        } catch (e: any) {
            setToast({ visible: true, message: t('common.actionFailed', 'Action failed'), type: 'error' });
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header with Back Button */}
            <View style={[styles.headerContainer, isRTL && styles.rowReverse]}>
                <View style={[styles.headerLeft, isRTL && styles.rowReverse]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.pageTitle, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.allMemberships', 'All Memberships')}</Text>
                        <Text style={[styles.pageSubtitle, isRTL && { textAlign: 'right' }]}>{total} {t('common.members', 'members')}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(admin)/users/create')}>
                    <Ionicons name="add-circle" size={28} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
                <View style={[styles.miniStat, { backgroundColor: '#eff6ff' }, isRTL && styles.rowReverse]}>
                    <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                    <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                        <Text style={[styles.miniStatValue, isRTL && { textAlign: 'right' }]}>{members.filter(m => m.status === 'ACTIVE').length}</Text>
                        <Text style={[styles.miniStatLabel, isRTL && { textAlign: 'right' }]}>{t('common.statuses.active', 'Active')}</Text>
                    </View>
                </View>
                <View style={[styles.miniStat, { backgroundColor: '#fef3c7' }, isRTL && styles.rowReverse]}>
                    <Ionicons name="time" size={20} color="#f59e0b" />
                    <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                        <Text style={[styles.miniStatValue, isRTL && { textAlign: 'right' }]}>{members.filter(m => m.status === 'PENDING').length}</Text>
                        <Text style={[styles.miniStatLabel, isRTL && { textAlign: 'right' }]}>{t('common.statuses.pending', 'Pending')}</Text>
                    </View>
                </View>
                <View style={[styles.miniStat, { backgroundColor: '#fff1f2' }, isRTL && styles.rowReverse]}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                    <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                        <Text style={[styles.miniStatValue, isRTL && { textAlign: 'right' }]}>{members.filter(m => m.status === 'CANCELLED').length}</Text>
                        <Text style={[styles.miniStatLabel, isRTL && { textAlign: 'right' }]}>{t('common.statuses.cancelled', 'Cancelled')}</Text>
                    </View>
                </View>
                <View style={[styles.miniStat, { backgroundColor: '#f3f4f6' }, isRTL && styles.rowReverse]}>
                    <Ionicons name="alert-circle" size={20} color="#6b7280" />
                    <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                        <Text style={[styles.miniStatValue, isRTL && { textAlign: 'right' }]}>{members.filter(m => m.status === 'EXPIRED').length}</Text>
                        <Text style={[styles.miniStatLabel, isRTL && { textAlign: 'right' }]}>{t('common.statuses.expired', 'Expired')}</Text>
                    </View>
                </View>
            </View>

            {/* Tabs for Search and Filter */}
            <View style={styles.tabsContainer}>
                <View style={[styles.tabsRow, isRTL && styles.rowReverse]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'search' && styles.tabActive]}
                        onPress={() => setActiveTab('search')}
                    >
                        <Ionicons name="search" size={18} color={activeTab === 'search' ? COLORS.primary : COLORS.textLight} />
                        <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
                            {t('common.search', 'Search')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'filter' && styles.tabActive]}
                        onPress={() => setActiveTab('filter')}
                    >
                        <Ionicons name="filter" size={18} color={activeTab === 'filter' ? COLORS.primary : COLORS.textLight} />
                        <Text style={[styles.tabText, activeTab === 'filter' && styles.tabTextActive]}>
                            {t('common.filter', 'Filter')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {activeTab === 'search' ? (
                    <View style={[styles.tabContent, isRTL && styles.rowReverse]}>
                        <View style={[styles.searchInputContainer, isRTL && styles.rowReverse, { flex: 1, flexShrink: 1 }]}>
                            <Ionicons name="search" size={18} color={COLORS.textLight} />
                            <TextInput
                                style={[styles.searchInput, isRTL && { textAlign: 'right', marginRight: 8, marginLeft: 0 }]}
                                placeholder={t('common.search', 'Search')}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                        <Dropdown
                            label={searchField === 'user_id' ? t('common.userId', 'User ID') : t(`common.${searchField}`, searchField)}
                            isOpen={showFieldDropdown}
                            onToggle={() => {
                                setShowFieldDropdown(!showFieldDropdown);
                                setShowPlanDropdown(false);
                                setShowStatusDropdown(false);
                                setShowBulkDropdown(false);
                            }}
                            isRTL={isRTL}
                            width={120}
                        >
                            {['username', 'email', 'user_id', 'membership_id'].map(f => (
                                <DropdownItem key={f} label={t(`common.${f}`, f)} onPress={() => { setSearchField(f); setShowFieldDropdown(false); }} isRTL={isRTL} />
                            ))}
                        </Dropdown>
                        <TouchableOpacity style={[styles.searchBtn, { flexShrink: 0 }]} onPress={fetchMembers}>
                            <Text style={styles.searchBtnText}>{t('common.search', 'Search')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.tabContent}>
                        <View style={[styles.filterRow, isRTL && styles.rowReverse]}>
                            <View style={{ flex: 1 }}>
                                <Dropdown
                                    label={selectedPlanName || t('common.selectPlan', 'Select Plan')}
                                    isOpen={showPlanDropdown}
                                    onToggle={() => {
                                        setShowPlanDropdown(!showPlanDropdown);
                                        setShowFieldDropdown(false);
                                        setShowStatusDropdown(false);
                                        setShowBulkDropdown(false);
                                    }}
                                    isRTL={isRTL}
                                >
                                    <DropdownItem label={t('common.allPlans', 'All Plans')} onPress={() => {
                                        setPlanFilter("");
                                        setSelectedPlanName("");
                                        setShowPlanDropdown(false);
                                    }} isRTL={isRTL} />
                                    {plans.map(p => (
                                        <DropdownItem
                                            key={p.id}
                                            label={isRTL ? p.tier_name_ar : p.tier_name_en}
                                            onPress={() => {
                                                setPlanFilter(p.tier_name_en);
                                                setSelectedPlanName(isRTL ? p.tier_name_ar : p.tier_name_en);
                                                setShowPlanDropdown(false);
                                            }}
                                            isRTL={isRTL}
                                        />
                                    ))}
                                </Dropdown>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Dropdown
                                    label={statusFilter || t('common.selectStatus', 'Select Status')}
                                    isOpen={showStatusDropdown}
                                    onToggle={() => {
                                        setShowStatusDropdown(!showStatusDropdown);
                                        setShowFieldDropdown(false);
                                        setShowPlanDropdown(false);
                                        setShowBulkDropdown(false);
                                    }}
                                    isRTL={isRTL}
                                >
                                    <DropdownItem label={t('common.allStatuses', 'All Statuses')} onPress={() => { setStatusFilter(""); setShowStatusDropdown(false); }} isRTL={isRTL} />
                                    {STATUSES.map(s => (
                                        <DropdownItem key={s} label={t(`common.statuses.${s.toLowerCase()}`, s)} onPress={() => { setStatusFilter(s); setShowStatusDropdown(false); }} isRTL={isRTL} />
                                    ))}
                                </Dropdown>
                            </View>

                            <TouchableOpacity style={[styles.applyBtn, { flexShrink: 0, minWidth: 70, paddingHorizontal: 12 }]} onPress={fetchMembers}>
                                <Text style={styles.applyBtnText}>{t('common.apply', 'Apply')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Members Table */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <View style={styles.tableContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <View>
                            {/* Table Head */}
                            <View style={[styles.tHead, isRTL && styles.rowReverse]}>
                                <TouchableOpacity style={styles.checkboxCell} onPress={toggleSelectAll}>
                                    <View style={[styles.checkbox, selectedIds.length === members.length && members.length > 0 && styles.checkboxChecked]} />
                                </TouchableOpacity>
                                <Text style={[styles.th, { width: 60, textAlign: isRTL ? 'right' : 'left' }]}>{t("common.numberSign")}</Text>
                                <Text style={[styles.th, { width: 80, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.id', 'ID')}</Text>
                                <Text style={[styles.th, { width: 120, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.name', 'Name')}</Text>
                                <Text style={[styles.th, { width: 200, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.email', 'Email')}</Text>
                                <Text style={[styles.th, { width: 100, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.plan', 'Plan')}</Text>
                                <Text style={[styles.th, { width: 100, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.status', 'Status')}</Text>
                                <Text style={[styles.th, { width: 120, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.joined', 'Joined')}</Text>
                                <Text style={[styles.th, { width: 120, textAlign: isRTL ? 'right' : 'left' }]}>{t('manageMemberships.table.memId', 'Mem. ID')}</Text>
                            </View>

                            {/* Table Body */}
                            <ScrollView style={{ flex: 1 }}>
                                {members.length === 0 ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: COLORS.textLight }}>{t('common.noData', 'No data found')}</Text>
                                    </View>
                                ) : (
                                    members.map((m, idx) => {
                                        const isSelected = selectedIds.includes(m.id);
                                        return (
                                            <View key={m.id} style={[styles.tr, isSelected && styles.trSelected, isRTL && styles.rowReverse]}>
                                                <TouchableOpacity style={styles.checkboxCell} onPress={() => toggleSelection(m.id)}>
                                                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                                        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                                                    </View>
                                                </TouchableOpacity>

                                                <View style={[styles.td, { width: 60, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                                    {m.user?.avatar ? (
                                                        <Image
                                                            source={{ uri: m.user.avatar }}
                                                            style={styles.avatarImage}
                                                        />
                                                    ) : (
                                                        <View style={styles.avatar}>
                                                            <Text style={styles.avatarText}>{m.user?.first_name?.[0] || '?'}</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <Text style={[styles.td, { width: 80, color: COLORS.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                                                    {/* Sequential ID starting from 0001 */}
                                                    {String(idx + 1).padStart(4, '0')}
                                                </Text>

                                                <Text style={[styles.td, { width: 120, fontWeight: '500', textAlign: isRTL ? 'right' : 'left' }]}>
                                                    {m.user?.first_name} {m.user?.last_name}
                                                </Text>

                                                <Text style={[styles.td, { width: 200, color: COLORS.textLight, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }]}>
                                                    {m.user?.email}
                                                </Text>

                                                <View style={[styles.td, { width: 100, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                                    <PlanBadge code={m.plan?.tier_code} name={isRTL ? m.plan?.tier_name_ar : m.plan?.tier_name_en} color={m.plan?.color_hex} />
                                                </View>

                                                <View style={[styles.td, { width: 100, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                                                    <StatusBadge status={m.status} t={t} />
                                                </View>

                                                <Text style={[styles.td, { width: 120, fontSize: 12, textAlign: isRTL ? 'right' : 'left' }]}>
                                                    {formatDate(m.created_at)}
                                                </Text>

                                                <Text style={[styles.td, { width: 120, fontSize: 12, color: COLORS.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                                                    {m.user?.membership_id_display || (m.user?.id ? `ALT-${m.user.id.substring(0, 8).toUpperCase()}` : 'N/A')}
                                                </Text>
                                            </View>
                                        );
                                    })
                                )}
                            </ScrollView>
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </ScrollView>
    );
}

// --- Components ---

function Dropdown({ label, isOpen, onToggle, children, width, isRTL }: any) {
    return (
        <View style={{ position: 'relative', zIndex: isOpen ? 10000 : undefined }}>
            <TouchableOpacity style={[styles.dropdownTrigger, { width: width || 130 }, isRTL && styles.rowReverse]} onPress={onToggle}>
                <Text style={[styles.dropdownLabel, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{label}</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textLight} />
            </TouchableOpacity>
            {isOpen && (
                <View style={[styles.dropdownMenu, { width: width || 130 }, isRTL ? { left: 'auto', right: 0 } : { right: 'auto', left: 0 }]}>
                    {children}
                </View>
            )}
        </View>
    );
}

function DropdownItem({ label, onPress, isDestructive, isRTL }: any) {
    return (
        <TouchableOpacity style={styles.dropdownItem} onPress={onPress}>
            <Text style={[
                styles.dropdownItemText,
                isDestructive && { color: COLORS.error },
                isRTL && { textAlign: 'right' }
            ]}>{label}</Text>
        </TouchableOpacity>
    );
}

function PlanBadge({ code, name, color }: any) {
    const shortCode = getShortCode(code, name);
    const badgeColor = getPlanColor(code, color, shortCode);

    // Display short tier code (e.g., VM, BM) with plan color
    return (
        <View style={[styles.planBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.planBadgeText} numberOfLines={1}>{shortCode}</Text>
        </View>
    );
}

function StatusBadge({ status, t }: any) {
    let bg = '#e2e8f0';
    let color = COLORS.textLight;

    if (status === 'ACTIVE') { bg = '#ecfdf5'; color = '#059669'; }
    if (status === 'PENDING') { bg = '#fef3c7'; color = '#d97706'; }
    if (status === 'CANCELLED') { bg = '#fff1f2'; color = '#e11d48'; }

    const label = t ? t(`common.statuses.${status.toLowerCase()}`, status) : status;

    return (
        <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: bg }]}>
            <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowReverse: {
        flexDirection: 'row-reverse',
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
    },
    titleContainer: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    addBtn: {
        backgroundColor: 'transparent',
        padding: 8,
        borderRadius: 50,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    miniStat: {
        flex: 1,
        minWidth: 140,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    miniStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    miniStatLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 2,
    },
    // Tabs
    tabsContainer: {
        marginBottom: 20,
        backgroundColor: COLORS.cardBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'visible',
        zIndex: 100,
        elevation: 5,
    },
    tabsRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
        backgroundColor: '#f0f9ff',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textLight,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    tabContent: {
        padding: 16,
        paddingHorizontal: 12, // Reduced padding
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Reduced gap from 12
        position: 'relative',
        zIndex: 99,
        minHeight: 60,
        flexWrap: 'nowrap',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'nowrap',
        width: '100%',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        paddingHorizontal: 10,
        height: 40,
        minWidth: 80, // Reduced from 150 to allow shrinking
        maxWidth: '100%',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
    },
    searchBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        flexShrink: 0,
        minWidth: 80,
    },
    searchBtnText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 13,
    },
    applyBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
    },
    applyBtnText: {
        color: 'white',
        fontWeight: '500',
        fontSize: 13,
    },
    // Dropdowns
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        paddingHorizontal: 12,
        height: 40,
    },
    dropdownLabel: {
        fontSize: 13,
        color: COLORS.text,
        width: '80%'
    },
    dropdownMenu: {
        position: 'absolute',
        top: 45,
        left: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        paddingVertical: 4,
        elevation: 20,
        zIndex: 10000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        maxHeight: 200,
    },
    dropdownItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    dropdownItemText: {
        fontSize: 13,
        color: COLORS.text,
    },
    // Bulk Bar
    bulkBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
        position: 'relative',
        zIndex: 50,
    },
    goBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
    },
    goBtnDisabled: {
        backgroundColor: '#cbd5e1',
    },
    goBtnText: {
        color: 'white',
        fontWeight: '500',
    },
    columnToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    columnToggleText: {
        color: COLORS.textLight,
        fontSize: 13,
    },
    // Table
    tableContainer: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
    },
    tHead: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    th: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textLight,
        marginRight: 10, // Assuming LTR default margins, handled in render for RTL
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    trSelected: {
        backgroundColor: '#f0f9ff',
    },
    td: {
        fontSize: 13,
        color: COLORS.text,
        marginRight: 10,
    },
    // Checkbox
    checkboxCell: {
        width: 30,
        justifyContent: 'center',
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.textLight,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    // Avatars & Badges
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    avatarText: {
        fontWeight: '600',
        color: COLORS.textLight,
        fontSize: 14,
    },
    planBadge: {
        paddingHorizontal: 10,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'center',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
});

