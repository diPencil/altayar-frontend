import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { ResizeMode } from 'expo-av/build/Video.types';
import { reelsService, Reel } from '../../../src/services/reels';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';

interface Comment {
    id: string;
    user_id: string;
    user_name?: string;
    user_avatar?: string;
    content: string;
    likes_count: number;
    parent_id?: string;
    created_at: string;
    replies?: Comment[];
}

export default function ReelDetailsPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    
    const [reel, setReel] = useState<Reel | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    
    // Edit Reel Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    
    // Status Change Modal
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    
    // Comment/Reply Modal
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        if (id) {
            fetchReelDetails();
            fetchComments();
        }
    }, [id]);

    const fetchReelDetails = async () => {
        try {
            setLoading(true);
            const reelData = await reelsService.getReel(id as string);
            setReel(reelData);
            setEditTitle(reelData.title || '');
            setEditDescription(reelData.description || '');
        } catch (error) {
            console.error('Failed to fetch reel:', error);
            Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.loadFailed", "Failed to load reel details"));
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            setLoadingComments(true);
            const commentsData = await reelsService.getComments(id as string);
            // Group comments with replies
            const grouped = groupCommentsWithReplies(commentsData);
            setComments(grouped);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };

    const groupCommentsWithReplies = (allComments: any[]): Comment[] => {
        const topLevel = allComments.filter(c => !c.parent_id);
        const replies = allComments.filter(c => c.parent_id);
        
        return topLevel.map(comment => ({
            ...comment,
            replies: replies.filter(r => r.parent_id === comment.id)
        }));
    };

    const handleEditReel = () => {
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!reel) return;
        
        try {
            await reelsService.updateReel(reel.id, {
                title: editTitle,
                description: editDescription,
            });
            
            setReel({
                ...reel,
                title: editTitle,
                description: editDescription,
            });
            
            setEditModalVisible(false);
            Alert.alert('Success', 'Reel updated successfully');
        } catch (error) {
            console.error('Update failed:', error);
            Alert.alert('Error', 'Failed to update reel');
        }
    };

    const handleDeleteReel = () => {
        Alert.alert(
            t("admin.manageReels.delete", "Delete"),
            t("admin.manageReels.deleteReelConfirm", "Are you sure you want to delete this reel? This action cannot be undone."),
            [
                { text: t("admin.manageReels.cancel", "Cancel"), style: 'cancel' },
                {
                    text: t("admin.manageReels.delete", "Delete"),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await reelsService.deleteReel(id as string);
                            Alert.alert(t("admin.manageReels.success", "Success"), t("admin.manageReels.reelDeleted", "Reel deleted successfully"));
                            router.back();
                        } catch (error) {
                            console.error('Delete failed:', error);
                            Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.reelDeleteFailed", "Failed to delete reel"));
                        }
                    }
                }
            ]
        );
    };

    const handleChangeStatus = async (newStatus: 'ACTIVE' | 'DRAFT' | 'PAUSED') => {
        if (!reel) return;
        
        try {
            await reelsService.updateReel(reel.id, {
                status: newStatus,
            });
            
            setReel({
                ...reel,
                status: newStatus,
            });
            
            setStatusModalVisible(false);
            Alert.alert(t("admin.manageReels.success", "Success"), `${t("admin.manageReels.statusChanged", "Reel status changed to")} ${newStatus}`);
        } catch (error) {
            console.error('Status change failed:', error);
            Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.statusChangeFailed", "Failed to change status"));
        }
    };

    const handleLikeComment = async (commentId: string) => {
        try {
            await reelsService.likeComment(commentId);
            // Refresh comments to show updated likes
            fetchComments();
        } catch (error) {
            console.error('Like comment failed:', error);
            Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.likeCommentFailed", "Failed to like comment"));
        }
    };

    const handleReplyToComment = (comment: Comment) => {
        setReplyingTo(comment);
        setReplyText('');
        setReplyModalVisible(true);
    };

    const handleSubmitReply = async () => {
        if (!replyingTo || !replyText.trim()) return;
        
        try {
            await reelsService.replyToComment(replyingTo.id, replyText);
            setReplyModalVisible(false);
            setReplyText('');
            setReplyingTo(null);
            Alert.alert(t("admin.manageReels.success", "Success"), t("admin.manageReels.replyAdded", "Reply added successfully"));
            fetchComments(); // Refresh to show new reply
        } catch (error) {
            console.error('Reply failed:', error);
            Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.replyFailed", "Failed to add reply"));
        }
    };

    const handleDeleteComment = (commentId: string) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await fetch(`${getApiBaseUrl()}/reels/admin/comments/${commentId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${await getAuthToken()}`
                                }
                            });
                            
                            if (response.ok) {
                                Alert.alert('Success', 'Comment deleted');
                                fetchComments();
                                if (reel) {
                                    setReel({
                                        ...reel,
                                        comments_count: Math.max(0, reel.comments_count - 1)
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Delete failed:', error);
                            Alert.alert('Error', 'Failed to delete comment');
                        }
                    }
                }
            ]
        );
    };

    const renderComment = (comment: Comment, isReply = false) => (
        <View key={comment.id} style={[styles.commentCard, isReply && (isRTL ? styles.replyCardRTL : styles.replyCard), isRTL && styles.commentCardRTL]}>
            <View style={[styles.commentHeader, isRTL && styles.commentHeaderRTL]}>
                <View style={[styles.commentUserRow, isRTL && styles.commentUserRowRTL]}>
                    {comment.user_avatar ? (
                        <Image source={{ uri: comment.user_avatar }} style={styles.commentAvatar} />
                    ) : (
                        <Ionicons name="person-circle" size={40} color="#999" />
                    )}
                    <View style={styles.commentUserInfo}>
                        <Text style={[styles.commentUser, isRTL && styles.textRTL]}>{comment.user_name || t("admin.manageReels.anonymous", "Anonymous")}</Text>
                        <Text style={[styles.commentTime, isRTL && styles.textRTL]}>
                            {new Date(comment.created_at).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.commentContent, isRTL && styles.textRTL]}>{comment.content}</Text>

            <View style={[styles.commentActions, isRTL && styles.commentActionsRTL]}>
                <TouchableOpacity 
                    style={[styles.commentAction, isRTL && styles.commentActionRTL]}
                    onPress={() => handleLikeComment(comment.id)}
                >
                    <Ionicons name="heart-outline" size={18} color="#666" />
                    <Text style={[styles.commentActionText, isRTL && styles.textRTL]}>
                        {comment.likes_count > 0 ? comment.likes_count : t("admin.manageReels.like", "Like")}
                    </Text>
                </TouchableOpacity>

                {!isReply && (
                    <TouchableOpacity 
                        style={[styles.commentAction, isRTL && styles.commentActionRTL]}
                        onPress={() => handleReplyToComment(comment)}
                    >
                        <Ionicons name="chatbubble-outline" size={16} color="#666" />
                        <Text style={[styles.commentActionText, isRTL && styles.textRTL]}>{t("admin.manageReels.reply", "Reply")}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    style={[styles.commentAction, isRTL && styles.commentActionRTL]}
                    onPress={() => handleDeleteComment(comment.id)}
                >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    <Text style={[styles.commentActionText, isRTL && styles.textRTL, { color: '#FF3B30' }]}>{t("admin.manageReels.delete", "Delete")}</Text>
                </TouchableOpacity>
            </View>

            {/* Nested Replies */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
                <View style={[styles.repliesContainer, isRTL && styles.repliesContainerRTL]}>
                    {comment.replies.map(reply => renderComment(reply, true))}
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ title: t("common.loading") }} />
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!reel) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ title: t("admin.manageReels.reelNotFoundTitle") }} />
                <Text style={styles.errorText}>{t("admin.manageReels.reelNotFound")}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t("common.back")}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: reel.title || t('admin.manageReels.reelDetailsTitle'),
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleEditReel}>
                                <Ionicons name="create-outline" size={24} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteReel}>
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    )
                }} 
            />

            <ScrollView style={styles.scrollView}>
                {/* Video Preview */}
                <View style={styles.videoPreview}>
                    {reel.video_type === 'YOUTUBE' ? (
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="logo-youtube" size={64} color="#FF0000" />
                            <Text style={styles.videoPlaceholderText}>{t("admin.manageReels.youtubeVideo")}</Text>
                        </View>
                    ) : reel.thumbnail_url ? (
                        <Image 
                            source={{ uri: reel.thumbnail_url }} 
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="videocam" size={64} color="#999" />
                        </View>
                    )}
                </View>

                {/* Reel Info */}
                <View style={styles.infoSection}>
                    {/* Action Buttons */}
                    <View style={[styles.actionButtonsRow, isRTL && styles.actionButtonsRowRTL]}>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton, isRTL && styles.actionButtonRTL]}
                            onPress={handleEditReel}
                        >
                            <Ionicons name="create-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>{t("admin.manageReels.edit", "Edit")}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.statusButton, isRTL && styles.actionButtonRTL]}
                            onPress={() => setStatusModalVisible(true)}
                        >
                            <Ionicons name="toggle-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>{t("admin.manageReels.status", "Status")}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.deleteButton, isRTL && styles.actionButtonRTL]}
                            onPress={handleDeleteReel}
                        >
                            <Ionicons name="trash-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>{t("admin.manageReels.delete", "Delete")}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.reelTitle, isRTL && styles.textRTL]}>{reel.title || t("admin.manageReels.noTitle", "(No Title)")}</Text>
                    {reel.description && (
                        <Text style={[styles.reelDescription, isRTL && styles.textRTL]}>{reel.description}</Text>
                    )}

                    {/* Stats */}
                    <View style={[styles.statsRow, isRTL && styles.statsRowRTL]}>
                        <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
                            <Ionicons name="eye" size={20} color="#666" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{reel.views_count} {t("admin.manageReels.views", "views")}</Text>
                        </View>
                        <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
                            <Ionicons name="heart" size={20} color="#FF3B30" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{reel.likes_count} {t("admin.manageReels.likes", "likes")}</Text>
                        </View>
                        <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
                            <Ionicons name="chatbubble" size={20} color="#007AFF" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{reel.comments_count} {t("admin.manageReels.comments", "comments")}</Text>
                        </View>
                        <View style={[styles.statItem, isRTL && styles.statItemRTL]}>
                            <Ionicons name="share-social" size={20} color="#34C759" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{reel.shares_count} {t("admin.manageReels.shares", "shares")}</Text>
                        </View>
                    </View>

                    {/* Reel Metadata */}
                    <View style={[styles.metadataRow, isRTL && styles.metadataRowRTL]}>
                        <Text style={[styles.metadataLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.statusLabel", "Status:")}</Text>
                        <Text style={[styles.metadataValue, isRTL && styles.textRTL, { color: reel.status === 'ACTIVE' ? '#34C759' : '#666' }]}>
                            {reel.status}
                        </Text>
                    </View>
                    <View style={[styles.metadataRow, isRTL && styles.metadataRowRTL]}>
                        <Text style={[styles.metadataLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.typeLabel", "Type:")}</Text>
                        <Text style={[styles.metadataValue, isRTL && styles.textRTL]}>{reel.video_type}</Text>
                    </View>
                    <View style={[styles.metadataRow, isRTL && styles.metadataRowRTL]}>
                        <Text style={[styles.metadataLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.createdLabel", "Created:")}</Text>
                        <Text style={[styles.metadataValue, isRTL && styles.textRTL]}>
                            {new Date(reel.created_at).toLocaleString()}
                        </Text>
                    </View>
                    {reel.user && (
                        <View style={[styles.metadataRow, isRTL && styles.metadataRowRTL]}>
                            <Text style={[styles.metadataLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.creatorLabel", "Creator:")}</Text>
                            <Text style={[styles.metadataValue, isRTL && styles.textRTL]}>{reel.user.name}</Text>
                        </View>
                    )}
                </View>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                    <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                            {t("admin.manageReels.commentsTitle", "Comments")} ({comments.length})
                        </Text>
                        <TouchableOpacity onPress={fetchComments}>
                            <Ionicons name="refresh" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {loadingComments ? (
                        <ActivityIndicator size="small" color="#999" style={{ marginVertical: 20 }} />
                    ) : comments.length === 0 ? (
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                            <Text style={[styles.emptyCommentsText, isRTL && styles.textRTL]}>{t("admin.manageReels.noComments", "No comments yet")}</Text>
                        </View>
                    ) : (
                        <View style={styles.commentsList}>
                            {comments.map(comment => renderComment(comment))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Edit Reel Modal */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t("admin.manageReels.editReel", "Edit Reel")}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder={t("admin.manageReels.titlePlaceholder", "Title")}
                            value={editTitle}
                            onChangeText={setEditTitle}
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder={t("admin.manageReels.descriptionPlaceholder", "Description")}
                            value={editDescription}
                            onChangeText={setEditDescription}
                            multiline
                            numberOfLines={4}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t("admin.manageReels.cancel", "Cancel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.saveButtonText}>{t("admin.manageReels.save", "Save")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Status Change Modal */}
            <Modal
                visible={statusModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t("admin.manageReels.changeStatus", "Change Status")}</Text>
                            <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.statusSubtitle, isRTL && styles.textRTL]}>
                            {t("admin.manageReels.currentStatus", "Current Status:")} <Text style={{ fontWeight: 'bold', color: reel?.status === 'ACTIVE' ? '#34C759' : '#666' }}>
                                {reel?.status}
                            </Text>
                        </Text>

                        <View style={styles.statusOptions}>
                            <TouchableOpacity 
                                style={[styles.statusOption, reel?.status === 'ACTIVE' && styles.activeStatusOption]}
                                onPress={() => handleChangeStatus('ACTIVE')}
                            >
                                <Ionicons name="checkmark-circle" size={24} color={reel?.status === 'ACTIVE' ? 'white' : '#34C759'} />
                                <Text style={[styles.statusOptionText, reel?.status === 'ACTIVE' && styles.activeStatusOptionText]}>
                                    ACTIVE
                                </Text>
                                <Text style={[styles.statusOptionDesc, reel?.status === 'ACTIVE' && { color: '#fff' }]}>
                                    {t("admin.manageReels.activeDesc", "Visible to all users")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.statusOption, reel?.status === 'DRAFT' && styles.activeStatusOption]}
                                onPress={() => handleChangeStatus('DRAFT')}
                            >
                                <Ionicons name="document-outline" size={24} color={reel?.status === 'DRAFT' ? 'white' : '#FF9500'} />
                                <Text style={[styles.statusOptionText, reel?.status === 'DRAFT' && styles.activeStatusOptionText]}>
                                    DRAFT
                                </Text>
                                <Text style={[styles.statusOptionDesc, reel?.status === 'DRAFT' && { color: '#fff' }]}>
                                    {t("admin.manageReels.draftDesc", "Hidden from users")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.statusOption, reel?.status === 'PAUSED' && styles.activeStatusOption]}
                                onPress={() => handleChangeStatus('PAUSED')}
                            >
                                <Ionicons name="pause-circle" size={24} color={reel?.status === 'PAUSED' ? 'white' : '#8E8E93'} />
                                <Text style={[styles.statusOptionText, reel?.status === 'PAUSED' && styles.activeStatusOptionText]}>
                                    PAUSED
                                </Text>
                                <Text style={[styles.statusOptionDesc, reel?.status === 'PAUSED' && { color: '#fff' }]}>
                                    {t("admin.manageReels.pausedDesc", "Paused temporarily")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reply Modal */}
            <Modal
                visible={replyModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setReplyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                                {t("admin.manageReels.reply", "Reply")} {replyingTo?.user_name || t("admin.manageReels.user", "User")}
                            </Text>
                            <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {replyingTo && (
                            <View style={styles.replyingToBox}>
                                <Text style={[styles.replyingToText, isRTL && styles.textRTL]}>{replyingTo.content}</Text>
                            </View>
                        )}

                        <TextInput
                            style={[styles.input, styles.textArea, isRTL && styles.inputRTL]}
                            placeholder={t("admin.manageReels.writeReply", "Write your reply...")}
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            numberOfLines={4}
                            autoFocus
                            textAlign={isRTL ? 'right' : 'left'}
                        />

                        <View style={[styles.modalActions, isRTL && styles.modalActionsRTL]}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setReplyModalVisible(false)}
                            >
                                <Text style={[styles.cancelButtonText, isRTL && styles.textRTL]}>{t("admin.manageReels.cancel", "Cancel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSubmitReply}
                                disabled={!replyText.trim()}
                            >
                                <Text style={[styles.saveButtonText, isRTL && styles.textRTL]}>{t("admin.manageReels.reply", "Reply")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Helper functions
const getApiBaseUrl = () => {
    return Platform.OS === 'web' ? 'http://localhost:8082/api' : 'http://192.168.1.27:8082/api';
};

const getAuthToken = async () => {
    // TODO: Get from auth context
    return '';
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    scrollView: {
        flex: 1,
    },
    videoPreview: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    videoPlaceholderText: {
        color: 'white',
        marginTop: 12,
        fontSize: 16,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    infoSection: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    actionButtonsRowRTL: {
        flexDirection: 'row-reverse',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonRTL: {
        flexDirection: 'row-reverse',
    },
    editButton: {
        backgroundColor: '#007AFF',
    },
    statusButton: {
        backgroundColor: '#34C759',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    statusSubtitle: {
        fontSize: 15,
        color: '#666',
        marginBottom: 20,
    },
    statusOptions: {
        gap: 12,
    },
    statusOption: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        backgroundColor: '#f8f8f8',
    },
    activeStatusOption: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    statusOptionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    activeStatusOptionText: {
        color: 'white',
    },
    statusOptionDesc: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
    reelTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    reelDescription: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        marginBottom: 16,
    },
    textRTL: {
        textAlign: 'right',
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    statsRowRTL: {
        flexDirection: 'row-reverse',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statItemRTL: {
        flexDirection: 'row-reverse',
    },
    statText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    metadataRowRTL: {
        flexDirection: 'row-reverse',
    },
    metadataLabel: {
        fontSize: 14,
        color: '#999',
        width: 80,
    },
    metadataValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        fontWeight: '500',
    },
    commentsSection: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    commentsList: {
        gap: 12,
    },
    commentCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    commentCardRTL: {
        // RTL specific styles if needed
    },
    replyCard: {
        marginLeft: 32,
        backgroundColor: '#fff',
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    replyCardRTL: {
        marginLeft: 0,
        marginRight: 32,
        borderLeftWidth: 0,
        borderRightWidth: 3,
        borderRightColor: '#007AFF',
    },
    commentHeader: {
        marginBottom: 8,
    },
    commentHeaderRTL: {
        // RTL specific styles if needed
    },
    commentUserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commentUserRowRTL: {
        flexDirection: 'row-reverse',
    },
    commentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    commentUserInfo: {
        flex: 1,
    },
    commentUser: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    commentTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    commentContent: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 8,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
    },
    commentActionsRTL: {
        flexDirection: 'row-reverse',
    },
    commentAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    commentActionRTL: {
        flexDirection: 'row-reverse',
    },
    commentActionText: {
        fontSize: 13,
        color: '#666',
    },
    repliesContainer: {
        marginTop: 12,
    },
    repliesContainerRTL: {
        // RTL specific styles if needed
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyCommentsText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
    },
    errorText: {
        fontSize: 18,
        color: '#999',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 500,
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
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        marginBottom: 16,
    },
    inputRTL: {
        textAlign: 'right',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    replyingToBox: {
        backgroundColor: '#f0f8ff',
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    replyingToBoxRTL: {
        borderLeftWidth: 0,
        borderRightWidth: 3,
        borderRightColor: '#007AFF',
    },
    replyingToText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalActionsRTL: {
        flexDirection: 'row-reverse',
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

