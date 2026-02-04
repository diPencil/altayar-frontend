import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reelsService } from '../../../src/services/reels';
import { useTranslation } from 'react-i18next';

interface Comment {
    id: string;
    reel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user_name?: string;
    reel_title?: string;
    likes_count?: number;
    parent_id?: string;
}

export default function AdminCommentsPage() {
    const { t } = useTranslation();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterReelId, setFilterReelId] = useState<string | null>(null);
    
    // Edit modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingComment, setEditingComment] = useState<Comment | null>(null);
    const [editedContent, setEditedContent] = useState('');

    const fetchComments = async () => {
        setLoading(true);
        try {
            // TODO: Add admin endpoint to fetch all comments
            // For now, this is a placeholder
            const response = await fetch(`${getApiBaseUrl()}/reels/admin/comments${filterReelId ? `?reel_id=${filterReelId}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setComments(data);
            } else {
                setComments([]);
            }
        } catch (error) {
            console.error("Failed to fetch comments:", error);
            setComments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [filterReelId]);

    const handleEdit = (comment: Comment) => {
        setEditingComment(comment);
        setEditedContent(comment.content);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingComment || !editedContent.trim()) return;

        try {
            const response = await fetch(`${getApiBaseUrl()}/reels/admin/comments/${editingComment.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
                },
                body: JSON.stringify({ content: editedContent })
            });

            if (response.ok) {
                // Update local state
                setComments(prev => prev.map(c => 
                    c.id === editingComment.id 
                        ? { ...c, content: editedContent }
                        : c
                ));
                setEditModalVisible(false);
                Alert.alert(t('common.success'), t('admin.manageReels.commentUpdated'));
            } else {
                Alert.alert(t('common.error'), t('admin.manageReels.updateCommentFailed'));
            }
        } catch (error) {
            console.error("Update failed:", error);
            Alert.alert(t('common.error'), t('admin.manageReels.updateCommentFailed'));
        }
    };

    const handleDelete = (commentId: string) => {
        Alert.alert(
            t('admin.manageReels.deleteCommentTitle'),
            t('admin.manageReels.deleteCommentConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
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
                                setComments(prev => prev.filter(c => c.id !== commentId));
                                Alert.alert(t('common.success'), t('admin.manageReels.commentDeleted'));
                            } else {
                                Alert.alert(t('common.error'), t('admin.manageReels.deleteCommentFailed'));
                            }
                        } catch (error) {
                            console.error("Delete failed:", error);
                            Alert.alert(t('common.error'), t('admin.manageReels.deleteCommentFailed'));
                        }
                    }
                }
            ]
        );
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={[styles.commentCard, item.parent_id && styles.replyCard]}>
            <View style={styles.commentHeader}>
                <View style={styles.commentInfo}>
                    <Text style={styles.commentUser}>{item.user_name || t('admin.manageReels.anonymous')}</Text>
                    <Text style={styles.commentReel}>
                        {t('admin.manageReels.onReel', {
                            title: item.reel_title || t('admin.manageReels.reelShortId', { id: item.reel_id.substring(0, 8) })
                        })}
                    </Text>
                    <Text style={styles.commentTime}>
                        {new Date(item.created_at).toLocaleString()}
                    </Text>
                </View>
                <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                        <Ionicons name="create-outline" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.commentContent}>{item.content}</Text>

            <View style={styles.commentFooter}>
                {item.parent_id && (
                    <Text style={styles.replyBadge}>{t('admin.manageReels.replyBadge')}</Text>
                )}
                <Text style={styles.likesCount}>
                    ❤️ {item.likes_count || 0}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ title: t('admin.manageReels.commentsManagementTitle') }} />
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('admin.manageReels.commentsManagementTitle') }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('admin.manageReels.allCommentsWithCount', { count: comments.length })}</Text>
                <TouchableOpacity 
                    onPress={() => fetchComments()} 
                    style={styles.refreshButton}
                >
                    <Ionicons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyStateText}>{t('admin.manageReels.noComments')}</Text>
                </View>
            ) : (
                <FlatList
                    data={comments}
                    keyExtractor={item => item.id}
                    renderItem={renderComment}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('admin.manageReels.editCommentTitle')}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.editInput}
                            value={editedContent}
                            onChangeText={setEditedContent}
                            multiline
                            placeholder={t('admin.manageReels.commentPlaceholder')}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveEdit}
                            >
                                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Helper functions (to be replaced with proper API calls)
const getApiBaseUrl = () => {
    // TODO: Use proper API base URL from config
    return 'http://localhost:8082/api';
};

const getAuthToken = async () => {
    // TODO: Get token from auth context
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    refreshButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    commentCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    replyCard: {
        marginLeft: 20,
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    commentInfo: {
        flex: 1,
    },
    commentUser: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    commentReel: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    commentTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 4,
    },
    commentContent: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        marginBottom: 12,
    },
    commentFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    replyBadge: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
    },
    likesCount: {
        fontSize: 13,
        color: '#666',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#999',
        marginTop: 16,
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
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
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
