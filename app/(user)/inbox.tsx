import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { chatApi, type Conversation as APIConversation, type Message as APIMessage } from "../../src/services/api";
import EmojiPicker from "../../src/components/EmojiPicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "../../src/components/Toast";

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

interface Message {
  id: string;
  text: string;
  sender: "user" | "support";
  timestamp: Date;
  senderName?: string;
}

type ConversationState = "pending" | "waiting_agent" | "active";

export default function ChatScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const autoSendPrefill = useRef<string | null>(null);
  const autoSendDoneRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<"list" | "chat">("list");
  const [conversations, setConversations] = useState<APIConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<APIConversation | null>(null);

  // Chat state
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  // Load conversations on mount
  useEffect(() => {
    if (currentScreen === "list") {
      loadConversations();
    }
  }, [currentScreen]);

  const getAutoSendParams = () => {
    const autoSendRaw = String((params as any)?.autoSend || "");
    const autoSend = autoSendRaw === "1" || autoSendRaw.toLowerCase() === "true";
    const prefill = String((params as any)?.prefill || "");
    return { autoSend, prefill };
  };

  // Poll for new messages when in chat
  useEffect(() => {
    if (currentScreen === "chat" && selectedConversation) {
      const interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentScreen, selectedConversation]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const convs = await chatApi.getMyConversations();
      setConversations(convs);

      // If opened from memberships page: auto-open and send message once.
      const { autoSend, prefill } = getAutoSendParams();
      if (autoSend && prefill && !autoSendDoneRef.current) {
        autoSendPrefill.current = prefill;
        // Try to use an existing open conversation, otherwise create a new one.
        const activeConv = (convs || []).find(c =>
          c.status === "OPEN" || c.status === "ASSIGNED" || c.status === "WAITING" || c.status === "ACTIVE"
        );
        if (activeConv) {
          await selectConversation(activeConv);
          await chatApi.sendMessage(activeConv.id, { content: prefill });
          await loadMessages(activeConv.id);
        } else {
          const newConv = await chatApi.startConversation({ initial_message: prefill });
          setSelectedConversation(newConv);
          setCurrentScreen("chat");
          setConversationState("pending");
          await loadMessages(newConv.id);
        }
        autoSendDoneRef.current = true;
      }
    } catch (error: any) {
      console.error("Failed to load conversations:", error);
      const errorMessage = error?.message || "Failed to load conversations";

      // Check if it's a connection error
      if (errorMessage.includes("Cannot connect") || errorMessage.includes("Failed to fetch")) {
        setError("Cannot connect to server. Please ensure the backend server is running on http://localhost:8082");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const conv = await chatApi.getConversation(conversationId);

      // Convert API messages to local format
      const formattedMessages: Message[] = (conv.messages || []).map((msg: APIMessage) => ({
        id: msg.id,
        text: msg.content,
        sender: msg.sender_role === "CUSTOMER" ? "user" : "support",
        timestamp: new Date(msg.created_at),
        senderName: msg.sender_name,
      }));

      setMessages(formattedMessages);

      // Update conversation state based on status
      if (conv.status === "RESOLVED" || conv.status === "CLOSED") {
        setConversationState("pending"); // Treat closed as pending to disable input
      } else if (conv.status === "ACTIVE") {
        setConversationState("active");
      } else if (conv.status === "WAITING") {
        setConversationState("waiting_agent");
      } else {
        setConversationState("pending");
      }

      // Auto scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const startNewChat = async () => {
    try {
      setIsLoading(true);

      // Create new conversation with welcome message
      const welcomeMsg = t('chat.welcomeMessage');

      const newConv = await chatApi.startConversation({
        initial_message: welcomeMsg,
      });

      setSelectedConversation(newConv);
      setCurrentScreen("chat");
      setConversationState("pending");

      // Load messages
      await loadMessages(newConv.id);
    } catch (error: any) {
      console.error("Failed to start conversation:", error);

      // If error is 400 (Bad Request), it likely means there's an open conversation
      if (error?.response?.status === 400 || error?.status === 400 || error?.message?.includes('open conversation')) {
        // Find the active conversation
        const activeConv = conversations.find(c =>
          c.status === "OPEN" || c.status === "ASSIGNED" || c.status === "WAITING" || c.status === "ACTIVE"
        );

        if (activeConv) {
          showToast(t('chat.openingCountinueChat'), 'info');
          selectConversation(activeConv);
          return;
        }
      }

      showToast(t('chat.failedToStart'), 'error');
    } finally {
      setIsLoading(false);
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
    setConversationState("pending");
    loadConversations(); // Refresh list
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation || isSending) return;

    // Check if conversation is closed
    if (selectedConversation.status === "RESOLVED" || selectedConversation.status === "CLOSED") {
      Alert.alert(
        t('chat.conversationClosed'),
        t('chat.startNewConversation'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('chat.startNew'), onPress: startNewChat }
        ]
      );
      return;
    }

    const messageText = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      // Send message to backend
      await chatApi.sendMessage(selectedConversation.id, {
        content: messageText,
      });

      // Reload messages to get the updated conversation
      await loadMessages(selectedConversation.id);

      // If this was the first user message, state will change to "waiting_agent"
      // The backend will handle this automatically

    } catch (error: any) {
      console.error("Failed to send message:", error);

      // Check if error is due to closed conversation
      if (error?.response?.status === 403 && error?.response?.data?.detail?.includes("closed")) {
        Alert.alert(
          t('chat.conversationClosed'),
          t('chat.startNewConversation'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('chat.startNew'), onPress: startNewChat }
          ]
        );
      } else {
        // Restore message on other errors
        setMessage(messageText);
        showToast(t('chat.failedToSend'), 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING": return COLORS.warning;
      case "ACTIVE": return COLORS.success;
      case "CLOSED": return COLORS.textLight;
      default: return COLORS.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "WAITING": return t('chat.status.waiting');
      case "ACTIVE": return t('chat.status.active');
      case "CLOSED": return t('chat.status.closed');
      case "ASSIGNED": return t('chat.status.assigned');
      case "RESOLVED": return t('chat.status.resolved');
      default: return status;
    }
  };

  const isInputDisabled = Boolean(conversationState === "waiting_agent" ||
    (selectedConversation && (selectedConversation.status === "RESOLVED" || selectedConversation.status === "CLOSED")));

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
          router.push({
            pathname: '/(user)/reels',
            params: { reelId }
          } as any);
          return;
        }

        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
        } else {
          showToast(t('chat.cannotOpenLink', 'Cannot open this link'), 'error');
        }
        return;
      }

      // Handle regular URLs (http://, https://)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
        } else {
          showToast(t('chat.cannotOpenLink', 'Cannot open this link'), 'error');
        }
        return;
      }

      // Handle bare domain names (e.g., example.com)
      if (url.includes('.')) {
        const fullUrl = `https://${url}`;
        if (await Linking.canOpenURL(fullUrl)) {
          await Linking.openURL(fullUrl);
        } else {
          showToast(t('chat.cannotOpenLink', 'Cannot open this link'), 'error');
        }
        return;
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      showToast(t('chat.cannotOpenLink', 'Cannot open this link'), 'error');
    }
  };

  return (
    <View style={styles.container}>
      {currentScreen === "list" ? (
        // ===== CONVERSATIONS LIST SCREEN =====
        <>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {t('chat.support')}
            </Text>
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={startNewChat}
              disabled={isLoading}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              <Text style={[styles.newChatText, isRTL && styles.textRTL]}>
                {t('chat.newChat')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conversations List */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadConversations}
              >
                <Ionicons name="refresh" size={20} color={COLORS.white} />
                <Text style={[styles.retryButtonText, isRTL && styles.textRTL]}>
                  {t('chat.retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.lightGray} />
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t('chat.noConversations')}
              </Text>
              <Text style={[styles.emptySubtext, isRTL && styles.textRTL]}>
                {t('chat.startNewChatInfo')}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {conversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={styles.conversationItem}
                  onPress={() => selectConversation(conversation)}
                >
                  <View style={styles.conversationAvatar}>
                    <Ionicons name="headset" size={24} color={COLORS.primary} />
                  </View>

                  <View style={styles.conversationContent}>
                    <View style={styles.conversationTop}>
                      <Text style={[styles.conversationName, isRTL && styles.textRTL]}>
                        {t('chat.support')}
                      </Text>
                      <Text style={styles.conversationTime}>
                        {new Date(conversation.last_message_at || conversation.created_at).toLocaleTimeString(
                          language === 'ar' ? 'ar-EG' : 'en-US',
                          { hour: '2-digit', minute: '2-digit' }
                        )}
                      </Text>
                    </View>

                    <View style={styles.conversationBottom}>
                      <Text style={[styles.conversationMessage, isRTL && styles.textRTL]} numberOfLines={1}>
                        {conversation.last_message_preview || t('chat.newConversation')}
                      </Text>
                      {(conversation.customer_unread_count || 0) > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {conversation.customer_unread_count}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.statusIndicator}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(conversation.status) }]} />
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
        // ===== INDIVIDUAL CHAT SCREEN =====
        <KeyboardAvoidingView
          style={{ flex: 1, marginBottom: 88 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Chat Header */}
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={goBackToList}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={[styles.headerInfo]}>
              <View style={styles.supportAvatar}>
                <Ionicons name="headset" size={24} color={COLORS.primary} />
              </View>
              <View style={isRTL ? { alignItems: "flex-start" } : undefined}>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                  {t('chat.support')}
                </Text>
                <View style={[styles.statusRow]}>
                  <View style={[
                    styles.onlineDot,
                    { backgroundColor: conversationState === "waiting_agent" ? COLORS.warning : COLORS.success }
                  ]} />
                  <Text style={[styles.statusText, isRTL && styles.textRTL]}>
                    {conversationState === "waiting_agent"
                      ? t('chat.waitingForReply')
                      : t('chat.online')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Waiting for Agent Indicator */}
            {conversationState === "waiting_agent" && (
              <View style={styles.waitingContainer}>
                <View style={styles.waitingBadge}>
                  <Ionicons name="time-outline" size={16} color={COLORS.warning} />
                  <Text style={[styles.waitingText, isRTL && styles.textRTL]}>
                    {t('chat.waitingForSupport')}
                  </Text>
                </View>
              </View>
            )}

            {/* Closed Conversation Indicator */}
            {selectedConversation && (selectedConversation.status === "RESOLVED" || selectedConversation.status === "CLOSED") && (
              <View style={styles.closedContainer}>
                <View style={styles.closedBadge}>
                  <Ionicons name="lock-closed-outline" size={16} color={COLORS.textLight} />
                  <Text style={[styles.closedText, isRTL && styles.textRTL]}>
                    {t('chat.conversationClosed')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.startNewChatBtn}
                  onPress={startNewChat}
                >
                  <Text style={[styles.startNewChatText, isRTL && styles.textRTL]}>
                    {t('chat.startNewConversation')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender === "user" ? styles.userMessage : styles.supportMessage,
                  isRTL && (msg.sender === "user" ? styles.userMessageRTL : styles.supportMessageRTL),
                ]}
              >
                {msg.sender === "support" && (
                  <Text style={[styles.senderName, isRTL && styles.textRTL]}>
                    {msg.senderName || t('chat.supportTeam')}
                  </Text>
                )}
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
                            msg.sender === "user" && styles.userMessageText,
                            msg.sender === "user" && styles.userMessageLink,
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
                          msg.sender === "user" && styles.userMessageText,
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
                  msg.sender === "user" && styles.userMessageTime,
                  isRTL && styles.textRTL,
                ]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Emoji Picker - rendered BEFORE input so it appears below, pushing input up */}
          {showEmojiPicker && (
            <EmojiPicker
              visible={showEmojiPicker}
              onEmojiSelect={(emoji) => {
                setMessage(prev => prev + emoji);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}

          {/* Input */}
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 8 }]}>
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isInputDisabled}
            >
              <Ionicons
                name={showEmojiPicker ? "close-circle" : "happy-outline"}
                size={28}
                color={isInputDisabled ? COLORS.lightGray : COLORS.primary}
              />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                isRTL && styles.inputRTL,
                isInputDisabled && styles.disabledInput
              ]}
              placeholder={
                isInputDisabled
                  ? t('chat.waitingForReply')
                  : t('chat.typeMessage')
              }
              placeholderTextColor={isInputDisabled ? COLORS.lightGray : COLORS.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlign={isRTL ? "right" : "left"}
              editable={!isInputDisabled && !isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!message.trim() || isInputDisabled || isSending) && styles.sendBtnDisabled
              ]}
              onPress={sendMessage}
              disabled={!message.trim() || isInputDisabled || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons
                  name={isRTL ? "arrow-back" : "arrow-forward"}
                  size={20}
                  color={COLORS.white}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },

  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  supportAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  textRTL: {
    textAlign: "right",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  backBtn: {
    padding: 4,
    marginEnd: 12,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.error,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginStart: 8,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  conversationTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  conversationBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginStart: 8,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  waitingContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  waitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  waitingText: {
    fontSize: 13,
    color: "#92400e",
    fontWeight: "600",
  },
  closedContainer: {
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  closedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  closedText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "600",
  },
  startNewChatBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startNewChatText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: "600",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    borderBottomEndRadius: 4,
  },
  userMessageRTL: {
    alignSelf: "flex-start",
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 4,
  },
  supportMessage: {
    backgroundColor: COLORS.white,
    alignSelf: "flex-start",
    borderBottomStartRadius: 4,
  },
  supportMessageRTL: {
    alignSelf: "flex-end",
    borderBottomStartRadius: 16,
    borderBottomEndRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: COLORS.white,
  },
  messageLink: {
    color: '#ADD8E6',
    textDecorationLine: 'underline',
  },
  userMessageLink: {
    color: '#B0E0E6',
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  userMessageTime: {
    color: "rgba(255,255,255,0.7)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },

  emojiBtn: {
    padding: 4,
    marginEnd: 8,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  inputRTL: {
    textAlign: "right",
  },
  disabledInput: {
    backgroundColor: "#f1f5f9",
    color: COLORS.lightGray,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.lightGray,
  },
});
