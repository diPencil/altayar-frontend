import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback, TouchableOpacity, Image, Platform, Alert, Linking, Animated, Easing } from 'react-native';
import Video from 'expo-av/build/Video';
import { ResizeMode } from 'expo-av/build/Video.types';
import { AVPlaybackStatus } from 'expo-av/build/AV';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ReelInteractionBar from './ReelInteractionBar';
import { Reel } from '../../src/services/reels';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

import { resolveReelMediaUrl, rewriteBackendMediaUrl } from '../../src/services/api';

// Safe alert function that works on both mobile and web with confirmation
const showConfirmAlert = (
    title: string,
    message: string,
    onConfirm: () => void,
    cancelText: string,
    confirmText: string
) => {
    if (Platform.OS === 'web') {
        // Use browser confirm for web (allows Cancel/OK)
        if (typeof window !== 'undefined' && window.confirm) {
            const confirmed = window.confirm(`${title}\n\n${message}`);
            if (confirmed) {
                onConfirm();
            }
        }
    } else {
        // Use React Native Alert for mobile with buttons
        Alert.alert(
            title,
            message,
            [
                { text: cancelText, style: 'cancel' },
                { text: confirmText, onPress: onConfirm }
            ]
        );
    }
};

const { width, height } = Dimensions.get('window');

// Utility function to extract YouTube video ID
const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
};

// Check if URL is YouTube
const isYouTubeUrl = (url: string): boolean => {
    return extractYouTubeVideoId(url) !== null;
};

