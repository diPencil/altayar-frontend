import React, { useState, useRef, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
    Linking,
} from "react-native";
import Toast from "../../src/components/Toast";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { chatApi, type Conversation as APIConversation, type Message as APIMessage } from "../../src/services/api";

const COLORS = {
    primary: '#0084ff',
    background: '#ffffff',
    messageBg: '#f0f2f5',
    text: '#050505',
    textLight: '#65676b',
    border: '#e4e6eb',
    success: '#31a24c',
    warning: '#f59e0b',
    error: '#fa383e',
    unreadBadge: '#e41e3f',
    searchBg: '#f0f2f5',
    screenBg: '#f8f9fa',
};

interface Message {
    id: string;
    text: string;
    sender: "user" | "employee";
    timestamp: Date;
    senderName?: string;
}

export default function EmployeeChatsScreen() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const { user } = useAuth();
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const params = useLocalSearchParams();

    // Screen navigation
    const [currentScreen, setCurrentScreen] = useState<"list" | "chat">("list");
    const [conversations, setConversations] = useState<APIConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<APIConversation | null>(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "active" | "closed">("all");

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Load assigned conversations
    useEffect(() => {
        if (currentScreen === "list") {
            loadConversations();
        }
    }, [currentScreen, statusFilter]);

    // Poll for new messages when in chat
    useEffect(() => {
        if (currentScreen === "chat" && selectedConversation) {
            const interval = setInterval(() => {
                loadMessages(selectedConversation.id);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [currentScreen, selectedConversation]);

    // Poll for new conversations in list view
    useEffect(() => {
        if (currentScreen === "list") {
            const interval = setInterval(() => {
                loadConversations();
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [currentScreen, statusFilter]);

    const loadConversations = async () => {
        try {
            setIsLoading(true);

            // Use getAssigned() for employees - only shows conversations assigned to them
            const status = statusFilter !== "all" ? statusFilter.toUpperCase() : undefined;
            const convs = await chatApi.getAssigned(status);
            setConversations(convs);

            // Handle deep link if params.id exists and we haven't selected one yet
            if (params.id && !selectedConversation && currentScreen === 'list') {
                const targetConv = convs.find((c: APIConversation) => c.id === params.id);
                if (targetConv) {
                    selectConversation(targetConv);
                } else {
                    // If not in the list (maybe filtered out elsewhere or not loaded), try fetching it directly
                    try {
                        // Optional: fetch specific conversation if not in list
                        // For now, let's assume it should be in the assigned list if it's assigned
                        // Or we can just ignore if not found
                        const specificConv = await chatApi.getConversation(params.id as string);
                        if (specificConv) {
                            selectConversation(specificConv);
                        }
                    } catch (e) {
                        console.log("Could not load deep linked conversation");
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
            showToast(t("employee.chat.loadError", "Failed to load conversations"), "error");
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const conv = await chatApi.getConversation(conversationId);

            const formattedMessages: Message[] = (conv.messages || []).map((msg: APIMessage) => ({
                id: msg.id,
                text: msg.content,
                sender: msg.sender_role === "CUSTOMER" ? "user" : "employee",
                timestamp: new Date(msg.created_at),
                senderName: msg.sender_name,
            }));

            setMessages(formattedMessages);
            setSelectedConversation(conv);

            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) {
            console.error("Failed to load messages:", error);
        }
    };

    const selectConversation = async (conversation: APIConversation) => {
        setSelectedConversation(conversation);
        setCurrentScreen("chat");
        await loadMessages(conversation.id);
    };

    const goBackToList = () => {
        setCurrentScreen("list");
        setSelectedConversation(null);
        setMessages([]);
        loadConversations();
    };

    const sendMessage = async () => {
        if (!message.trim() || !selectedConversation || isSending) return;

        const messageText = message.trim();
        setMessage("");
        setIsSending(true);

        try {
            await chatApi.sendMessage(selectedConversation.id, {
                content: messageText,
            });

            await loadMessages(selectedConversation.id);

        } catch (error) {
            console.error("Failed to send message:", error);
            setMessage(messageText);
            showToast(t("employee.chat.sendError", "Failed to send message"), "error");
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseConversation = async () => {
        if (!selectedConversation) return;

        Alert.alert(
            t('employee.chat.closeConversation'),
            t('employee.chat.closeConfirm'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('employee.chat.close'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await chatApi.closeConversation(selectedConversation.id);
                            await loadMessages(selectedConversation.id);

                            Alert.alert(
                                t('employee.chat.closed'),
                                t('employee.chat.closedSuccess')
                            );
                        } catch (error) {
                            console.error("Failed to close conversation:", error);
                            showToast(t('employee.chat.failedToClose'), 'error');
                        }
                    },
                },
            ]
        );
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('common.now');
        if (diffMins < 60) return `${diffMins}${t('common.minutesShort')}`;
        if (diffHours < 24) return `${diffHours}${t('common.hoursShort')}`;
        if (diffDays < 7) return `${diffDays}${t('common.daysShort')}`;

        return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const formatMessageTime = (date: Date) => {
        return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ACTIVE": return COLORS.success;
            case "WAITING": return COLORS.warning;
            case "CLOSED": return COLORS.textLight;
            default: return COLORS.textLight;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "ACTIVE": return t('chat.status.active');
            case "WAITING": return t('chat.status.waiting');
            case "CLOSED": return t('chat.status.closed');
            default: return status;
        }
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#0084ff', '#44bec7', '#ffc300', '#fa3c4c', '#d696bb', '#6bcbef'];
        if (!name || name.length === 0) {
            return colors[0];
        }
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const parseMessageText = (text: string) => {
        const urlRegex = /(altayar:\/\/[^\s]+|https?:\/\/[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*)/g;
        const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = urlRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: text.substring(lastIndex, match.index)
                });
            }

            parts.push({
                type: 'link',
                content: match[0]
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push({
                type: 'text',
                content: text.substring(lastIndex)
            });
        }

        return parts.length > 0 ? parts : [{ type: 'text', content: text }];
    };

    const handleLinkPress = async (url: string) => {
        try {
            // Handle deep links (altayar://)
            if (url.startsWith('altayar://')) {
                const deepLink = url.replace('altayar://', '');
                const [screen, ...params] = deepLink.split('/');

                if (screen === 'reels' && params.length > 0) {
                    const reelId = params[0];
                    // Employee can view reels in admin panel or user view
                    router.push({
                        pathname: '/(admin)/reels/[id]',
                        params: { id: reelId }
                    } as any);
                    return;
                }

                if (await Linking.canOpenURL(url)) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert(t('chat.linkError', 'Link Error'), t('chat.cannotOpenLink', 'Cannot open this link'));
                }
                return;
            }

            // Handle regular URLs (http://, https://)
            if (url.startsWith('http://') || url.startsWith('https://')) {
                if (await Linking.canOpenURL(url)) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert(t('chat.linkError', 'Link Error'), t('chat.cannotOpenLink', 'Cannot open this link'));
                }
                return;
            }

            // Handle bare domain names (e.g., example.com)
            if (url.includes('.')) {
                const fullUrl = `https://${url}`;
                if (await Linking.canOpenURL(fullUrl)) {
                    await Linking.openURL(fullUrl);
                } else {
                    Alert.alert(t('chat.linkError', 'Link Error'), t('chat.cannotOpenLink', 'Cannot open this link'));
                }
                return;
            }
        } catch (error) {
            console.error('Failed to open link:', error);
            Alert.alert(t('chat.linkError', 'Link Error'), t('chat.cannotOpenLink', 'Cannot open this link'));
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            {currentScreen === "list" ? (
                <>
                    <View style={[styles.header, isRTL && styles.headerRTL]}>
                        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                            {t('employee.chat.myChats')}
                        </Text>
                    </View>

                    <View style={styles.filterContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScroll, isRTL && styles.filterScrollRTL]}>
                            {(['all', 'waiting', 'active', 'closed'] as const).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterTab,
                                        statusFilter === filter && styles.filterTabActive
                                    ]}
                                    onPress={() => setStatusFilter(filter)}
                                >
                                    <Text style={[
                                        styles.filterTabText,
                                        statusFilter === filter && styles.filterTabTextActive
                                    ]}>
                                        {filter === 'all' ? t('common.all') :
                                            filter === 'waiting' ? t('chat.status.waiting') :
                                                filter === 'active' ? t('chat.status.active') :
                                                    t('chat.status.closed')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
                        <Ionicons name="search" size={18} color={COLORS.textLight} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
                            placeholder={t('employee.chat.searchPlaceholder', 'Search...')}
                            placeholderTextColor={COLORS.textLight}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : filteredConversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
                            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                                {t('employee.chat.emptyAssigned')}
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
                            {filteredConversations.map((conversation) => (
                                <TouchableOpacity
                                    key={conversation.id}
                                    style={[styles.conversationItem, isRTL && styles.conversationItemRTL]}
                                    onPress={() => selectConversation(conversation)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.avatarContainer}>
                                        {conversation.customer_avatar ? (
                                            <Image
                                                source={{ uri: conversation.customer_avatar }}
                                                style={styles.conversationAvatar}
                                            />
                                        ) : (
                                            <View style={[styles.conversationAvatar, { backgroundColor: getAvatarColor(conversation.customer_name || 'U') }]}>
                                                <Text style={styles.conversationAvatarText}>
                                                    {(conversation.customer_name || 'U').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.conversationContent}>
                                        <View style={[styles.conversationTop, isRTL && styles.conversationTopRTL]}>
                                            <Text style={[styles.conversationName, isRTL && styles.textRTL]} numberOfLines={1}>
                                                {conversation.customer_name || t('common.user')}
                                            </Text>
                                            <Text style={[styles.conversationTime, isRTL && styles.conversationTimeRTL]}>
                                                {formatTime(new Date(conversation.last_message_at || conversation.created_at))}
                                            </Text>
                                        </View>

                                        <View style={[styles.conversationBottom, isRTL && styles.conversationBottomRTL]}>
                                            <Text
                                                style={[
                                                    styles.conversationMessage,
                                                    isRTL && styles.textRTL,
                                                    (conversation.employee_unread_count || 0) > 0 && styles.conversationMessageUnread
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {conversation.last_message_preview || t('employee.chat.newConversation')}
                                            </Text>
                                            {(conversation.employee_unread_count || 0) > 0 && (
                                                <View style={[styles.unreadBadge, isRTL && styles.unreadBadgeRTL]}>
                                                    <Text style={styles.unreadBadgeText}>
                                                        {conversation.employee_unread_count! > 9 ? '9+' : conversation.employee_unread_count}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={[styles.statusRow, isRTL && styles.statusRowRTL]}>
                                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(conversation.status) }, isRTL && styles.statusDotRTL]} />
                                            <Text style={[styles.statusLabel, isRTL && styles.textRTL]}>
                                                {getStatusText(conversation.status)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </>
            ) : (
                <>
                    <View style={[styles.chatHeader, isRTL && styles.chatHeaderRTL]}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={goBackToList}
                        >
                            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={[styles.chatHeaderInfo, isRTL && styles.chatHeaderInfoRTL]}>
                            <View style={styles.avatarContainer}>
                                {selectedConversation?.customer_avatar ? (
                                    <Image
                                        source={{ uri: selectedConversation.customer_avatar }}
                                        style={styles.chatAvatar}
                                    />
                                ) : (
                                    <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(selectedConversation?.customer_name || 'U') }]}>
                                        <Text style={styles.chatAvatarText}>
                                            {(selectedConversation?.customer_name || 'U').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View>
                                <Text style={[styles.chatUserName, isRTL && styles.textRTL]}>
                                    {selectedConversation?.customer_name || t('common.user')}
                                </Text>
                                <View style={[styles.statusBadgeContainer, isRTL && styles.statusBadgeContainerRTL]}>
                                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedConversation?.status || 'WAITING') }]} />
                                    <Text style={[styles.chatUserStatus, isRTL && styles.textRTL]}>
                                        {getStatusText(selectedConversation?.status || 'WAITING')}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={handleCloseConversation}
                        >
                            <Ionicons
                                name={selectedConversation?.status === 'CLOSED' ? "checkmark-circle-outline" : "close-circle-outline"}
                                size={22}
                                color={selectedConversation?.status === 'CLOSED' ? COLORS.success : COLORS.error}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        ref={scrollRef}
                        style={styles.messagesScroll}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg, index) => {
                            const isSameSender = index > 0 && messages[index - 1].sender === msg.sender;
                            const showAvatar = msg.sender === "user" && !isSameSender;

                            return (
                                <View key={msg.id} style={[
                                    styles.messageRow,
                                    msg.sender === "employee" && styles.messageRowEmployee,
                                    isRTL && msg.sender === "user" && styles.messageRowUserRTL,
                                    isRTL && msg.sender === "employee" && styles.messageRowEmployeeRTL,
                                ]}>
                                    {msg.sender === "user" && (
                                        <View style={styles.messageAvatarContainer}>
                                            {showAvatar ? (
                                                selectedConversation?.customer_avatar ? (
                                                    <Image
                                                        source={{ uri: selectedConversation.customer_avatar }}
                                                        style={styles.messageAvatar}
                                                    />
                                                ) : (
                                                    <View style={[styles.messageAvatar, { backgroundColor: getAvatarColor(msg.senderName || 'U') }]}>
                                                        <Text style={styles.messageAvatarText}>
                                                            {(msg.senderName || 'U').charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )
                                            ) : (
                                                <View style={styles.messageAvatarSpacer} />
                                            )}
                                        </View>
                                    )}

                                    <View style={[
                                        styles.messageBubble,
                                        msg.sender === "user" && styles.userBubble,
                                        msg.sender === "employee" && styles.employeeBubble,
                                        !isSameSender && styles.messageBubbleFirst,
                                    ]}>
                                        <View style={styles.messageTextContainer}>
                                            {parseMessageText(msg.text).map((part, partIndex) => {
                                                if (part.type === 'link') {
                                                    return (
                                                        <TouchableOpacity
                                                            key={partIndex}
                                                            onPress={() => handleLinkPress(part.content)}
                                                        >
                                                            <Text style={[
                                                                styles.messageText,
                                                                styles.messageLink,
                                                                msg.sender === "employee" && styles.employeeMessageText,
                                                                msg.sender === "employee" && styles.employeeMessageLink,
                                                                isRTL && styles.textRTL,
                                                            ]}>
                                                                {part.content}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                }
                                                return (
                                                    <Text
                                                        key={partIndex}
                                                        style={[
                                                            styles.messageText,
                                                            msg.sender === "employee" && styles.employeeMessageText,
                                                            isRTL && styles.textRTL,
                                                        ]}
                                                    >
                                                        {part.content}
                                                    </Text>
                                                );
                                            })}
                                        </View>
                                        <Text style={[
                                            styles.messageTime,
                                            msg.sender === "employee" && styles.employeeMessageTime,
                                        ]}>
                                            {formatMessageTime(msg.timestamp)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        keyboardVerticalOffset={90}
                    >
                        <View style={[styles.inputArea, isRTL && styles.inputAreaRTL]}>
                            <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
                                <TextInput
                                    style={[styles.input, isRTL && styles.inputRTL]}
                                    placeholder={t('employee.chat.typeMessage')}
                                    placeholderTextColor={COLORS.textLight}
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    maxLength={1000}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.sendBtn, (!message.trim() || isSending) && styles.sendBtnDisabled]}
                                onPress={sendMessage}
                                disabled={!message.trim() || isSending}
                                activeOpacity={0.7}
                            >
                                {isSending ? (
                                    <ActivityIndicator size="small" color={COLORS.background} />
                                ) : (
                                    <Ionicons name="send" size={20} color={COLORS.background} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </>
            )}
            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </SafeAreaView>
    );
}

// Use the same styles from admin chat
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.screenBg },
    header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerRTL: { flexDirection: 'row-reverse' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
    filterContainer: { backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    filterScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    filterScrollRTL: { flexDirection: 'row-reverse' },
    filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.searchBg, marginRight: 8 },
    filterTabActive: { backgroundColor: COLORS.primary },
    filterTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
    filterTabTextActive: { color: COLORS.background },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.searchBg, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, gap: 8 },
    searchContainerRTL: { flexDirection: 'row-reverse' },
    searchIcon: {},
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 0 },
    searchInputRTL: { textAlign: 'right' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: COLORS.textLight, marginTop: 16 },
    conversationsList: { flex: 1 },
    conversationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
    conversationItemRTL: { flexDirection: 'row-reverse' },
    avatarContainer: { position: 'relative' },
    conversationAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    conversationAvatarText: { color: COLORS.background, fontSize: 20, fontWeight: '600' },
    conversationContent: { flex: 1 },
    conversationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    conversationTopRTL: { flexDirection: 'row-reverse' },
    conversationName: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },
    conversationTime: { fontSize: 13, color: COLORS.textLight, marginLeft: 8 },
    conversationTimeRTL: { marginLeft: 0, marginRight: 8 },
    conversationBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    conversationBottomRTL: { flexDirection: 'row-reverse' },
    conversationMessage: { fontSize: 14, color: COLORS.textLight, flex: 1 },
    conversationMessageUnread: { fontWeight: '600', color: COLORS.text },
    unreadBadge: { backgroundColor: COLORS.unreadBadge, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 8 },
    unreadBadgeRTL: { marginLeft: 0, marginRight: 8 },
    unreadBadgeText: { color: COLORS.background, fontSize: 12, fontWeight: '700' },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusRowRTL: { flexDirection: 'row-reverse' },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusDotRTL: { marginRight: 0, marginLeft: 6 },
    statusLabel: { fontSize: 12, color: COLORS.textLight },
    chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    chatHeaderRTL: { flexDirection: 'row-reverse' },
    backBtn: { padding: 4, marginRight: 12 },
    chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    chatHeaderInfoRTL: { flexDirection: 'row-reverse' },
    chatAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    chatAvatarText: { color: COLORS.background, fontSize: 18, fontWeight: '600' },
    chatUserName: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
    statusBadgeContainer: { flexDirection: 'row', alignItems: 'center' },
    statusBadgeContainerRTL: { flexDirection: 'row-reverse' },
    chatUserStatus: { fontSize: 13, color: COLORS.textLight },
    actionBtn: { padding: 8 },
    messagesScroll: { flex: 1, backgroundColor: COLORS.screenBg },
    messagesContent: { padding: 16, paddingBottom: 8 },
    messageRow: { flexDirection: 'row', marginBottom: 4, justifyContent: 'flex-end' },
    messageRowEmployee: { justifyContent: 'flex-start' },
    messageRowUserRTL: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
    messageRowEmployeeRTL: { flexDirection: 'row-reverse', justifyContent: 'flex-end' },
    messageAvatarContainer: { width: 32, marginRight: 8 },
    messageAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    messageAvatarText: { color: COLORS.background, fontSize: 12, fontWeight: '600' },
    messageAvatarSpacer: { width: 28, height: 28 },
    messageBubble: { maxWidth: '70%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 2 },
    messageBubbleFirst: { marginBottom: 8 },
    userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    employeeBubble: { backgroundColor: COLORS.messageBg, borderBottomLeftRadius: 4 },
    messageTextContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    messageText: { fontSize: 15, lineHeight: 20, color: COLORS.background, marginBottom: 2 },
    employeeMessageText: { color: COLORS.text },
    messageLink: { color: '#ADD8E6', textDecorationLine: 'underline' },
    employeeMessageLink: { color: '#007AFF' },
    messageTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end' },
    employeeMessageTime: { color: COLORS.textLight },
    inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    inputAreaRTL: { flexDirection: 'row-reverse' },
    inputContainer: { flex: 1, backgroundColor: COLORS.searchBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, maxHeight: 100 },
    inputContainerRTL: { marginRight: 0, marginLeft: 8 },
    input: { fontSize: 15, color: COLORS.text, paddingVertical: 0 },
    inputRTL: { textAlign: 'right' },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    sendBtnDisabled: { backgroundColor: COLORS.border, opacity: 0.5 },
    textRTL: { textAlign: 'right' },
});
