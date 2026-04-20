import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, Dimensions, useWindowDimensions, ActivityIndicator, Text, TouchableOpacity, Modal, TextInput, Alert, Share, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import ReelItem from '../../components/reels/ReelItem';
import { reelsService, Reel } from '../../src/services/reels';
import { authApi, User, api } from '../../src/services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Comment Item Component
interface CommentItemProps {
    comment: any;
    onLike: () => void;
    onReply: () => void;
    level?: number; // For nested replies
}

const CommentItemComponent: React.FC<CommentItemProps> = ({ comment, onLike, onReply, level = 0 }) => {
    const [showReplies, setShowReplies] = useState(false);
    const { t, i18n } = useTranslation();
    const { isRTL } = useLanguage();

    return (
        <View style={[styles.commentItem, level > 0 && styles.replyItem, level > 0 && isRTL && styles.replyItemRTL]}>
            <View style={styles.commentHeader}>
                <View style={[styles.commentUserRow]}>
                    {comment.user_avatar ? (() => {
                        const baseUrl = api.getBaseUrl().replace('/api', '');
                        let avatarUri = comment.user_avatar;

                        // Handle base64 images
                        if (avatarUri.startsWith('data:image')) {
                            // Already a data URI, use as-is
                        } else if (avatarUri.startsWith('http://') || avatarUri.startsWith('https://')) {
                            // Already a full URL, use as-is
                        } else {
                            // Relative path, prepend base URL
                            avatarUri = `${baseUrl}${avatarUri.startsWith('/') ? '' : '/'}${avatarUri}`;
                        }

                        return (
                            <Image
                                source={{ uri: avatarUri }}
                                style={[styles.commentAvatar, isRTL && styles.commentAvatarRTL]}
                                onError={() => {
                                    // Fallback handled by placeholder below
                                    console.log('Failed to load avatar:', comment.user_avatar);
                                }}
                            />
                        );
                    })() : (
                        <View style={[styles.commentAvatarPlaceholder, isRTL && styles.commentAvatarPlaceholderRTL]}>
                            <Text style={styles.commentAvatarText}>
                                {(comment.user_name || t('common.anonymous'))[0]?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.commentUserInfo}>
                        <Text style={[styles.commentUser, isRTL && styles.textRTL]}>{comment.user_name || t('common.anonymous')}</Text>
                        <Text style={[styles.commentTime, isRTL && styles.textRTL]}>
                            {new Date(comment.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.commentContent, isRTL && styles.textRTL]}>{comment.content}</Text>

            {/* Action Row: Like, Reply */}
            <View style={[styles.commentActions]}>
                <TouchableOpacity style={styles.commentActionButton} onPress={onLike}>
                    <Ionicons name="heart-outline" size={18} color="#666" />
                    <Text style={[styles.commentActionText, isRTL && styles.textRTL]}>
                        {comment.likes_count > 0 ? comment.likes_count : t('reels.like')}
                    </Text>
                </TouchableOpacity>

                {level === 0 && ( // Only allow reply to top-level comments
                    <TouchableOpacity style={styles.commentActionButton} onPress={onReply}>
                        <Ionicons name="chatbubble-outline" size={16} color="#666" />
                        <Text style={[styles.commentActionText, isRTL && styles.textRTL]}>{t('reels.reply')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Show Replies Toggle (placeholder for nested replies) */}
            {level === 0 && comment.replies && comment.replies.length > 0 && (
                <TouchableOpacity
                    style={[styles.showRepliesButton]}
                    onPress={() => setShowReplies(!showReplies)}
                >
                    <Text style={[styles.showRepliesText, isRTL && styles.textRTL]}>
                        {showReplies ? t('reels.hide') : t('reels.view')} {comment.replies.length} {comment.replies.length === 1 ? t('reels.reply') : t('reels.replies')}
                    </Text>
                    <Ionicons
                        name={showReplies ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#007AFF"
                    />
                </TouchableOpacity>
            )}

            {/* Nested Replies */}
            {showReplies && comment.replies && comment.replies.map((reply: any) => (
                <CommentItemComponent
                    key={reply.id}
                    comment={reply}
                    onLike={() => onLike()} // TODO: Implement reply like
                    onReply={() => { }} // Don't allow nested replies
                    level={level + 1}
                />
            ))}
        </View>
    );
};

export default function ReelsPage() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const params = useLocalSearchParams();
    const { height } = useWindowDimensions();

    const [reels, setReels] = useState<Reel[]>([]);
    const [allReels, setAllReels] = useState<Reel[]>([]); // For search
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPageFocused, setIsPageFocused] = useState(true);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const activeIndexRef = useRef(0);
    const router = useRouter();

    // Focus handling to pause videos when leaving tab
    useFocusEffect(
        useCallback(() => {
            setIsPageFocused(true);
            return () => {
                setIsPageFocused(false);
            };
        }, [])
    );

    const fetchCurrentUser = async () => {
        try {
            const user = await authApi.me();
            setCurrentUser(user);
        } catch (error) {
            console.error("Failed to fetch current user", error);
        }
    };

    const fetchReels = async () => {
        try {
            console.log('[REELS] Starting fetchReels...');
            setLoading(true);
            const data = await reelsService.getReels(0, 50); // Fetch more for search
            console.log('[REELS] Fetched data:', data?.length, 'reels');

            // Filter to only ACTIVE reels (should already be filtered by backend, but double-check)
            const activeReels = data.filter(reel => reel.status === 'ACTIVE');
            console.log('[REELS] Active reels after filter:', activeReels.length);

            setReels(activeReels);
            setAllReels(activeReels); // Store all reels for search

            // If reelId is provided in params, scroll to that reel
            if (params.reelId && typeof params.reelId === 'string') {
                const targetIndex = activeReels.findIndex(r => r.id === params.reelId);
                console.log('[REELS] Target reel index:', targetIndex, 'for reelId:', params.reelId);
                if (targetIndex >= 0) {
                    // Set active index immediately
                    setActiveIndex(targetIndex);
                    // Use scrollToOffset for more reliable scrolling
                    setTimeout(() => {
                        const offset = targetIndex * height;
                        flatListRef.current?.scrollToOffset({ offset, animated: false });
                        console.log('[REELS] Scrolled to offset:', offset);
                    }, 1000); // Increased wait time for list to fully render
                } else {
                    console.warn('[REELS] Reel not found in list:', params.reelId);
                }
            }
        } catch (error) {
            console.error("[REELS] Failed to fetch reels", error);
            setReels([]); // Ensure empty state on error
            setAllReels([]);
        } finally {
            setLoading(false);
            console.log('[REELS] Loading complete');
        }
    };

    useEffect(() => {
        fetchReels();
        fetchCurrentUser();
    }, [params.reelId]); // Re-fetch when reelId changes

    // Log active index changes for debugging
    useEffect(() => {
        if (__DEV__) {
            console.log('Active index updated:', activeIndex, 'Page focused:', isPageFocused);
        }
        activeIndexRef.current = activeIndex;
    }, [activeIndex, isPageFocused]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setReels(allReels);
            return;
        }

        const filtered = allReels.filter(reel =>
            reel.title?.toLowerCase().includes(query.toLowerCase()) ||
            reel.description?.toLowerCase().includes(query.toLowerCase()) ||
            reel.user?.name?.toLowerCase().includes(query.toLowerCase())
        );
        setReels(filtered);
    };

    const syncActiveIndexFromOffset = useCallback((offsetY: number) => {
        if (!reels.length) return;

        const maxIndex = reels.length - 1;
        const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(offsetY / height)));

        if (nextIndex !== activeIndexRef.current) {
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);

            if (__DEV__) {
                console.log('Active reel changed to index:', nextIndex);
            }
        }
    }, [reels.length]);

    const onMomentumScrollEnd = useCallback((event: any) => {
        syncActiveIndexFromOffset(event?.nativeEvent?.contentOffset?.y || 0);
    }, [syncActiveIndexFromOffset]);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            const centeredItem = viewableItems.find((item: any) => item.isViewable) || viewableItems[0];
            const newIndex = centeredItem?.index ?? 0;

            if (newIndex !== activeIndexRef.current) {
                activeIndexRef.current = newIndex;
                setActiveIndex(newIndex);

                if (__DEV__) {
                    console.log('Active reel changed via viewability to index:', newIndex);
                }
            }
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
        minimumViewTime: 50,
    }).current;

    const handleInteract = async (reelId: string, type: 'LIKE' | 'COMMENT' | 'SHARE') => {
        try {
            // Optimistic update
            if (type === 'LIKE') {
                setReels(prev => prev.map(r => {
                    if (r.id === reelId) {
                        const newLiked = !r.is_liked;
                        return {
                            ...r,
                            is_liked: newLiked,
                            likes_count: newLiked ? r.likes_count + 1 : Math.max(0, r.likes_count - 1)
                        };
                    }
                    return r;
                }));
            }

            await reelsService.interact(reelId, type);

        } catch (error) {
            console.error("Interaction failed", error);
            // Revert if needed
        }
    };

    const handleView = async (reelId: string) => {
        try {
            await reelsService.interact(reelId, 'VIEW');
            // Update view count locally? usually typically not instant/critical for self
        } catch (error) {
            console.error("View count failed", error);
        }
    };

    const handleComment = async (reelId: string) => {
        setSelectedReelId(reelId);
        setCommentModalVisible(true);

        // Fetch existing comments
        setLoadingComments(true);
        try {
            const fetchedComments = await reelsService.getComments(reelId);
            // Group replies with their parent comments
            const groupedComments = groupCommentsWithReplies(fetchedComments);
            setComments(groupedComments);
        } catch (error) {
            console.error("Failed to fetch comments", error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    // Helper function to group comments with their replies
    const groupCommentsWithReplies = (allComments: any[]) => {
        // Separate top-level comments and replies
        const topLevelComments = allComments.filter(c => !c.parent_id);
        const replies = allComments.filter(c => c.parent_id);

        // Map replies to their parent comments
        return topLevelComments.map(comment => {
            const commentReplies = replies.filter(r => r.parent_id === comment.id);
            return {
                ...comment,
                replies: commentReplies
            };
        });
    };

    const handleSubmitComment = async () => {
        if (!commentText.trim() || !selectedReelId) return;

        try {
            await reelsService.interact(selectedReelId, 'COMMENT', commentText);
            // Update comment count
            setReels(prev => prev.map(r =>
                r.id === selectedReelId
                    ? { ...r, comments_count: r.comments_count + 1 }
                    : r
            ));

            // Refresh comments list with grouped replies
            const fetchedComments = await reelsService.getComments(selectedReelId);
            const groupedComments = groupCommentsWithReplies(fetchedComments);
            setComments(groupedComments);

            setCommentText('');
            Alert.alert(t('reels.success'), t('reels.commentAdded'));
        } catch (error) {
            console.error("Comment failed", error);
            Alert.alert(t('reels.error'), t('reels.failedToAddComment'));
        }
    };

    const handleLikeComment = async (commentId: string) => {
        try {
            // Optimistic update - find comment in nested structure
            setComments(prev => prev.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        likes_count: (comment.likes_count || 0) + 1
                    };
                }
                // Check in replies
                if (comment.replies) {
                    return {
                        ...comment,
                        replies: comment.replies.map((reply: any) =>
                            reply.id === commentId
                                ? { ...reply, likes_count: (reply.likes_count || 0) + 1 }
                                : reply
                        )
                    };
                }
                return comment;
            }));

            await reelsService.likeComment(commentId);

            // Refresh to get accurate count (in case of unlike)
            if (selectedReelId) {
                const fetchedComments = await reelsService.getComments(selectedReelId);
                const groupedComments = groupCommentsWithReplies(fetchedComments);
                setComments(groupedComments);
            }
        } catch (error) {
            console.error("Like comment failed", error);
            // Revert optimistic update
            if (selectedReelId) {
                const fetchedComments = await reelsService.getComments(selectedReelId);
                const groupedComments = groupCommentsWithReplies(fetchedComments);
                setComments(groupedComments);
            }
        }
    };

    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const handleReplyToComment = (commentId: string) => {
        setReplyingTo(commentId);
        setCommentText('');
    };

    const handleSubmitReply = async () => {
        if (!commentText.trim() || !replyingTo) return;

        try {
            await reelsService.replyToComment(replyingTo, commentText);

            // Refresh comments to show the new reply with grouped structure
            if (selectedReelId) {
                const fetchedComments = await reelsService.getComments(selectedReelId);
                const groupedComments = groupCommentsWithReplies(fetchedComments);
                setComments(groupedComments);
            }

            setCommentText('');
            setReplyingTo(null);
            Alert.alert(t('reels.success'), t('reels.replyAdded'));
        } catch (error) {
            console.error("Reply failed", error);
            Alert.alert(t('reels.error'), t('reels.failedToAddReply'));
        }
    };

    const handleShare = async (reelId: string) => {
        try {
            const reel = reels.find(r => r.id === reelId);
            if (!reel) return;

            await Share.share({
                message: `Check out this reel: ${reel.title || reel.description || 'Amazing content!'}`,
                url: reel.video_url,
            });

            // Track share
            await reelsService.interact(reelId, 'SHARE');
            setReels(prev => prev.map(r =>
                r.id === reelId
                    ? { ...r, shares_count: r.shares_count + 1 }
                    : r
            ));
        } catch (error) {
            console.error("Share failed", error);
        }
    };

    if (loading && reels.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Custom Header Overlay - Matching Reference */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={28} color="white" />
                </TouchableOpacity>

                {/* Center: Reels Title */}
                <Text style={styles.headerTitle}>{t('reels.title')}</Text>

                {/* Right: Search + Profile */}
                <View style={[styles.headerIcons]}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setSearchModalVisible(true)}>
                        <Ionicons name="search" size={26} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        {currentUser?.avatar ? (
                            <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={30} color="white" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Helper text or empty state */}
            {reels.length === 0 && !loading && (
                <View style={styles.center}>
                    <Text style={[{ color: 'white' }, isRTL && { textAlign: 'right' }]}>
                        {searchQuery ? t('reels.noReelsFound') : t('reels.noReelsAvailable')}
                    </Text>
                </View>
            )}

            {/* Search Modal */}
            <Modal
                visible={searchModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setSearchModalVisible(false);
                    setSearchQuery('');
                    setReels(allReels);
                }}
            >
                <View style={styles.searchModalContainer}>
                    <View style={styles.searchModalContent}>
                        <View style={[styles.searchHeader]}>
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchModalVisible(false);
                                    setSearchQuery('');
                                    setReels(allReels);
                                }}
                            >
                                <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#333" />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.searchInput, isRTL && styles.searchInputRTL]}
                                placeholder={t('reels.searchPlaceholder')}
                                value={searchQuery}
                                onChangeText={handleSearch}
                                autoFocus
                                textAlign={isRTL ? 'right' : 'left'}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => {
                                    setSearchQuery('');
                                    setReels(allReels);
                                }}>
                                    <Ionicons name="close-circle" size={24} color="#666" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[styles.searchResults]}>
                            <Text style={[styles.searchResultsText, isRTL && styles.textRTL]}>
                                {reels.length} {reels.length === 1 ? t('reels.reelFound') : t('reels.reelsFound')}
                            </Text>
                            <TouchableOpacity
                                style={styles.closeSearchButton}
                                onPress={() => setSearchModalVisible(false)}
                            >
                                <Text style={[styles.closeSearchButtonText, isRTL && styles.textRTL]}>{t('reels.viewResults')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <FlatList
                ref={flatListRef}
                style={{ flex: 1, backgroundColor: 'black' }}
                data={reels}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ReelItem
                        item={item}
                        isActive={isPageFocused && index === activeIndex}
                        onLike={() => handleInteract(item.id, 'LIKE')}
                        onComment={() => handleComment(item.id)}
                        onShare={() => handleShare(item.id)}
                        onView={() => handleView(item.id)}
                    />
                )}
                pagingEnabled
                disableIntervalMomentum
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                onMomentumScrollEnd={onMomentumScrollEnd}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
                contentContainerStyle={{ flexGrow: 1 }}
                getItemLayout={(_, index) => ({
                    length: height,
                    offset: height * index,
                    index,
                })}
                removeClippedSubviews
            />

            {/* Comment Modal */}
            <Modal
                visible={commentModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCommentModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.commentModal, isRTL && styles.commentModalRTL]}>
                        <View style={[styles.modalHeader]}>
                            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('reels.comments')}</Text>
                            <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Comments List */}
                        <FlatList
                            data={comments}
                            keyExtractor={(item) => item.id}
                            style={styles.commentsList}
                            ListEmptyComponent={
                                loadingComments ? (
                                    <ActivityIndicator size="small" color="#999" />
                                ) : (
                                    <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('reels.noComments')}</Text>
                                )
                            }
                            renderItem={({ item }) => (
                                <CommentItemComponent
                                    comment={item}
                                    onLike={() => handleLikeComment(item.id)}
                                    onReply={() => handleReplyToComment(item.id)}
                                />
                            )}
                        />

                        {/* Add Comment/Reply Input */}
                        <View style={styles.addCommentSection}>
                            {replyingTo && (
                                <View style={[styles.replyingToBar]}>
                                    <Text style={[styles.replyingToText, isRTL && styles.textRTL]}>
                                        {t('reels.replyingTo')} {comments.find(c => c.id === replyingTo)?.user_name || t('reels.comment')}
                                    </Text>
                                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                        <Ionicons name="close-circle" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <View style={[styles.inputRow]}>
                                <TextInput
                                    style={[styles.commentInput, isRTL && styles.commentInputRTL]}
                                    placeholder={replyingTo ? t('reels.writeReply') : t('reels.writeComment')}
                                    placeholderTextColor="#999"
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    multiline
                                />
                                <TouchableOpacity
                                    style={[styles.submitButton, !commentText.trim() && styles.submitButtonDisabled]}
                                    onPress={replyingTo ? handleSubmitReply : handleSubmitComment}
                                    disabled={!commentText.trim()}
                                >
                                    <Ionicons
                                        name="send"
                                        size={20}
                                        color={commentText.trim() ? "white" : "#999"}
                                    />
                                </TouchableOpacity>
                            </View>
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
        backgroundColor: 'black',
    },
    center: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },

    backButton: {
        padding: 4,
        zIndex: 2,
    },
    headerTitle: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 10, // Match paddingBottom
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
        zIndex: 1,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        zIndex: 2,
    },

    iconButton: {
        padding: 4,
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'white',
    },
    searchModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    searchModalContent: {
        backgroundColor: 'white',
        borderBottomStartRadius: 20,
        borderBottomEndRadius: 20,
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },

    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    searchInputRTL: {
        textAlign: 'right',
    },
    searchResults: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },

    searchResultsText: {
        fontSize: 14,
        color: '#666',
    },
    closeSearchButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    closeSearchButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    commentModal: {
        backgroundColor: 'white',
        borderTopStartRadius: 20,
        borderTopEndRadius: 20,
        padding: 20,
        height: '80%',
        maxHeight: 600,
    },
    commentModalRTL: {
        // RTL adjustments for comment modal if needed
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    textRTL: {
        textAlign: 'right',
    },
    commentsList: {
        flex: 1,
        marginBottom: 15,
    },
    commentItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    commentUser: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    commentContent: {
        fontSize: 15,
        color: '#555',
        marginBottom: 4,
    },
    commentTime: {
        fontSize: 12,
        color: '#999',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        marginTop: 20,
    },
    addCommentSection: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 15,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginEnd: 10,
        fontSize: 15,
        maxHeight: 100,
    },
    commentInputRTL: {
//         marginEnd: 0,  /* removed double-flip for Native RTL */
//         marginStart: 10,  /* removed double-flip for Native RTL */
    },
    submitButton: {
        backgroundColor: '#007AFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    // New styles for comment features
    replyItem: {
        marginStart: 40,
        paddingStart: 12,
        borderLeftWidth: 2,
        borderLeftColor: '#e0e0e0',
    },
    replyItemRTL: {
//         marginStart: 0,  /* removed double-flip for Native RTL */
//         marginEnd: 40,  /* removed double-flip for Native RTL */
        paddingStart: 0,
        paddingEnd: 12,
        borderLeftWidth: 0,
        borderRightWidth: 2,
        borderRightColor: '#e0e0e0',
    },
    commentHeader: {
        marginBottom: 8,
    },
    commentUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
    },
    commentAvatarRTL: {
        // No specific RTL changes needed for avatar
    },
    commentAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    commentAvatarPlaceholderRTL: {
        // No specific RTL changes needed for placeholder
    },
    commentAvatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    commentUserInfo: {
        flex: 1,
    },
    commentActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginTop: 8,
    },

    commentActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentActionText: {
        color: '#666',
        fontSize: 13,
    },
    showRepliesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },

    showRepliesText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
    replyingToBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 8,
    },

    replyingToText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

});
