import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tierPostsApi, TierPost, TierComment } from '../../src/services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import ConfirmModal from '../../src/components/ConfirmModal';
import Toast from '../../src/components/Toast';

const TIER_COLORS: any = {
    SILVER: '#64748b',
    GOLD: '#d97706',
    PLATINUM: '#9333ea',
    VIP: '#059669',
    DIAMOND: '#0284c7',
    BUSINESS: '#dc2626',
};

export default function TierPostsAdminScreen() {
    const { isRTL } = useLanguage();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'comments'>('pending');
    const [posts, setPosts] = useState<TierPost[]>([]);
    const [comments, setComments] = useState<TierComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Feedback State
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const loadData = async () => {
        try {
            if (activeTab === 'comments') {
                const data = await tierPostsApi.getAllComments();
                setComments(data);
            } else {
                const statusFilter = activeTab === 'pending' ? 'PENDING' : undefined;
                const data = await tierPostsApi.getAllPosts({ status_filter: statusFilter });
                setPosts(data);
            }
        } catch (error: any) {
            console.error('Error loading data:', error);
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadData();
    }, [activeTab]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleApprovePost = async (postId: string) => {
        setActionLoading(postId);
        try {
            await tierPostsApi.approvePost(postId);
            showToast(t('admin.tierPosts.approveSuccess'), 'success');
            loadData();
        } catch (error: any) {
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectPost = async (postId: string) => {
        setActionLoading(postId);
        try {
            await tierPostsApi.rejectPost(postId);
            showToast(t('admin.tierPosts.rejectSuccess'), 'info');
            loadData();
        } catch (error: any) {
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeletePost = (postId: string) => {
        setConfirmModal({
            visible: true,
            title: t('admin.tierPosts.deleteConfirmTitle'),
            message: t('admin.tierPosts.deletePostConfirmMsg'),
            type: 'danger',
            onConfirm: async () => {
                setActionLoading(postId);
                try {
                    await tierPostsApi.deletePost(postId);
                    showToast(t('admin.tierPosts.deleteSuccess'), 'success');
                    loadData();
                } catch (error: any) {
                    showToast(error.message || t('common.error'), 'error');
                } finally {
                    setActionLoading(null);
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                }
            },
        });
    };

    const handleApproveComment = async (commentId: string) => {
        setActionLoading(commentId);
        try {
            await tierPostsApi.approveComment(commentId);
            showToast(t('admin.tierPosts.approveSuccess'), 'success');
            loadData();
        } catch (error: any) {
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteComment = (commentId: string) => {
        setConfirmModal({
            visible: true,
            title: t('admin.tierPosts.deleteConfirmTitle'),
            message: t('admin.tierPosts.deleteCommentConfirmMsg'),
            type: 'danger',
            onConfirm: async () => {
                setActionLoading(commentId);
                try {
                    await tierPostsApi.deleteComment(commentId);
                    showToast(t('admin.tierPosts.deleteSuccess'), 'success');
                    loadData();
                } catch (error: any) {
                    showToast(error.message || t('common.error'), 'error');
                } finally {
                    setActionLoading(null);
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                }
            },
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(isRTL ? 'ar-EG' : 'en-US');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={styles.headerTitle}>{t('admin.tierPosts.title')}</Text>
            </View>

            {/* Tabs */}
            <View style={[styles.tabs, isRTL && styles.tabsRTL]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                        {t('admin.tierPosts.pendingPosts')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                        {t('admin.tierPosts.allPosts')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
                    onPress={() => setActiveTab('comments')}
                >
                    <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
                        {t('admin.tierPosts.comments')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1071b8" />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1071b8" />
                    }
                >
                    {activeTab === 'comments' ? (
                        // Comments List
                        comments.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                                <Text style={styles.emptyText}>{t('admin.tierPosts.noComments')}</Text>
                            </View>
                        ) : (
                            comments.map((comment) => (
                                <View key={comment.id} style={styles.commentCard}>
                                    <View style={[styles.commentHeader, isRTL && styles.commentHeaderRTL]}>
                                        <Image
                                            source={{ uri: comment.user_avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                            style={styles.avatar}
                                        />
                                        <View style={[styles.commentMeta, isRTL && styles.commentMetaRTL]}>
                                            <Text style={[styles.userName, isRTL && styles.textRTL]}>
                                                {comment.user_first_name} {comment.user_last_name}
                                            </Text>
                                            <Text style={[styles.timestamp, isRTL && styles.textRTL]}>{formatTime(comment.created_at)}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: comment.status === 'PENDING' ? '#fef3c7' : '#d1fae5' }]}>
                                            <Text style={[styles.statusText, { color: comment.status === 'PENDING' ? '#d97706' : '#059669' }]}>
                                                {t(`common.statuses.${comment.status}`, comment.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.commentContent, isRTL && styles.textRTL]}>{comment.content}</Text>

                                    <View style={[styles.actions, isRTL && styles.actionsRTL]}>
                                        {comment.status === 'PENDING' && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.approveBtn]}
                                                onPress={() => handleApproveComment(comment.id)}
                                                disabled={actionLoading === comment.id}
                                            >
                                                {actionLoading === comment.id ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                                        <Text style={styles.actionBtnText}>{t('admin.tierPosts.approve')}</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.deleteBtn]}
                                            onPress={() => handleDeleteComment(comment.id)}
                                            disabled={actionLoading === comment.id}
                                        >
                                            {actionLoading === comment.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons name="trash" size={18} color="#fff" />
                                                    <Text style={styles.actionBtnText}>{t('admin.tierPosts.delete')}</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )
                    ) : (
                        // Posts List
                        posts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
                                <Text style={styles.emptyText}>{t('admin.tierPosts.noPosts')}</Text>
                            </View>
                        ) : (
                            posts.map((post) => (
                                <View key={post.id} style={styles.postCard}>
                                    <View style={[styles.postHeader, isRTL && styles.postHeaderRTL]}>
                                        <Image
                                            source={{ uri: post.user_avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                            style={styles.avatar}
                                        />
                                        <View style={[styles.postMeta, isRTL && styles.postMetaRTL]}>
                                            <Text style={[styles.userName, isRTL && styles.textRTL]}>
                                                {post.user_first_name} {post.user_last_name}
                                            </Text>
                                            <Text style={[styles.timestamp, isRTL && styles.textRTL]}>{formatTime(post.created_at)}</Text>
                                        </View>
                                        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[post.tier_code] || '#64748b' }]}>
                                            <Text style={styles.tierText}>{t(`common.tiers.${post.tier_code}`, post.tier_code)}</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.postContent, isRTL && styles.textRTL]}>{post.content}</Text>

                                    {post.image_url && (
                                        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
                                    )}

                                    <View style={[styles.postStats, isRTL && styles.postStatsRTL]}>
                                        <View style={styles.stat}>
                                            <Ionicons name="heart" size={16} color="#64748b" />
                                            <Text style={styles.statText}>{post.likes_count}</Text>
                                        </View>
                                        <View style={styles.stat}>
                                            <Ionicons name="chatbubble" size={16} color="#64748b" />
                                            <Text style={styles.statText}>{post.comments_count}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: post.status === 'PENDING' ? '#fef3c7' : post.status === 'APPROVED' ? '#d1fae5' : '#fee2e2' }, isRTL && { marginEnd: 'auto', marginStart: 0 }]}>
                                            <Text style={[styles.statusText, { color: post.status === 'PENDING' ? '#d97706' : post.status === 'APPROVED' ? '#059669' : '#dc2626' }]}>
                                                {t(`common.statuses.${post.status}`, post.status)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.actions, isRTL && styles.actionsRTL]}>
                                        {post.status === 'PENDING' && (
                                            <>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.approveBtn]}
                                                    onPress={() => handleApprovePost(post.id)}
                                                    disabled={actionLoading === post.id}
                                                >
                                                    {actionLoading === post.id ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <>
                                                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                                            <Text style={styles.actionBtnText}>{t('admin.tierPosts.approve')}</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.rejectBtn]}
                                                    onPress={() => handleRejectPost(post.id)}
                                                    disabled={actionLoading === post.id}
                                                >
                                                    {actionLoading === post.id ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <>
                                                            <Ionicons name="close-circle" size={18} color="#fff" />
                                                            <Text style={styles.actionBtnText}>{t('admin.tierPosts.reject')}</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.deleteBtn]}
                                            onPress={() => handleDeletePost(post.id)}
                                            disabled={actionLoading === post.id}
                                        >
                                            {actionLoading === post.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Ionicons name="trash" size={18} color="#fff" />
                                                    <Text style={styles.actionBtnText}>{t('admin.tierPosts.delete')}</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            <ConfirmModal
                visible={confirmModal.visible}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1e293b',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#1071b8',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#1071b8',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 16,
    },
    postCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
    },
    postMeta: {
        flex: 1,
        marginStart: 12,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    timestamp: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    tierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tierText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    postContent: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 12,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    postStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 14,
        color: '#64748b',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginStart: 'auto',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    approveBtn: {
        backgroundColor: '#059669',
    },
    rejectBtn: {
        backgroundColor: '#f59e0b',
    },
    deleteBtn: {
        backgroundColor: '#dc2626',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    commentCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    commentMeta: {
        flex: 1,
        marginStart: 12,
    },
    commentContent: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
        marginBottom: 12,
    },
    // RTL Styles
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    tabsRTL: {
        flexDirection: 'row-reverse',
    },
    commentHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    commentMetaRTL: {
        marginStart: 0,
        marginEnd: 12,
        alignItems: 'flex-end',
    },
    textRTL: {
        textAlign: 'right',
    },
    actionsRTL: {
        flexDirection: 'row-reverse',
    },
    postHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    postMetaRTL: {
        marginStart: 0,
        marginEnd: 12,
        alignItems: 'flex-end',
    },
    postStatsRTL: {
        flexDirection: 'row-reverse',
    },
});
