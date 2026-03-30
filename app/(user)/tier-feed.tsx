import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Share,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { tierPostsApi, TierPost, TierComment } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const { width } = Dimensions.get('window');

const TIER_THEMES: any = {
    silver: {
        name: 'Silver',
        colors: ['#E0E7FF', '#FAFAFA'],
        accent: '#64748b',
        primary: '#475569',
        headerImg: require('../../assets/images/silver.png'),
        description: 'Your journey starts here. Connect with fellow Silver members.',
    },
    gold: {
        name: 'Gold',
        colors: ['#FEF3C7', '#FFFBEB'],
        accent: '#d97706',
        primary: '#b45309',
        headerImg: require('../../assets/images/gold.png'),
        description: 'Gold standard privileges. Share your golden moments.',
    },
    platinum: {
        name: 'Platinum',
        colors: ['#F3E8FF', '#FAF5FF'],
        accent: '#9333ea',
        primary: '#7e22ce',
        headerImg: require('../../assets/images/platinum.png'),
        description: 'Platinum prestige. Experience luxury together.',
    },
    vip: {
        name: 'VIP',
        colors: ['#ECFDF5', '#F0FDF4'],
        accent: '#059669',
        primary: '#047857',
        headerImg: require('../../assets/images/vip.png'),
        description: 'VIP exclusivity. A circle for the elite.',
    },
    diamond: {
        name: 'Diamond',
        colors: ['#E0F2FE', '#F0F9FF'],
        accent: '#0284c7',
        primary: '#0369a1',
        headerImg: require('../../assets/images/diamond.png'),
        description: 'Diamond brilliance. Shine with the best.',
    },
    business: {
        name: 'Business',
        colors: ['#FEE2E2', '#FEF2F2'],
        accent: '#dc2626',
        primary: '#b91c1c',
        headerImg: require('../../assets/images/business.png'),
        description: 'Business class network. Professional connections.',
    },
};

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';

