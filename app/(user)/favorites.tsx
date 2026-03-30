import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { reelsService, Reel } from '../../src/services/reels';
import { offersApi, Offer, resolveReelMediaUrl, rewriteBackendMediaUrl } from '../../src/services/api';
import Video from 'expo-av/build/Video';
import { ResizeMode } from 'expo-av/build/Video.types';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function FavoritesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();

    const initialTab = String((params as any)?.tab || '').toLowerCase() === 'offers' ? 'offers' : 'reels';
    const [activeTab, setActiveTab] = useState<'reels' | 'offers'>(initialTab as any);

    const [reelFavorites, setReelFavorites] = useState<Reel[]>([]);
    const [offerFavorites, setOfferFavorites] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Reload favorites when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const loadFavorites = async () => {
        try {
            setLoading(true);
            const [reelsRes, offersRes] = await Promise.allSettled([
                reelsService.getFavorites(),
                offersApi.getFavorites(),
            ]);

            if (reelsRes.status === 'fulfilled') {
                setReelFavorites(Array.isArray(reelsRes.value) ? reelsRes.value : []);
            } else {
                setReelFavorites([]);
            }

            if (offersRes.status === 'fulfilled') {
                setOfferFavorites(Array.isArray(offersRes.value) ? offersRes.value : []);
            } else {
                setOfferFavorites([]);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
            setReelFavorites([]);
            setOfferFavorites([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFavorites();
        setRefreshing(false);
    }, []);

    const handleReelPress = (reelId: string) => {
        // Navigate to reels page with specific reel
        router.push({
            pathname: '/(user)/reels',
            params: { reelId }
        });
    };

    const handleRemoveFavorite = async (reelId: string) => {
        Alert.alert(
            t('favorites.removeFromFavorites'),
            t('favorites.removeConfirm'),
            [
                { text: t('favorites.cancel'), style: 'cancel' },
                {
                    text: t('favorites.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await reelsService.removeFavorite(reelId);
                            setReelFavorites(prev => prev.filter(r => r.id !== reelId));
                            Alert.alert(t('favorites.success'), t('favorites.removedFromFavorites'));
                        } catch (error) {
                            console.error('Failed to remove favorite:', error);
                            Alert.alert(t('favorites.error'), t('favorites.failedToRemove'));
                        }
                    }
                }
            ]
        );
    };

    const handleOfferPress = (offerId: string) => {
        router.push({
            pathname: '/(user)/offer/[id]',
            params: { id: offerId, backPath: '/(user)/favorites' }
        } as any);
    };

    const handleRemoveOfferFavorite = async (offerId: string) => {
        Alert.alert(
            t('favorites.removeFromFavorites', 'Remove from favorites'),
            t('favorites.removeConfirmOffer', 'Are you sure you want to remove this offer from favorites?'),
            [
                { text: t('favorites.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('favorites.remove', 'Remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await offersApi.removeFavorite(offerId);
                            setOfferFavorites(prev => prev.filter(o => o.id !== offerId));
                            Alert.alert(t('favorites.success', 'Success'), t('favorites.removedFromFavorites', 'Removed from favorites'));
                        } catch (error) {
                            console.error('Failed to remove offer favorite:', error);
                            Alert.alert(t('favorites.error', 'Error'), t('favorites.failedToRemove', 'Failed to remove from favorites'));
                        }
                    }
                }
            ]
        );
    };

    // Helper function to get YouTube thumbnail URL
    const getYouTubeThumbnail = (videoUrl: string): string | undefined => {
        if (!videoUrl) return undefined;
        // Extract YouTube video ID
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        ];
        for (const pattern of patterns) {
            const match = videoUrl.match(pattern);
            if (match) {
                return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
            }
        }
        return undefined;
    };

    const renderItem = ({ item }: { item: Reel }) => {
        // Get thumbnail URL - use existing or generate for YouTube
        let thumbnailUrl = item.thumbnail_url;
        let videoSource: string | null = null;

        if (!thumbnailUrl && item.video_type === 'YOUTUBE' && item.video_url) {
            thumbnailUrl = getYouTubeThumbnail(item.video_url);
        } else if (item.video_type === 'UPLOAD' && item.video_url) {
            videoSource = resolveReelMediaUrl(item.video_url) ?? null;
        }

        return (
            <TouchableOpacity
                style={styles.reelCard}
                onPress={() => handleReelPress(item.id)}
                activeOpacity={0.9}
            >
                {/* Thumbnail */}
                <View style={styles.thumbnailContainer}>
                    {thumbnailUrl ? (
                        <Image
                            source={{ uri: rewriteBackendMediaUrl(thumbnailUrl) ?? thumbnailUrl }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                        />
                    ) : videoSource ? (
                        // Use Video component to show first frame for uploaded videos
                        <Video
                            source={{ uri: videoSource }}
                            style={styles.thumbnail}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            useNativeControls={false}
                            isMuted={true}
                            isLooping={false}
                        />
                    ) : item.video_type === 'YOUTUBE' ? (
                        <View style={[styles.thumbnail, styles.placeholderContainer]}>
                            <Ionicons name="logo-youtube" size={40} color="#FF0000" />
                        </View>
                    ) : (
                        <View style={[styles.thumbnail, styles.placeholderContainer]}>
                            <Ionicons name="videocam" size={40} color="#999" />
                        </View>
                    )}

                    {/* Play overlay */}
                    <View style={styles.playOverlay}>
                        <View style={styles.playButton}>
                            <Ionicons name="play" size={24} color="white" />
                        </View>
                    </View>

                    {/* Remove button */}
                    <TouchableOpacity
                        style={[styles.removeButton, isRTL && styles.removeButtonRTL]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(item.id);
                        }}
                    >
                        <Ionicons name="heart" size={20} color="#FF3B30" />
                    </TouchableOpacity>

                    {/* Views count */}
                    <View style={[styles.viewsCount, isRTL && styles.viewsCountRTL]}>
                        <Ionicons name="eye" size={14} color="white" />
                        <Text style={styles.viewsText}>{formatCount(item.views_count)}</Text>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.reelTitle, isRTL && styles.textRTL]} numberOfLines={2}>
                        {item.title || 'Untitled Reel'}
                    </Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="heart" size={14} color="#FF3B30" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{formatCount(item.likes_count)}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="chatbubble" size={14} color="#007AFF" />
                            <Text style={[styles.statText, isRTL && styles.textRTL]}>{formatCount(item.comments_count)}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderOfferItem = ({ item }: { item: Offer }) => {
        const fallbackImg = item?.image_url || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600';
        const title =
            (language === 'ar'
                ? (item?.title_ar || item?.title_en || '')
                : (item?.title_en || item?.title_ar || '')
            ).trim() || t('favorites.offerFallbackTitle', 'Offer');
        const subtitle = (item?.destination || '').trim();

        return (
            <TouchableOpacity
                style={styles.reelCard}
                onPress={() => handleOfferPress(item.id)}
                activeOpacity={0.9}
            >
                <View style={styles.thumbnailContainer}>
                    <Image source={{ uri: fallbackImg }} style={styles.thumbnail} resizeMode="cover" />

                    <TouchableOpacity
                        style={[styles.removeButton, isRTL && styles.removeButtonRTL]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveOfferFavorite(item.id);
                        }}
                    >
                        <Ionicons name="heart" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={[styles.reelTitle, isRTL && styles.textRTL]} numberOfLines={2}>
                        {title}
                    </Text>
                    {!!subtitle && (
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Ionicons name="location-outline" size={14} color="#64748b" />
                                <Text style={[styles.statText, isRTL && styles.textRTL]} numberOfLines={1}>{subtitle}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const formatCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#333" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('favorites.title')}</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                >
                    <Ionicons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            <View style={[styles.tabsRow]}>
                <TouchableOpacity
                    style={[styles.tabPill, activeTab === 'reels' && styles.tabPillActive]}
                    onPress={() => setActiveTab('reels')}
                >
                    <Text style={[styles.tabText, activeTab === 'reels' && styles.tabTextActive]}>
                        {t('favorites.tabs.reels', 'Reels')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabPill, activeTab === 'offers' && styles.tabPillActive]}
                    onPress={() => setActiveTab('offers')}
                >
                    <Text style={[styles.tabText, activeTab === 'offers' && styles.tabTextActive]}>
                        {t('favorites.tabs.offers', 'Offers')}
                    </Text>
                </TouchableOpacity>
            </View>

            {(activeTab === 'reels' ? reelFavorites : offerFavorites).length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={80} color="#ccc" />
                    <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t('favorites.noFavorites')}</Text>
                    <Text style={styles.emptySubtitle}>
                        {activeTab === 'reels'
                            ? t('favorites.noFavoritesDesc')
                            : t('favorites.noOffersFavoritesDesc', 'Save offers to see them here.')}
                    </Text>
                    <TouchableOpacity
                        style={styles.exploreButton}
                        onPress={() => router.push(activeTab === 'reels' ? '/(user)/reels' : '/(user)/offers')}
                    >
                        <Text style={[styles.exploreButtonText, isRTL && styles.textRTL]}>
                            {activeTab === 'reels'
                                ? t('favorites.exploreReels')
                                : t('favorites.exploreOffers', 'Explore offers')}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'reels' ? reelFavorites : offerFavorites}
                    renderItem={activeTab === 'reels' ? (renderItem as any) : (renderOfferItem as any)}
                    keyExtractor={(item: any) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </View>
    );
}

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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },

    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    textRTL: {
        textAlign: 'right',
    },
    refreshButton: {
        padding: 8,
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        gap: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabPill: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tabPillActive: {
        backgroundColor: '#007AFF15',
        borderColor: '#007AFF55',
    },
    tabText: {
        fontWeight: '800',
        color: '#334155',
    },
    tabTextActive: {
        color: '#007AFF',
    },
    listContent: {
        padding: 16,
    },
    reelCard: {
        width: ITEM_WIDTH,
        marginBottom: 16,
        marginHorizontal: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    thumbnailContainer: {
        width: '100%',
        height: ITEM_WIDTH * 1.5,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    placeholderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        end: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    removeButtonRTL: {},
    viewsCount: {
        position: 'absolute',
        bottom: 8,
        start: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    viewsCountRTL: {},
    viewsText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    infoContainer: {
        padding: 12,
    },
    reelTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        lineHeight: 18,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    exploreButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
    },
    exploreButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