// Create YouTube embed URL for mobile
const createYouTubeEmbedUrl = (videoId: string): string => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&loop=1&playlist=${videoId}&enablejsapi=1`;
};

interface ReelItemProps {
    item: Reel;
    isActive: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    onView: () => void; // Triggered when video is viewed
}

const ReelItem: React.FC<ReelItemProps> = ({
    item,
    isActive,
    onLike,
    onComment,
    onShare,
    onView,
}) => {
    const { isRTL } = useLanguage();
    const { t } = useTranslation();
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
    const [viewTriggered, setViewTriggered] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [showPauseIcon, setShowPauseIcon] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Animation for music icon
    const spinValue = useRef(new Animated.Value(0)).current;
    const pauseIconOpacity = useRef(new Animated.Value(0)).current;

    // Determine video type and source
    const isYouTube = item.video_type === 'YOUTUBE' || isYouTubeUrl(item.video_url);
    const isUploaded = item.video_type === 'UPLOAD';
    const isExternalUrl = item.video_type === 'URL' || (!isYouTube && !isUploaded);

    // Debug logging
    console.log('Reel Item Debug:', {
        video_type: item.video_type,
        video_url: item.video_url,
        isYouTube,
        isUploaded,
        isExternalUrl
    });

    // Aggressive Auto-play/pause based on isActive
    useEffect(() => {
        if (isYouTube) return; // YouTube handled by WebView key

        const handlePlayback = async () => {
            try {
                if (isActive && !videoError) {
                    // Only play if active
                    // Check if loaded first? actually loading is handled by source prop
                    // Just try to play
                    console.log('[ReelItem] Playing:', item.id);
                    await videoRef.current?.playAsync();
                } else {
                    // FORCE STOP
                    console.log('[ReelItem] Stopping:', item.id);
                    await videoRef.current?.stopAsync();
                    await videoRef.current?.unloadAsync(); // Unload to kill audio 100%
                }
            } catch (error) {
                // Ignore unload errors
            }
        };

        handlePlayback();

        // Cleanup immediately on unmount or isActive false
        return () => {
            if (!isActive && !isYouTube) {
                videoRef.current?.unloadAsync().catch(() => { });
            }
        }
    }, [isActive, isYouTube, videoError, item.id]);

    // Rotate music icon animation - Always spinning
    useEffect(() => {
        // Start spinning immediately and never stop
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 3000, // 3 seconds per rotation
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []); // Empty dependency array - runs once on mount

    // Interpolate rotation
    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    // View count logic
    useEffect(() => {
        let timer: any;
        if (isActive && !viewTriggered) {
            timer = setTimeout(() => {
                onView();
                setViewTriggered(true);
            }, 3000); // 3 seconds threshold
        }
        return () => clearTimeout(timer);
    }, [isActive, viewTriggered]);

    // Cleanup: Stop and reset video when component unmounts or becomes inactive
    useEffect(() => {
        return () => {
            // Cleanup when component unmounts
            if (videoRef.current && !isYouTube) {
                videoRef.current.pauseAsync().catch(() => { });
                videoRef.current.setPositionAsync(0).catch(() => { });
                videoRef.current.unloadAsync().catch(() => { });
            }
        };
    }, [item.id, isYouTube]);

    const handlePress = () => {
        if (status?.isLoaded && status.isPlaying) {
            videoRef.current?.pauseAsync();
            // Show pause icon briefly
            setShowPauseIcon(true);
            Animated.sequence([
                Animated.timing(pauseIconOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.delay(800),
                Animated.timing(pauseIconOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => setShowPauseIcon(false));
        } else if (status?.isLoaded) {
            videoRef.current?.playAsync();
            // Show play icon briefly
            setShowPauseIcon(true);
            pauseIconOpacity.setValue(0);
            Animated.sequence([
                Animated.timing(pauseIconOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.delay(500),
                Animated.timing(pauseIconOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => setShowPauseIcon(false));
        }
    };

    const handleVideoError = () => {
        console.error('Video failed to load:', item.video_url);
        setVideoError(true);
    };

    // Determine how to render the video
    const renderVideoContent = () => {
        // Case 1: Uploaded video file (MP4, MOV, etc.) - Native video player
        if (item.video_type === 'UPLOAD' || (isUploaded && !isYouTube)) {
            const videoUri = resolveReelMediaUrl(item.video_url) ?? item.video_url;

            console.log('[ReelItem] Uploaded video:', {
                video_type: item.video_type,
                video_url: item.video_url,
                computed_uri: videoUri,
                isActive
            });

            return (
                <Video
                    ref={videoRef}
                    style={styles.video}
                    source={{ uri: videoUri }}
                    useNativeControls={false}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    isMuted={false}
                    shouldPlay={isActive}
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                        setStatus(() => status);
                        // Optional logging removed for cleaner code
                    }}
                    posterSource={
                        item.thumbnail_url
                            ? { uri: rewriteBackendMediaUrl(item.thumbnail_url) ?? item.thumbnail_url }
                            : undefined
                    }
                    posterStyle={{ resizeMode: 'contain' }}
                    usePoster={true}
                    onError={(error) => {
                        // Only log real errors, ignore unload errors
                        if (isActive) handleVideoError();
                    }}
                />
            );
        }

        // Case 2: Direct video URL (MP4, MOV, etc.) - Try to play as native video
        // If video_type is 'URL' and it's not YouTube, try to play it
        if ((item.video_type === 'URL' || isExternalUrl) && !isYouTube) {
            // Check if it's a direct video file URL
            const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp'];
            const urlLower = item.video_url.toLowerCase();
            const isDirectVideo = videoExtensions.some(ext => urlLower.includes(ext));

            // Also check if URL looks like a direct video link (CDN, etc.)
            // If it's not YouTube and has a valid scheme, try to play it
            const hasValidScheme = item.video_url.startsWith('http://') || item.video_url.startsWith('https://');

            if (isDirectVideo || (hasValidScheme && !isYouTube)) {
                // Try to play as native video
                if (__DEV__) {
                    console.log('Attempting to play video:', item.video_url);
                }
                const directUri = resolveReelMediaUrl(item.video_url) ?? item.video_url;
                return (
                    <Video
                        ref={videoRef}
                        style={styles.video}
                        source={{ uri: directUri }}
                        useNativeControls={false}
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        isMuted={false}
                        shouldPlay={isActive}
                        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                            setStatus(() => status);
                            if (!status.isLoaded && status.error) {
                                if (__DEV__) {
                                    console.error('Video playback error:', status.error);
                                }
                                handleVideoError();
                            }
                        }}
                        posterSource={
                            item.thumbnail_url
                                ? { uri: rewriteBackendMediaUrl(item.thumbnail_url) ?? item.thumbnail_url }
                                : undefined
                        }
                        posterStyle={{ resizeMode: 'contain' }}
                        usePoster={true}
                        onError={handleVideoError}
                    />
                );
            }
        }

        // Case 3: YouTube video - use WebView for in-app playback
        if (isYouTube) {
            const youtubeVideoId = extractYouTubeVideoId(item.video_url);

            if (youtubeVideoId) {
                // Create YouTube embed URL - autoplay controlled by isActive
                // Key prop forces complete reload when isActive changes to stop/start playback
                const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=${isActive ? 1 : 0}&controls=1&modestbranding=1&playsinline=1&rel=0&showinfo=0&loop=1&playlist=${youtubeVideoId}&mute=0`;

                return (
                    <WebView
                        key={`youtube-${item.id}-${isActive ? 'play' : 'pause'}`}
                        source={{ uri: embedUrl }}
                        style={styles.video}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scrollEnabled={false}
                        bounces={false}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.error('WebView error:', nativeEvent);
                            handleVideoError();
                        }}
                    />
                );
            }
        }

        // Case 4: Fallback for other external URLs - show message to open in browser
        return (
            <View style={styles.videoFallback}>
                {/* Show thumbnail if available */}
                {item.thumbnail_url ? (
                    <Image
                        source={{
                            uri: rewriteBackendMediaUrl(item.thumbnail_url) ?? item.thumbnail_url,
                        }}
                        style={styles.fallbackImage}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.fallbackPlaceholder}>
                        {Platform.OS !== 'web' && (
                            <Ionicons name="videocam-outline" size={64} color="#666" />
                        )}
                        {Platform.OS === 'web' && (
                            <Text style={styles.fallbackIconText}>{t('common.videoCameraEmoji')}</Text>
                        )}
                    </View>
                )}

                {/* Play overlay */}
                <View style={styles.playOverlay}>
                    <View style={styles.playButton}>
                        {Platform.OS !== 'web' ? (
                            <Ionicons name="play" size={40} color="white" />
                        ) : (
                            <Text style={styles.playIconText}>{t('common.playSymbol')}</Text>
                        )}
                    </View>
                </View>

                {/* Fallback message */}
                <View style={styles.fallbackMessage}>
                    <Text style={styles.fallbackText}>{t('reels.externalVideo')}</Text>
                    <Text style={styles.fallbackSubtext}>
                        {t('reels.tapToOpen')}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={() => {
                // For external videos that can't be played (error state), open in browser
                if (videoError && !isYouTube) {
                    showConfirmAlert(
                        t('reels.externalVideoTitle'),
                        t('reels.openInBrowserConfirm'),
                        () => {
                            Linking.openURL(item.video_url).catch(err => {
                                console.error('Failed to open URL:', err);
                                if (Platform.OS === 'web') {
                                    window.open(item.video_url, '_blank');
                                }
                            });
                        },
                        t('common.cancel'),
                        t('common.open', 'Open')
                    );
                } else if (isYouTube) {
                    // For YouTube videos, WebView handles the playback, so do nothing on tap
                    // YouTube controls will handle play/pause
                    return;
                } else {
                    // For all other playable videos (uploaded or direct URLs), play/pause
                    handlePress();
                }
            }}>
                <View style={styles.videoContainer}>
                    {renderVideoContent()}
                </View>
            </TouchableWithoutFeedback>

            {/* Pause/Play Icon Overlay */}
            {showPauseIcon && (
                <Animated.View
                    style={[
                        styles.pauseIconOverlay,
                        { opacity: pauseIconOpacity }
                    ]}
                    pointerEvents="none"
                >
                    <View style={styles.pauseIconContainer}>
                        {Platform.OS !== 'web' ? (
                            <Ionicons
                                name={status?.isLoaded && status.isPlaying ? "play" : "pause"}
                                size={60}
                                color="white"
                            />
                        ) : (
                            <Text style={styles.pauseIconText}>
                                {status?.isLoaded && status.isPlaying ? t('common.playSymbol') : t('common.pauseSymbol')}
                            </Text>
                        )}
                    </View>
                </Animated.View>
            )}

            {/* Overlay Gradient - Stronger for better text visibility */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
                style={styles.gradient}
            />

            {/* Info Section - Instagram/Facebook Style */}
            <View style={[styles.infoContainer, isRTL && styles.infoContainerRTL]}>
                {/* User Row: Avatar | Name */}
                <View style={[styles.userRow]}>
                    <Image
                        source={{ uri: item.user?.avatar_url || 'https://via.placeholder.com/100' }}
                        style={[styles.avatar, isRTL && styles.avatarRTL]}
                    />
                    <Text style={[styles.username, isRTL && styles.textRTL]}>
                        {item.user?.name || t('reels.defaultCreator')}
                    </Text>
                </View>


                {/* Title (if exists) */}
                {item.title && (
                    <Text style={[styles.videoTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                        {item.title}
                    </Text>
                )}

                {/* Description / Caption */}
                {item.description && (() => {
                    const description = item.description || '';
                    // Check if description is longer than what can fit in 2 lines (approximately 100 characters)
                    const maxLength = 100;
                    const isLongDescription = description.length > maxLength;
                    const shouldShowMore = !isDescriptionExpanded && isLongDescription;
                    const displayText = isDescriptionExpanded ? description : (isLongDescription ? description.substring(0, maxLength) : description);

                    return (
                        <View>
                            <Text style={[styles.description, isRTL && styles.textRTL]} numberOfLines={isDescriptionExpanded ? 0 : 2}>
                                {displayText}
                                {shouldShowMore && '...'}
                            </Text>
                            {shouldShowMore && (
                                <TouchableOpacity onPress={() => setIsDescriptionExpanded(true)} activeOpacity={0.7}>
                                    <Text style={[styles.moreText, isRTL && styles.textRTL]}>
                                        {t('common.readMore', 'more')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {isDescriptionExpanded && isLongDescription && (
                                <TouchableOpacity onPress={() => setIsDescriptionExpanded(false)} activeOpacity={0.7}>
                                    <Text style={[styles.moreText, isRTL && styles.textRTL]}>
                                        {t('common.showLess', 'less')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })()}

                {/* Audio / Music Row */}
                <View style={[styles.audioRow, isRTL && styles.audioRowRTL]}>
                    <Animated.View style={{ transform: [{ rotate: spin }], marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}>
                        <Ionicons name="musical-notes" size={14} color="white" />
                    </Animated.View>
                    <Text style={[styles.audioText, isRTL && styles.textRTL]} numberOfLines={1}>
                        {item.user?.name || t('app.name', 'Altayar')} - {t('reels.audio')}
                    </Text>
                </View>
            </View>

            {/* Interactions */}
            <ReelInteractionBar
                likes={item.likes_count}
                comments={item.comments_count}
                shares={item.shares_count}
                isLiked={!!item.is_liked}
                reelId={item.id}
                reelUrl={item.video_url}
                reelTitle={item.title}
                onLike={onLike}
                onComment={onComment}
                onShare={onShare}
                onSave={() => {
                    // TODO: Implement save to favorites API call
                    Alert.alert(t('common.success'), t('reels.savedToFavorites', 'This reel has been saved to your favorites'));
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: width,
        height: height, // Should adjust for bottom tab bar if needed, but 'full screen' asked
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    videoContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    fallbackPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    fallbackMessage: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    fallbackText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    fallbackSubtext: {
        color: '#ccc',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    fallbackIconText: {
        fontSize: 64,
        textAlign: 'center',
    },
    playIconText: {
        fontSize: 40,
        color: 'white',
        textAlign: 'center',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 400,
        zIndex: 5, // Below info but above video
    },
    infoContainer: {
        position: 'absolute',
        bottom: 100, // Much higher from bottom for better visibility
        left: 12,
        right: 90, // More space for interaction bar
        zIndex: 20,
        justifyContent: 'flex-end',
        paddingRight: 8,
    },
    infoContainerRTL: {
        left: 90,
        right: 12,
        paddingRight: 0,
        paddingLeft: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },

    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarRTL: {
        marginRight: 0,
        marginLeft: 8,
    },
    username: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    textRTL: {
        textAlign: 'right',
    },
    dotSeparator: {
        color: 'rgba(255,255,255,0.8)',
        marginHorizontal: 6,
        fontSize: 12,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    followButton: {
        borderWidth: 1.5,
        borderColor: 'white',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 5,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    followText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
    },
    videoTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        marginTop: 2,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    description: {
        color: 'white',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
        fontWeight: '300',
    },
    moreText: {
        color: '#d0d0d0',
        fontWeight: '600',
        marginTop: 4,
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },
    audioRowRTL: {
        alignSelf: 'flex-end',
    },
    audioText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    pauseIconOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    pauseIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    pauseIconText: {
        fontSize: 50,
        color: 'white',
    },
});

export default ReelItem;
