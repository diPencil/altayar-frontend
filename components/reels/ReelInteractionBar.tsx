import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, Share as RNShare } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import * as Clipboard from 'expo-clipboard';
import { reelsService } from '../../src/services/reels';

interface ReelInteractionBarProps {
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    reelId: string;
    reelUrl: string;
    reelTitle?: string;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    onSave?: () => void;
}

const ReelInteractionBar: React.FC<ReelInteractionBarProps> = ({
    likes,
    comments,
    shares,
    isLiked,
    reelId,
    reelUrl,
    reelTitle,
    onLike,
    onComment,
    onShare,
    onSave,
}) => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const formatCount = (count: number) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    const handleCopyLink = async () => {
        try {
            const link = `altayar://reels/${reelId}`;
            await Clipboard.setStringAsync(link);
            setShowMoreMenu(false);
            Alert.alert(t('reels.success'), t('reels.linkCopied'));
        } catch (error) {
            Alert.alert(t('reels.error'), t('reels.failedToCopyLink'));
        }
    };

    const handleSaveToFavorites = async () => {
        try {
            await reelsService.addFavorite(reelId);
            setShowMoreMenu(false);
            if (onSave) {
                onSave();
            }
            Alert.alert(t('reels.saved'), t('reels.reelSavedToFavorites'));
        } catch (error) {
            console.error('Save to favorites failed:', error);
            Alert.alert(t('reels.error'), t('reels.failedToSaveToFavorites'));
        }
    };

    const handleShareToChat = () => {
        setShowMoreMenu(false);
        Alert.alert(
            t('reels.shareToChat'),
            t('reels.chooseConversation'),
            [
                { text: t('reels.cancel'), style: 'cancel' },
                {
                    text: t('reels.openChats'), onPress: () => {
                        // TODO: Navigate to chat selection screen
                        Alert.alert(t('reels.comingSoon'), t('reels.shareToChatComingSoon'));
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, isRTL ? styles.containerRTL : styles.containerLTR]}>
            {/* Like - Heart Outline */}
            <TouchableOpacity onPress={onLike} style={styles.actionButton}>
                <MaterialCommunityIcons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={32}
                    color={isLiked ? "#ff3b30" : "white"}
                />
                <Text style={[styles.actionText, isRTL && styles.actionTextRTL]}>{formatCount(likes)}</Text>
            </TouchableOpacity>

            {/* Comment - Chat Outline (Rounded) */}
            <TouchableOpacity onPress={onComment} style={styles.actionButton}>
                <MaterialCommunityIcons
                    name="chat-outline"
                    size={32}
                    color="white"
                />
                <Text style={[styles.actionText, isRTL && styles.actionTextRTL]}>{formatCount(comments)}</Text>
            </TouchableOpacity>

            {/* Share - Share Variant (Rounded Arrow) */}
            <TouchableOpacity onPress={onShare} style={styles.actionButton}>
                <MaterialCommunityIcons
                    name="share-variant-outline"
                    size={32}
                    color="white"
                />
                <Text style={[styles.actionText, isRTL && styles.actionTextRTL]}>{formatCount(shares)}</Text>
            </TouchableOpacity>

            {/* More / Menu */}
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowMoreMenu(true)}>
                <MaterialCommunityIcons
                    name="dots-vertical"
                    size={28}
                    color="white"
                />
            </TouchableOpacity>

            {/* More Options Modal */}
            <Modal
                visible={showMoreMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMoreMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMoreMenu(false)}
                >
                    <View style={styles.modalContent}>
                        {/* Save to Favorites */}
                        <TouchableOpacity
                            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
                            onPress={handleSaveToFavorites}
                        >
                            <MaterialCommunityIcons name="heart-outline" size={24} color="#333" />
                            <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('favorites.title', 'Save to Favorites')}</Text>
                        </TouchableOpacity>

                        {/* Copy Link */}
                        <TouchableOpacity
                            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
                            onPress={handleCopyLink}
                        >
                            <MaterialCommunityIcons name="link-variant" size={24} color="#333" />
                            <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('admin.reels.linkCopied', 'Copy Link')}</Text>
                        </TouchableOpacity>

                        {/* Share to Chat */}
                        <TouchableOpacity
                            style={[styles.menuItem, isRTL && styles.menuItemRTL]}
                            onPress={handleShareToChat}
                        >
                            <MaterialCommunityIcons name="chat-outline" size={24} color="#333" />
                            <Text style={[styles.menuText, isRTL && styles.menuTextRTL]}>{t('admin.reels.shareToChat', 'Share to Chat')}</Text>
                        </TouchableOpacity>

                        {/* Cancel */}
                        <TouchableOpacity
                            style={[styles.menuItem, styles.cancelItem]}
                            onPress={() => setShowMoreMenu(false)}
                        >
                            <Text style={styles.cancelText}>{t('common.cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        alignItems: 'center',
        zIndex: 50,
    },
    containerLTR: {
        right: 12,
    },
    containerRTL: {
        left: 12,
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 24,
    },
    actionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    actionTextRTL: {
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemRTL: {
        flexDirection: 'row-reverse',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 16,
        marginRight: 0,
        fontWeight: '500',
    },
    menuTextRTL: {
        marginLeft: 0,
        marginRight: 16,
    },
    cancelItem: {
        borderBottomWidth: 0,
        justifyContent: 'center',
        marginTop: 8,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
    },
    cancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ReelInteractionBar;
