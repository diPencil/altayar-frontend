import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Video from 'expo-av/build/Video';
import { ResizeMode } from 'expo-av/build/Video.types';
import { reelsService, Reel } from '../../../src/services/reels';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import Constants from 'expo-constants';

export default function AdminReelsPage() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url'); // 'url' or 'file'
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch reels and analytics separately to handle failures gracefully
            const reelsPromise = reelsService.getAllReelsAdmin().catch(err => {
                console.error("Failed to fetch reels:", err);
                return [];
            });
            
            const analyticsPromise = reelsService.getAnalytics().catch(err => {
                console.error("Failed to fetch analytics:", err);
                // Return default analytics values
                return {
                    total_reels: 0,
                    total_views: 0,
                    total_likes: 0,
                    total_comments: 0,
                    most_viewed: [],
                    most_liked: []
                };
            });
            
            const [reelsData, analyticsData] = await Promise.all([
                reelsPromise,
                analyticsPromise
            ]);
            
            setReels(reelsData || []);
            setAnalytics(analyticsData || {
                total_reels: 0,
                total_views: 0,
                total_likes: 0,
                total_comments: 0,
                most_viewed: [],
                most_liked: []
            });
        } catch (error) {
            console.error("Unexpected error fetching data:", error);
            // Set defaults on complete failure
            setReels([]);
            setAnalytics({
                total_reels: 0,
                total_views: 0,
                total_likes: 0,
                total_comments: 0,
                most_viewed: [],
                most_liked: []
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const pickVideo = async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Please grant access to your media library to upload videos");
                return;
            }

            // Launch image picker for videos
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                allowsMultipleSelection: false,
                quality: 1,
                videoMaxDuration: 300, // 5 minutes max
            });

            console.log('Video picker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const video = result.assets[0];
                console.log('Selected video:', {
                    uri: video.uri,
                    type: video.type,
                    duration: video.duration,
                    width: video.width,
                    height: video.height
                });
                setSelectedVideo(video);
                Alert.alert("Video Selected", `Video selected: ${video.uri.split('/').pop()}`);
            } else {
                console.log('Video selection cancelled');
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert("Error", `Failed to pick video: ${error.message || 'Unknown error'}`);
        }
    };

    const handleCreate = async () => {
        if (uploadMode === 'url' && !newVideoUrl) {
            return Alert.alert("Error", "Video URL is required");
        }
        if (uploadMode === 'file' && !selectedVideo) {
            return Alert.alert("Error", "Please select a video file");
        }

        setSubmitting(true);
        try {
            if (uploadMode === 'file') {
                console.log('Uploading video file...');
                
                // Upload file
                const fileUri = selectedVideo.uri;
                const filename = fileUri.split('/').pop() || 'video.mp4';
                
                // Extract file extension
                const fileExtension = filename.split('.').pop()?.toLowerCase() || 'mp4';
                const mimeType = `video/${fileExtension}`;

                console.log('File details:', { 
                    uri: fileUri, 
                    filename, 
                    type: mimeType,
                    size: selectedVideo.fileSize 
                });

                const formData = new FormData();
                
                // Create blob from file URI for web
                if (Platform.OS === 'web') {
                    try {
                        const response = await fetch(fileUri);
                        const blob = await response.blob();
                        formData.append('file', blob, filename);
                    } catch (error) {
                        console.error('Error creating blob:', error);
                        throw new Error('Failed to read video file');
                    }
                } else {
                    // For mobile, use the standard format
                    formData.append('file', {
                        uri: fileUri,
                        name: filename,
                        type: mimeType,
                    } as any);
                }
                
                if (newTitle) formData.append('title', newTitle);
                if (newDesc) formData.append('description', newDesc);
                formData.append('status', 'ACTIVE');

                console.log('Uploading to backend...');
                const result = await reelsService.uploadReel(formData);
                console.log('Upload successful:', result);
                Alert.alert("Success", "Video uploaded successfully!");
            } else {
                console.log('Creating reel with URL:', newVideoUrl);
                
                // Create with URL
                const result = await reelsService.createReel({
                    video_url: newVideoUrl,
                    title: newTitle,
                    description: newDesc,
                    status: 'ACTIVE'
                });
                
                console.log('Reel created:', result);
                Alert.alert("Success", "Reel created successfully!");
            }

            setIsModalVisible(false);
            setNewVideoUrl('');
            setSelectedVideo(null);
            setNewTitle('');
            setNewDesc('');
            setUploadMode('url');
            fetchData(); // Refresh
        } catch (error: any) {
            console.error('Create reel error:', error);
            const errorMessage = error.response?.data?.detail || error.message || "Create failed";
            Alert.alert("Error", errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(t("admin.manageReels.confirm", "Confirm"), t("admin.manageReels.deleteReel", "Delete this reel?"), [
            { text: t("admin.manageReels.cancel", "Cancel"), style: "cancel" },
            {
                text: t("admin.manageReels.delete", "Delete"), style: 'destructive', onPress: async () => {
                    try {
                        await reelsService.deleteReel(id);
                        setReels(prev => prev.filter(r => r.id !== id));
                    } catch (e) {
                        Alert.alert(t("admin.manageReels.error", "Error"), t("admin.manageReels.deleteFailed", "Delete failed"));
                    }
                }
            }
        ]);
    };

    const renderAnalytics = () => {
        // Always render analytics, even if empty
        const safeAnalytics = analytics || {
            total_reels: 0,
            total_views: 0,
            total_likes: 0,
            total_comments: 0
        };
        
        return (
            <View style={[styles.analyticsContainer, isRTL && styles.analyticsContainerRTL]}>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, isRTL && styles.textRTL]}>{safeAnalytics.total_views || 0}</Text>
                    <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.totalViews", "Total Views")}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, isRTL && styles.textRTL]}>{safeAnalytics.total_likes || 0}</Text>
                    <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.totalLikes", "Total Likes")}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statValue, isRTL && styles.textRTL]}>{safeAnalytics.total_reels || 0}</Text>
                    <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t("admin.manageReels.reels", "Reels")}</Text>
                </View>
            </View>
        );
    };

    const handleReelPress = (reelId: string) => {
        router.push(`/(admin)/reels/${reelId}`);
    };

    // Get API base URL for video sources
    const getApiBaseUrl = (): string => {
        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (apiUrl && typeof apiUrl === 'string') {
            return apiUrl;
        }
        if (Platform.OS === 'web') {
            return 'http://localhost:8082/api';
        }
        const manifest = Constants.expoConfig || Constants.manifest;
        let ip: string | null = null;
        if (manifest?.hostUri) {
            ip = manifest.hostUri.split(':')[0];
        }
        if (!ip && Constants.debuggerHost) {
            ip = Constants.debuggerHost.split(':')[0];
        }
        if (!ip && manifest?.extra?.devServerIp) {
            ip = manifest.extra.devServerIp;
        }
        if (!ip) {
            ip = '192.168.1.27';
        }
        return `http://${ip}:8082/api`;
    };

    const renderItem = ({ item }: { item: Reel }) => {
        // Determine thumbnail source - Try to extract from different sources
        let thumbnailSource = null;
        let videoSource = null;
        
        if (item.thumbnail_url) {
            // Use explicit thumbnail if available
            thumbnailSource = { uri: item.thumbnail_url };
        } else if (item.video_url) {
            // For YouTube videos, extract thumbnail
            if (item.video_type === 'YOUTUBE' || item.video_url.includes('youtube.com') || item.video_url.includes('youtu.be')) {
                // Extract YouTube video ID and construct thumbnail URL
                const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                const match = item.video_url.match(youtubeRegex);
                if (match && match[1]) {
                    thumbnailSource = { uri: `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` };
                }
            } else if (item.video_type === 'UPLOAD') {
                // For uploaded videos, use video URL as source for Video component
                const baseUrl = getApiBaseUrl();
                if (item.video_url.startsWith('/')) {
                    videoSource = `${baseUrl}${item.video_url}`;
                } else if (item.video_url.startsWith('http://') || item.video_url.startsWith('https://')) {
                    videoSource = item.video_url;
                } else {
                    videoSource = `${baseUrl}/reels/video/${item.video_url.split('/').pop()}`;
                }
            } else if (item.video_type === 'URL') {
                // For direct video URLs from CDNs, try using as thumbnail (may not work)
                thumbnailSource = { uri: item.video_url };
            }
        }

        // Determine icon type based on video type
        const getVideoIcon = () => {
            if (item.video_type === 'YOUTUBE') return 'logo-youtube';
            if (item.video_type === 'UPLOAD') return 'cloud-upload-outline';
            return 'link-outline';
        };

        return (
            <TouchableOpacity 
                style={[styles.row, isRTL && styles.rowRTL]}
                onPress={() => handleReelPress(item.id)}
                activeOpacity={0.7}
            >
                {/* Thumbnail */}
                <View style={[styles.thumbnail, isRTL && styles.thumbnailRTL]}>
                    {thumbnailSource ? (
                        <>
                            <Image 
                                source={thumbnailSource} 
                                style={styles.thumbnailImage}
                                resizeMode="cover"
                                onError={(e) => {
                                    console.log('Thumbnail failed to load:', item.video_url);
                                }}
                            />
                            {/* Video type badge */}
                            <View style={[styles.thumbnailBadge, isRTL && styles.thumbnailBadgeRTL]}>
                                <Ionicons name={getVideoIcon()} size={12} color="white" />
                            </View>
                        </>
                    ) : videoSource ? (
                        <>
                            {/* Use Video component to show first frame for uploaded videos */}
                            <Video
                                source={{ uri: videoSource }}
                                style={styles.thumbnailImage}
                                resizeMode={ResizeMode.COVER}
                                shouldPlay={false}
                                useNativeControls={false}
                                isMuted={true}
                                isLooping={false}
                            />
                            {/* Play overlay icon */}
                            <View style={styles.playIconOverlay}>
                                <Ionicons name="play-circle" size={16} color="rgba(255,255,255,0.95)" />
                            </View>
                            {/* Video type badge */}
                            <View style={[styles.thumbnailBadge, isRTL && styles.thumbnailBadgeRTL]}>
                                <Ionicons name={getVideoIcon()} size={12} color="white" />
                            </View>
                        </>
                    ) : (
                        <>
                            <Ionicons name="videocam" size={24} color="#666" />
                            <Text style={styles.thumbnailLabel}>{item.video_type || 'Video'}</Text>
                        </>
                    )}
                </View>
                <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, isRTL && styles.textRTL]}>{item.title || t("admin.manageReels.noTitle", "(No Title)")}</Text>
                    <Text style={[styles.rowSub, isRTL && styles.textRTL]}>{t("admin.manageReels.views", "views")}: {item.views_count} • {t("admin.manageReels.likes", "likes")}: {item.likes_count}</Text>
                    <View style={[styles.statusRow, isRTL && styles.statusRowRTL]}>
                        <Text style={[styles.rowStatus, isRTL && styles.textRTL]}>{item.status}</Text>
                        {item.video_type && (
                            <Text style={[styles.videoTypeLabel, isRTL && styles.textRTL]}>
                                {t("common.bulletWithValue", { value: item.video_type })}
                            </Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent row click
                        handleDelete(item.id);
                    }} 
                    style={styles.deleteBtn}
                >
                    <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.reelsManagement", "Reels"), headerBackTitle: t("common.back") }} />

            {/* Header Actions */}
            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t("admin.reelsManagement", "Reels")}</Text>
                    <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>{reels.length} {t("admin.manageReels.totalReels", "Total Reels")}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createBtn, isRTL && styles.createBtnRTL]}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={[styles.createBtnText, isRTL && styles.createBtnTextRTL]}>{t("admin.manageReels.newReel", "New Reel")}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 50 }} />
            ) : (
                <>
                    {renderAnalytics()}

                    {reels.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="videocam-outline" size={64} color="#ccc" />
                            <Text style={[styles.emptyStateText, isRTL && styles.textRTL]}>{t("admin.manageReels.noReels", "No reels yet")}</Text>
                            <Text style={[styles.emptyStateSubtext, isRTL && styles.textRTL]}>{t("admin.manageReels.createFirst", "Create your first reel to get started")}</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={reels}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingBottom: 50 }}
                        />
                    )}
                </>
            )}

            {/* Create Modal */}
            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
                <ScrollView style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>{t("admin.manageReels.addNewReelTitle")}</Text>

                    {/* Mode Selector */}
                    <View style={styles.modeSelector}>
                        <TouchableOpacity
                            style={[styles.modeButton, uploadMode === 'url' && styles.modeButtonActive]}
                            onPress={() => setUploadMode('url')}
                        >
                            <Text style={[styles.modeButtonText, uploadMode === 'url' && styles.modeButtonTextActive]}>
                                {t("admin.manageReels.videoUrlMode")}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeButton, uploadMode === 'file' && styles.modeButtonActive]}
                            onPress={() => setUploadMode('file')}
                        >
                            <Text style={[styles.modeButtonText, uploadMode === 'file' && styles.modeButtonTextActive]}>
                                {t("admin.manageReels.uploadFileMode")}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {uploadMode === 'url' ? (
                        <>
                            <TextInput
                                placeholder={t("admin.manageReels.videoUrlPlaceholder")}
                                style={styles.input}
                                value={newVideoUrl}
                                onChangeText={setNewVideoUrl}
                                autoCapitalize="none"
                            />
                            <Text style={styles.helpText}>
                                {t("admin.manageReels.urlHelpText")}
                            </Text>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={pickVideo} style={styles.filePickerButton}>
                                <Ionicons name="videocam-outline" size={24} color="#007AFF" />
                                <Text style={styles.filePickerText}>
                                    {selectedVideo ? selectedVideo.uri.split('/').pop() : 'Select Video File'}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.helpText}>
                                Supported formats: MP4, MOV, AVI, MKV, WEBM, M4V, 3GP
                            </Text>
                        </>
                    )}

                    <TextInput
                        placeholder="Title (Optional)"
                        style={styles.input}
                        value={newTitle}
                        onChangeText={setNewTitle}
                    />
                    <TextInput
                        placeholder="Description / Hashtags (Optional)"
                        style={[styles.input, { height: 80 }]}
                        multiline
                        value={newDesc}
                        onChangeText={setNewDesc}
                    />

                    <View style={[styles.modalButtons, isRTL && styles.modalButtonsRTL]}>
                        <TouchableOpacity onPress={() => {
                            setIsModalVisible(false);
                            setNewVideoUrl('');
                            setSelectedVideo(null);
                            setUploadMode('url');
                        }} style={styles.cancelBtn}>
                            <Text>{t("common.cancel", "Cancel")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCreate} style={styles.submitBtn} disabled={submitting}>
                            <Text style={{ color: 'white' }}>{submitting ? t("common.loading", "Loading...") : t("admin.manageReels.newReel", "Create Reel")}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    analyticsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        padding: 20,
        margin: 10,
        borderRadius: 10,
        elevation: 2
    },
    analyticsContainerRTL: {
        flexDirection: 'row-reverse',
    },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 12, color: '#666' },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerRowRTL: {
        flexDirection: 'row-reverse',
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    pageSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    textRTL: {
        textAlign: 'right',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1071b8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '600',
        marginStart: 6,
    },
    createBtnRTL: {
        flexDirection: 'row-reverse',
    },
    createBtnTextRTL: {
        marginStart: 0,
        marginEnd: 6,
    },

    row: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 15,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    thumbnail: {
        width: 50, 
        height: 80, 
        backgroundColor: '#eee', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginEnd: 15, 
        borderRadius: 4,
        overflow: 'hidden'
    },
    thumbnailRTL: {
        marginEnd: 0,
        marginStart: 15,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        left: undefined,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 3,
    },
    thumbnailBadgeRTL: {
        right: undefined,
        left: 2,
    },
    thumbnailLabel: {
        fontSize: 8,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    playIconOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    rowContent: { flex: 1 },
    rowTitle: { fontWeight: 'bold', fontSize: 16 },
    rowSub: { color: '#666', fontSize: 12, marginTop: 4 },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusRowRTL: {
        flexDirection: 'row-reverse',
    },
    rowStatus: { fontSize: 12, color: 'blue' },
    videoTypeLabel: {
        fontSize: 11,
        color: '#999',
        marginStart: 4,
    },
    deleteBtn: { padding: 10 },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 20,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },

    modalContainer: { padding: 20, paddingTop: 50 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    modeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    modeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    modeButtonActive: {
        backgroundColor: '#007AFF',
    },
    modeButtonText: {
        fontSize: 16,
        color: '#666',
    },
    modeButtonTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
    helpText: {
        fontSize: 12,
        color: '#666',
        marginTop: -10,
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    filePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderStyle: 'dashed',
    },
    filePickerText: {
        marginStart: 10,
        fontSize: 16,
        color: '#007AFF',
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    modalButtonsRTL: { flexDirection: 'row-reverse' },
    cancelBtn: { padding: 15 },
    submitBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8 }
});