export default function TierFeedScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { isRTL, language } = useLanguage();
    const rtl = language === 'ar' || isRTL;

    const tierKey = (params.tier as string)?.toLowerCase() || 'silver';

    // Move TIER_THEMES inside component or use memo to access translation
    const getTheme = (key: string) => {
        const themes: any = {
            silver: {
                name: t('membershipTiers.silver.name', 'Silver'),
                colors: ['#E0E7FF', '#FAFAFA'],
                accent: '#64748b',
                primary: '#475569',
                headerImg: require('../../assets/images/silver.png'),
                description: t('community.themes.silverDesc', 'Your journey starts here.'),
            },
            gold: {
                name: t('membershipTiers.gold.name', 'Gold'),
                colors: ['#FEF3C7', '#FFFBEB'],
                accent: '#d97706',
                primary: '#b45309',
                headerImg: require('../../assets/images/gold.png'),
                description: t('community.themes.goldDesc', 'Gold standard privileges.'),
            },
            platinum: {
                name: t('membershipTiers.platinum.name', 'Platinum'),
                colors: ['#F3E8FF', '#FAF5FF'],
                accent: '#9333ea',
                primary: '#7e22ce',
                headerImg: require('../../assets/images/platinum.png'),
                description: t('community.themes.platinumDesc', 'Platinum prestige.'),
            },
            vip: {
                name: t('membershipTiers.vip.name', 'VIP'),
                colors: ['#ECFDF5', '#F0FDF4'],
                accent: '#059669',
                primary: '#047857',
                headerImg: require('../../assets/images/vip.png'),
                description: t('community.themes.vipDesc', 'VIP exclusivity.'),
            },
            diamond: {
                name: t('membershipTiers.diamond.name', 'Diamond'),
                colors: ['#E0F2FE', '#F0F9FF'],
                accent: '#0284c7',
                primary: '#0369a1',
                headerImg: require('../../assets/images/diamond.png'),
                description: t('community.themes.diamondDesc', 'Diamond brilliance.'),
            },
            business: {
                name: t('membershipTiers.business.name', 'Business'),
                colors: ['#FEE2E2', '#FEF2F2'],
                accent: '#dc2626',
                primary: '#b91c1c',
                headerImg: require('../../assets/images/business.png'),
                description: t('community.themes.businessDesc', 'Business class network.'),
            },
        };
        return themes[key] || themes['silver'];
    };

    const theme = getTheme(tierKey);

    const [posts, setPosts] = useState<TierPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImageUrl, setNewPostImageUrl] = useState('');
    const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
    const [creating, setCreating] = useState(false);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [postComments, setPostComments] = useState<TierComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [sortBy, setSortBy] = useState<'recent' | 'liked' | 'discussed'>('recent');

    const loadPosts = async () => {
        try {
            const data = await tierPostsApi.getPosts(tierKey.toUpperCase());
            setPosts(data);
        } catch (error: any) {
            console.error('Error loading posts:', error);
            console.error('Error loading posts:', error);
            Alert.alert(t('community.error', 'Error'), error.message || 'Failed to load posts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [tierKey]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    const pickImage = async () => {
        // Request permission
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert(t('community.error', 'Permission Required'), t('community.permissionCamera', 'Please allow access to your photo library'));
            return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setNewPostImageUrl(base64);
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) {
            Alert.alert(t('community.error', 'Error'), t('community.enterContent', 'Please enter some content'));
            return;
        }

        setCreating(true);
        try {
            const newPost = await tierPostsApi.createPost({
                tier_code: tierKey.toUpperCase(),
                content: newPostContent,
                image_url: newPostImageUrl.trim() || undefined,
            });

            // Add the new post to the top of the feed immediately
            setPosts([newPost, ...posts]);

            // Reset form and close modal
            setNewPostContent('');
            setNewPostImageUrl('');
            setShowCreateModal(false);

            // No Alert - user sees the post with "Pending" badge immediately
        } catch (error: any) {
            Alert.alert(t('community.error', 'Error'), error.message || t('community.createFailed', 'Failed to create post'));
        } finally {
            setCreating(false);
        }
    };

    const handleToggleLike = async (postId: string) => {
        try {
            await tierPostsApi.toggleLike(postId);
            // Optimistically update UI
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        is_liked_by_current_user: !p.is_liked_by_current_user,
                        likes_count: p.is_liked_by_current_user ? p.likes_count - 1 : p.likes_count + 1
                    };
                }
                return p;
            }));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to toggle like');
        }
    };



    const fetchComments = async (postId: string) => {
        setLoadingComments(true);
        try {
            const data = await tierPostsApi.getComments(postId);
            setPostComments(data);
        } catch (error: any) {
            console.error('Error loading comments:', error);
            Alert.alert('Error', 'Failed to load comments');
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedPostId) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        setCreating(true);
        try {
            await tierPostsApi.addComment(selectedPostId, newComment);
            setNewComment('');
            // Refresh comments to show the new one (pending)
            await fetchComments(selectedPostId);

            // Don't close modal, just show success toast if we had one, or nothing for smooth UX
            // "Your comment has been submitted for review" - let's keep it for clarity
            Alert.alert(t('community.success', 'Success'), t('community.submitted', 'Your comment has been submitted for review'));
        } catch (error: any) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', error.message || 'Failed to add comment');
        } finally {
            setCreating(false);
        }
    };


    const handleShare = async (post: TierPost) => {
        try {
            const message = `Check out this post from ${post.user_first_name} ${post.user_last_name}:\n\n${post.content}`;
            await Share.share({
                message,
                title: t('community.shareTitle', { tier: tierKey.toUpperCase() }),
            });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to share');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('chat.now', 'Just now');
        if (diffMins < 60) return `${diffMins}${t('common.m', 'm')} ${t('common.ago', 'ago')}`;
        if (diffHours < 24) return `${diffHours}${t('common.h', 'h')} ${t('common.ago', 'ago')}`;
        if (diffDays < 7) return `${diffDays}${t('common.d', 'd')} ${t('common.ago', 'ago')}`;
        return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header: physical leading = back (Arabic uses forward chevron), trailing = menu */}
            <View
                style={[styles.header, { paddingTop: insets.top + 10 }, rtl && styles.headerPhysicalLTR]}
                {...(Platform.OS === 'web' && rtl ? ({ dir: 'ltr' } as object) : {})}
            >
                <View style={styles.headerSlot}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
                        <Ionicons name={rtl ? 'arrow-forward' : 'arrow-back'} size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, rtl && styles.headerTitleArabic]} numberOfLines={1}>
                        {t(`community.title_${tierKey}`, `community.title`)}
                    </Text>
                </View>
                <View style={styles.headerSlot}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(true)}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
                }
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={theme.colors}
                    start={{ x: rtl ? 1 : 0, y: 0 }}
                    end={{ x: rtl ? 0 : 1, y: 1 }}
                    style={styles.heroSection}
                >
                    <View style={[styles.heroContent, rtl && styles.heroContentRTL]}>
                        <View style={[styles.badgeContainer, { backgroundColor: theme.primary }, rtl && styles.badgeRTL]}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={[styles.badgeText, rtl && styles.badgeTextRTL]}>
                                {t("community.officialHub", "OFFICIAL MEMBER HUB")}
                            </Text>
                        </View>
                        <Text style={[styles.heroTitle, { color: theme.primary }, rtl && styles.heroTextRTL]}>
                            {t('community.lounge', { tier: theme.name })}
                        </Text>
                        <Text style={[styles.heroDesc, { color: theme.accent }, rtl && styles.heroTextRTL]}>
                            {theme.description}
                        </Text>
                    </View>
                    <Image
                        source={theme.headerImg}
                        style={[styles.heroImage, rtl ? styles.heroImageRTL : styles.heroImageLTR]}
                        resizeMode="contain"
                    />
                </LinearGradient>

                {/* Create Post Input — explicit LTR/RTL order so web matches mobile */}
                <View style={styles.createPostContainer}>
                    {rtl ? (
                        <>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.colors[0] }]}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Ionicons name="images" size={20} color={theme.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createPostInput} onPress={() => setShowCreateModal(true)}>
                                <Text style={[styles.createPostPlaceholder, styles.placeholderRTL]}>
                                    {t('community.shareExperience', 'Share your experience...')}
                                </Text>
                            </TouchableOpacity>
                            <Image
                                source={{ uri: user?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                style={styles.userAvatarSmall}
                            />
                        </>
                    ) : (
                        <>
                            <Image
                                source={{ uri: user?.avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                style={styles.userAvatarSmall}
                            />
                            <TouchableOpacity style={styles.createPostInput} onPress={() => setShowCreateModal(true)}>
                                <Text style={styles.createPostPlaceholder}>
                                    {t('community.shareExperience', 'Share your experience...')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: theme.colors[0] }]}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Ionicons name="images" size={20} color={theme.primary} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Feed Posts */}
                <Text style={[styles.feedLabel, rtl && { textAlign: 'right' }]}>{t('community.latestDiscussions', 'Latest Discussions')}</Text>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : posts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                        <Text style={styles.emptyText}>{t('community.noPosts', 'No posts yet')}</Text>
                        <Text style={styles.emptySubtext}>{t('community.beFirst', 'Be the first to share something!')}</Text>
                    </View>
                ) : (
                    [...posts].sort((a, b) => {
                        if (sortBy === 'liked') return (b.likes_count || 0) - (a.likes_count || 0);
                        if (sortBy === 'discussed') return (b.comments_count || 0) - (a.comments_count || 0);
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }).map((post) => (
                        <View key={post.id} style={styles.postCard}>
                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                <Image
                                    source={{ uri: post.user_avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                    style={styles.postAvatar}
                                />
                                <View style={[styles.postMeta, rtl ? styles.postMetaRTL : styles.postMetaLTR]}>
                                    <Text style={[styles.postAuthor, rtl && { textAlign: 'right' }]}>
                                        {post.user_first_name || ''} {post.user_last_name || ''}
                                    </Text>
                                    <Text style={[styles.postTime, rtl && { textAlign: 'right' }]}>{formatTime(post.created_at)}</Text>
                                </View>
                                {post.status === 'PENDING' ? (
                                    <View style={styles.pendingBadge}>
                                        <Text style={styles.pendingText}>{t('community.pending', 'Pending')}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Post Content */}
                            <Text style={[styles.postBody, rtl && { textAlign: 'right' }]}>{post.content || ''}</Text>

                            {/* Post Image */}
                            {post.image_url ? (
                                <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
                            ) : null}

                            {/* Post Actions */}
                            <View style={styles.postActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton]}
                                    onPress={() => handleToggleLike(post.id)}
                                >
                                    <Ionicons
                                        name={post.is_liked_by_current_user ? "heart" : "heart-outline"}
                                        size={22}
                                        color={post.is_liked_by_current_user ? "#ef4444" : "#64748b"}
                                    />
                                    {(post.likes_count != null && post.likes_count > 0) ? (
                                        <Text style={[
                                            styles.actionText,
                                            post.is_liked_by_current_user && { color: "#ef4444", fontWeight: '600' }
                                        ]}>
                                            {post.likes_count}
                                        </Text>
                                    ) : null}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton]}
                                    onPress={() => {
                                        setSelectedPostId(post.id);
                                        fetchComments(post.id);
                                        setShowCommentModal(true);
                                    }}
                                >
                                    <Ionicons name="chatbubble-outline" size={20} color="#64748b" />
                                    {(post.comments_count != null && post.comments_count > 0) ? (
                                        <Text style={styles.actionText}>{post.comments_count}</Text>
                                    ) : null}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton]}
                                    onPress={() => handleShare(post)}
                                >
                                    <Ionicons name="share-social-outline" size={20} color="#64748b" />
                                    <Text style={styles.actionText}>{t("common.share")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Options Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View
                        style={[
                            styles.menuContainer,
                            styles.menuContainerPosition,
                            { top: insets.top + 60 },
                            rtl && styles.menuContainerRTL,
                        ]}
                        {...(Platform.OS === 'web' && rtl ? ({ dir: 'rtl' } as object) : {})}
                    >
                        <Text style={[styles.menuHeader, rtl && { textAlign: 'right' }]}>{t('community.sortBy', 'Sort By')}</Text>
                        <TouchableOpacity
                            style={[styles.menuItem, sortBy === 'recent' && styles.menuItemActive]}
                            onPress={() => { setSortBy('recent'); setShowMenu(false); }}
                        >
                            <View style={styles.menuItemIconWrap}>
                                <Ionicons name="time-outline" size={20} color={sortBy === 'recent' ? theme.primary : '#475569'} />
                            </View>
                            <Text style={[styles.menuText, sortBy === 'recent' && { color: theme.primary, fontWeight: '600' }]}>{t('community.mostRecent', 'Most Recent')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, sortBy === 'liked' && styles.menuItemActive]}
                            onPress={() => { setSortBy('liked'); setShowMenu(false); }}
                        >
                            <View style={styles.menuItemIconWrap}>
                                <Ionicons name="heart-outline" size={20} color={sortBy === 'liked' ? theme.primary : '#475569'} />
                            </View>
                            <Text style={[styles.menuText, sortBy === 'liked' && { color: theme.primary, fontWeight: '600' }]}>{t('community.mostLiked', 'Most Liked')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, sortBy === 'discussed' && styles.menuItemActive]}
                            onPress={() => { setSortBy('discussed'); setShowMenu(false); }}
                        >
                            <View style={styles.menuItemIconWrap}>
                                <Ionicons name="chatbubbles-outline" size={20} color={sortBy === 'discussed' ? theme.primary : '#475569'} />
                            </View>
                            <Text style={[styles.menuText, sortBy === 'discussed' && { color: theme.primary, fontWeight: '600' }]}>{t('community.mostDiscussed', 'Most Discussed')}</Text>
                        </TouchableOpacity>

                        <View style={styles.menuDivider} />

                        <TouchableOpacity
                            style={[styles.menuItem]}
                            onPress={() => {
                                setShowMenu(false);
                                Alert.alert(
                                    t('community.guidelines', 'Community Guidelines'),
                                    '1. Be professional.\n2. No hate speech.\n3. Respect privacy.',
                                    [{ text: t('common.ok', 'OK') }]
                                );
                            }}
                        >
                            <View style={styles.menuItemIconWrap}>
                                <Ionicons name="information-circle-outline" size={20} color="#475569" />
                            </View>
                            <Text style={styles.menuText}>{t('community.guidelines', 'Guidelines')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Create Post Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, rtl && styles.modalHeaderRTL]}>
                            <Text style={[styles.modalTitle, rtl && styles.textRTL]}>{t('community.createPost', 'Create Post')}</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.modalInput, rtl && { textAlign: 'right' }]}
                            placeholder={t('community.shareThoughts', "Share your thoughts...")}
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={6}
                            value={newPostContent}
                            onChangeText={setNewPostContent}
                            textAlignVertical="top"
                        />


                        {/* Image Source Selector */}
                        <View style={[styles.imageSourceSelector, rtl && styles.rowReverse]}>
                            <TouchableOpacity
                                style={[styles.sourceButton, imageSource === 'url' && styles.sourceButtonActive]}
                                onPress={() => {
                                    setImageSource('url');
                                    setNewPostImageUrl('');
                                }}
                            >
                                <Ionicons name="link" size={20} color={imageSource === 'url' ? theme.primary : '#64748b'} />
                                <Text style={[styles.sourceButtonText, imageSource === 'url' && { color: theme.primary, fontWeight: '600' }]}>
                                    {t('community.url', 'URL')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.sourceButton, imageSource === 'upload' && styles.sourceButtonActive]}
                                onPress={() => {
                                    setImageSource('upload');
                                    setNewPostImageUrl('');
                                }}
                            >
                                <Ionicons name="cloud-upload" size={20} color={imageSource === 'upload' ? theme.primary : '#64748b'} />
                                <Text style={[styles.sourceButtonText, imageSource === 'upload' && { color: theme.primary, fontWeight: '600' }]}>
                                    {t('community.upload', 'Upload')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Conditional Input */}
                        {imageSource === 'url' ? (
                            <TextInput
                                style={[styles.modalImageInput, rtl && { textAlign: 'right' }]}
                                placeholder={t('community.urlPlaceholder', "Image URL (optional)")}
                                placeholderTextColor="#94a3b8"
                                value={newPostImageUrl}
                                onChangeText={setNewPostImageUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        ) : (
                            <TouchableOpacity
                                style={[styles.uploadButton, { borderColor: theme.colors[0] }]}
                                onPress={pickImage}
                            >
                                <Ionicons name="images" size={28} color={theme.primary} />
                                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
                                    {t('community.chooseGallery', 'Choose from Gallery')}
                                </Text>
                            </TouchableOpacity>
                        )}


                        {newPostImageUrl.trim() ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image
                                    source={{ uri: newPostImageUrl }}
                                    style={styles.imagePreview}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity
                                    style={styles.removeImageBtn}
                                    onPress={() => setNewPostImageUrl('')}
                                >
                                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: theme.primary }]}
                            onPress={handleCreatePost}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonText}>{t('community.post', 'Post')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Comment Modal */}
            <Modal
                visible={showCommentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCommentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, rtl && styles.modalHeaderRTL]}>
                            <Text style={[styles.modalTitle, rtl && styles.textRTL]}>{t('community.comments', 'Comments')}</Text>
                            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {loadingComments ? (
                            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView style={styles.commentsList}>
                                {postComments.length === 0 ? (
                                    <View style={styles.noCommentsContainer}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#cbd5e1" />
                                        <Text style={styles.noCommentsText}>{t('community.noComments', "No comments yet. Be the first!")}</Text>
                                    </View>
                                ) : (
                                    postComments.map((comment, index) => (
                                        <View key={comment.id || index} style={[styles.commentItem, rtl && styles.commentItemRTL]}>
                                            <Image
                                                source={{ uri: comment.user_avatar || 'https://randomuser.me/api/portraits/men/1.jpg' }}
                                                style={styles.commentAvatar}
                                            />
                                            <View style={styles.commentContent}>
                                                <View style={[styles.commentHeader, rtl && styles.commentHeaderRTL]}>
                                                    <Text style={styles.commentAuthor}>
                                                        {comment.user_first_name} {comment.user_last_name}
                                                    </Text>
                                                    <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                                                </View>
                                                <Text style={[styles.commentText, rtl && { textAlign: 'right' }]}>{comment.content}</Text>
                                                {comment.status === 'PENDING' && (
                                                    <View style={{ backgroundColor: '#fef3c7', alignSelf: rtl ? 'flex-end' : 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                                                        <Text style={{ fontSize: 10, color: '#d97706', fontWeight: 'bold' }}>{t('community.pendingReview', 'Pending Review')}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}

                        <View style={[styles.commentInputContainer, rtl && styles.commentInputContainerRTL]}>
                            <TextInput
                                style={[styles.commentInput, rtl && { textAlign: 'right' }]}
                                placeholder={t('community.writeComment', "Write a comment...")}
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={newComment}
                                onChangeText={setNewComment}
                            />
                            <TouchableOpacity
                                style={[styles.sendCommentBtn, { backgroundColor: theme.primary }]}
                                onPress={handleAddComment}
                                disabled={creating || !newComment.trim()}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name={rtl ? "send-outline" : "send"} size={20} color="#fff" style={rtl && { transform: [{ rotate: '180deg' }] }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    /** Back on physical leading edge, menu on trailing edge (works on web + native RTL). */
    headerPhysicalLTR: {
        direction: 'ltr',
    },
    headerSlot: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleWrap: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
    },
    headerTitleArabic: {
        writingDirection: 'rtl',
    },
    textRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    writingRTL: {
        writingDirection: 'rtl',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        margin: 16,
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        height: 160,
    },
    heroContent: {
        flex: 1,
        paddingEnd: 10,
        zIndex: 2,
    },
    heroContentRTL: {
        paddingEnd: 0,
        paddingStart: 10,
        alignItems: 'flex-start',
        paddingLeft: 108,
    },
    heroImage: {
        width: 120,
        height: 120,
        position: 'absolute',
        bottom: -20,
        opacity: 0.9,
    },
    /** English: graphic on physical right (clear of LTR text on the left). */
    heroImageLTR: {
        right: -20,
        transform: [{ rotate: '-10deg' }],
    },
    /** Arabic: same asset on physical left so RTL text on the right doesn’t sit under it (logical `end` was unreliable on web). */
    heroImageRTL: {
        left: -20,
        transform: [{ rotate: '10deg' }],
    },
    heroTextRTL: {
        textAlign: 'right',
        alignSelf: 'stretch',
        writingDirection: 'rtl',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
        gap: 6,
    },
    /** `alignItems: flex-start` on hero + `direction: rtl` → badge sits top-right; star leads the phrase. */
    badgeRTL: {
        direction: 'rtl',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    badgeTextRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
        letterSpacing: 0,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
        textAlign: 'left',
    },
    heroDesc: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        textAlign: 'left',
    },
    createPostContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    userAvatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
    },
    createPostInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    createPostPlaceholder: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'left',
    },
    placeholderRTL: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
    },
    postMeta: {
        flex: 1,
    },
    postMetaLTR: {
        marginStart: 12,
    },
    postMetaRTL: {
        marginEnd: 12,
    },
    postAuthor: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    postTime: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    pendingBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pendingText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#d97706',
    },
    postBody: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        marginBottom: 12,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    postActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        padding: 24,
        minHeight: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    rowReverse: {
        flexDirection: 'row-reverse',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        fontSize: 16,
        color: '#1e293b',
        minHeight: 150,
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    modalImageInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        fontSize: 14,
        color: '#1e293b',
        marginBottom: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    modalButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    menuContainer: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: 230,
        maxWidth: '92%' as const,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    /** ⋮ lives on physical right (header is `dir="ltr"`); always anchor menu there — do not use `left` in Arabic. */
    menuContainerPosition: {
        right: 20,
        left: 'auto' as const,
    },
    menuContainerRTL: {
        direction: 'rtl',
    },
    menuHeader: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 14,
    },
    menuItemIconWrap: {
        width: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuItemActive: {
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        paddingHorizontal: 8,
        marginHorizontal: -8,
    },
    menuText: {
        flex: 1,
        flexShrink: 1,
        fontSize: 15,
        color: '#475569',
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 8,
    },


    imageSourceSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    sourceButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8f9fa',
    },
    sourceButtonActive: {
        borderColor: '#1071b8',
        backgroundColor: '#e0f2fe',
    },
    sourceButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
        backgroundColor: '#f8f9fa',
        marginBottom: 16,
    },
    uploadButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    commentsList: {
        maxHeight: 400,
        marginBottom: 16,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    commentItemRTL: {
        flexDirection: 'row-reverse',
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
    },
    commentContent: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
        borderTopStartRadius: 4,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    commentTime: {
        fontSize: 12,
        color: '#94a3b8',
    },
    commentText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 20,
    },
    commentInputContainer: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    commentInputContainerRTL: {
        flexDirection: 'row-reverse',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1e293b',
        maxHeight: 100,
    },
    sendCommentBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noCommentsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    noCommentsText: {
        fontSize: 14,
        color: '#94a3b8',
    },
});
