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
  Modal,
  Alert,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { chatApi, adminApi, type Conversation as APIConversation, type Message as APIMessage } from "../../src/services/api";
import EmojiPicker from "../../src/components/EmojiPicker";

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
  sender: "user" | "admin";
  timestamp: Date;
  senderName?: string;
}

import { useLocalSearchParams, useRouter } from "expo-router";

export default function AdminChatScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);

  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<"list" | "chat">(conversationId ? "chat" : "list");
  const [conversations, setConversations] = useState<APIConversation[]>([]);
  // filteredConversations was removed as we use displayedConversations derived from search params
  const [selectedConversation, setSelectedConversation] = useState<APIConversation | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "active" | "closed">("all");

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Employee assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Close confirmation
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load conversations on mount and when filter changes
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
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [currentScreen, selectedConversation]);

  // Handle Deep Linking
  useEffect(() => {
    if (conversationId && typeof conversationId === 'string') {
      console.log('🔗 Deep linking to conversation:', conversationId);
      loadConversationDetails(conversationId);
    }
  }, [conversationId]);

  const loadConversationDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const conversation = await chatApi.getConversation(id);
      setSelectedConversation(conversation);
      setCurrentScreen("chat");
      await loadMessages(id);
    } catch (error) {
      console.error("Failed to load conversation from deep link:", error);
      showToast(t('chat.failedToLoad'));
      setCurrentScreen("list");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for new conversations in list view
  useEffect(() => {
    if (currentScreen === "list") {
      const interval = setInterval(() => {
        loadConversations();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [currentScreen, statusFilter]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const params: any = {};

      if (statusFilter !== "all") {
        params.status = statusFilter.toUpperCase();
      }

      const convs = await chatApi.getAllConversations(params);
      setConversations(convs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
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
        sender: msg.sender_role === "CUSTOMER" ? "user" : "admin",
        timestamp: new Date(msg.created_at),
        senderName: msg.sender_name,
      }));

      setMessages(formattedMessages);

      // Update selected conversation
      setSelectedConversation(conv);

      // Auto scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const emps = await adminApi.getEmployees();
      setEmployees(emps);
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const selectConversation = async (conversation: APIConversation) => {
    // Toggle logic
    if (selectedConversation && selectedConversation.id === conversation.id) {
      setSelectedConversation(null);
      return;
    }

    setSelectedConversation(conversation);
    setCurrentScreen("chat");
    await loadMessages(conversation.id);
  };

  const goBackToList = () => {
    setCurrentScreen("list");
    setSelectedConversation(null);
    setMessages([]);
    loadConversations(); // Refresh list
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

      // Reload messages
      await loadMessages(selectedConversation.id);

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleAssignEmployee = async (employeeId: string) => {
    if (!selectedConversation) return;

    try {
      await chatApi.assignConversation(selectedConversation.id, employeeId);

      // Auto-send notification message to customer
      // Try to find in loaded list, otherwise check if it's the current user (common for employees)
      const employee = employees.find(e => e.id === employeeId);

      let empName = '';
      if (employee) {
        empName = `${employee.first_name} ${employee.last_name}`;
      } else if (user && user.id === employeeId) {
        empName = `${user.first_name} ${user.last_name}`; // Fallback to current user
      } else {
        empName = t('chat.employee'); // Generic fallback
      }

      await chatApi.sendMessage(selectedConversation.id, {
        content: t('chat.employeeAssignedMessage', { name: empName })
      });

      setShowAssignModal(false);

      // Reload conversation to get updated data
      await loadMessages(selectedConversation.id);

      Alert.alert(
        t('chat.assigned'),
        t('chat.employeeAssignedSuccess')
      );
    } catch (error) {
      console.error("Failed to assign employee:", error);
      Alert.alert(
        t('common.error'),
        t('chat.failedToAssign')
      );
    }
  };

  const handleCloseConversation = () => {
    if (!selectedConversation) {
      console.log('❌ No conversation selected');
      return;
    }
    console.log('🔴 Close button clicked for conversation:', selectedConversation.id);
    setShowCloseConfirm(true);
  };

  const confirmCloseConversation = async () => {
    if (!selectedConversation) return;
    setShowCloseConfirm(false);

    try {
      console.log('⏳ Closing conversation...');

      // Notify via chat message before closing
      // Re-using user resolution logic
      console.log('👤 Current User State:', user);

      let closerName = '';
      if (user && (user.first_name || user.last_name)) {
        closerName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      } else if (user && user.email) {
        closerName = user.email.split('@')[0];
      } else {
        closerName = t('chat.employee');
      }

      console.log('🏷️ Resolved Closer Name:', closerName);

      try {
        await chatApi.sendMessage(selectedConversation.id, {
          content: t('chat.chatClosedBy', { name: closerName })
        });
      } catch (msgError) {
        console.log('Failed to send close message, proceeding with close:', msgError);
      }

      await chatApi.closeConversation(selectedConversation.id);
      console.log('✅ Conversation closed successfully');


      await loadMessages(selectedConversation.id);

      // Show success message
      showToast(t('chat.conversationClosedSuccess'));
    } catch (error) {
      console.error("❌ Failed to close conversation:", error);
      showToast(t('chat.failedToClose'));
    }
  };

  // Function to detect and handle links in message text
  const handleLinkPress = async (url: string) => {
    try {
      // Handle deep links (altayar://)
      if (url.startsWith('altayar://')) {
        const deepLink = url.replace('altayar://', '');
        const [screen, ...params] = deepLink.split('/');

        if (screen === 'reels' && params.length > 0) {
          const reelId = params[0];
          router.push({
            pathname: '/(admin)/reels/[id]',
            params: { id: reelId }
          } as any);
          return;
        }

        // Try to open as URL if it's a valid deep link format
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

      // If it looks like a URL but doesn't have a scheme, try adding https://
      if (url.includes('.') && !url.includes(' ')) {
        const urlWithScheme = `https://${url}`;
        if (await Linking.canOpenURL(urlWithScheme)) {
          await Linking.openURL(urlWithScheme);
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

  // Function to parse message text and detect links
  const parseMessageText = (text: string) => {
    // Regex to match URLs and deep links
    const urlRegex = /(altayar:\/\/[^\s]+|https?:\/\/[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*)/g;
    const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }

      // Add the link
      parts.push({
        type: 'link',
        content: match[0]
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    // If no links found, return the whole text as a single part
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('chat.now');
    if (diffMins < 60) return `${diffMins}${language === 'ar' ? 'د' : 'm'}`;
    if (diffHours < 24) return `${diffHours}${language === 'ar' ? 'س' : 'h'}`;
    if (diffDays < 7) return `${diffDays}${language === 'ar' ? 'ي' : 'd'}`;

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
      case "ASSIGNED": return COLORS.primary;
      case "RESOLVED": return COLORS.success;
      default: return COLORS.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE": return t('chat.status.active');
      case "WAITING": return t('chat.status.waiting');
      case "CLOSED": return t('chat.status.closed');
      case "ASSIGNED": return t('chat.status.assigned');
      case "RESOLVED": return t('chat.status.resolved');
      default: return status;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#0084ff', '#44bec7', '#ffc300', '#fa3c4c', '#d696bb', '#6bcbef'];
    // Safety check for undefined or empty names
    if (!name || name.length === 0) {
      return colors[0]; // Default to first color
    }
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Filter conversations based on search query
  const displayedConversations = conversations.filter(conv =>
    conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {currentScreen === "list" ? (
        // ===== CONVERSATIONS LIST SCREEN =====
        <>
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {t('chat.messages')}
            </Text>
          </View>

          {/* Filter Tabs */}
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
                    {filter === 'all' ? t('chat.filters.all') :
                      filter === 'waiting' ? t('chat.filters.waiting') :
                        filter === 'active' ? t('chat.filters.active') :
                          t('chat.filters.closed')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
            <Ionicons name="search" size={18} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isRTL && styles.searchInputRTL]}
              placeholder={t('chat.searchMessages')}
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Conversations List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : displayedConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.border} />
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t('chat.noConversations')}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
              {displayedConversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={[styles.conversationItem, isRTL && styles.conversationItemRTL]}
                  onPress={() => selectConversation(conversation)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    {conversation.customer_avatar ? (
                      <Image
                        source={{ uri: conversation.customer_avatar }}
                        style={styles.conversationAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.conversationAvatar, { backgroundColor: getAvatarColor(conversation.customer_name || 'U') }]}>
                        <Text style={styles.conversationAvatarText}>
                          {(conversation.customer_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View style={styles.conversationContent}>
                    <View style={[styles.conversationTop, isRTL && styles.conversationTopRTL]}>
                      <Text style={[styles.conversationName, isRTL && styles.textRTL]} numberOfLines={1}>
                        {conversation.customer_name || t('chat.user')}
                      </Text>
                      <Text style={styles.conversationTime}>
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
                        {conversation.last_message_preview || t('chat.newConversation')}
                      </Text>
                      {(conversation.employee_unread_count || 0) > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {conversation.employee_unread_count! > 9 ? '9+' : conversation.employee_unread_count}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Status Indicator */}
                    <View style={[styles.statusRow, isRTL && styles.statusRowRTL]}>
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
        <>
          {/* Chat Header */}
          <View style={[styles.chatHeader, isRTL && styles.chatHeaderRTL, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={[styles.backBtn, isRTL && styles.backBtnRTL]}
              onPress={goBackToList}
            >
              <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chatHeaderInfo, isRTL && styles.chatHeaderInfoRTL, { flex: 1 }]}
              onPress={() => {
                if (selectedConversation?.customer_id) {
                  router.push(`/(admin)/users?userId=${selectedConversation.customer_id}&returnPath=chat` as any);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.chatAvatar, isRTL && styles.chatAvatarRTL, !selectedConversation?.customer_avatar && { backgroundColor: getAvatarColor(selectedConversation?.customer_name || 'U') }]}>
                  {selectedConversation?.customer_avatar ? (
                    <Image
                      source={{ uri: selectedConversation.customer_avatar }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                  ) : (
                    <Text style={styles.chatAvatarText}>
                      {(selectedConversation?.customer_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
              <View>
                <Text style={[styles.chatUserName, isRTL && styles.textRTL]}>
                  {selectedConversation?.customer_name || t('chat.user')}
                </Text>
                <View style={[styles.statusBadgeContainer, isRTL && styles.statusBadgeContainerRTL]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedConversation?.status || 'WAITING') }]} />
                  <Text style={[styles.chatUserStatus, isRTL && styles.textRTL]}>
                    {getStatusText(selectedConversation?.status || 'WAITING')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.chatHeaderActions, isRTL && styles.chatHeaderActionsRTL]}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  loadEmployees();
                  setShowAssignModal(true);
                }}
              >
                <Ionicons name="person-add-outline" size={22} color={COLORS.textLight} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  console.log('🔴 Close button pressed! Status:', selectedConversation?.status);
                  handleCloseConversation();
                }}
              >
                <Ionicons
                  name={selectedConversation?.status === 'CLOSED' ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={22}
                  color={selectedConversation?.status === 'CLOSED' ? COLORS.success : COLORS.error}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Area */}
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
                  msg.sender === "admin" && styles.messageRowAdmin,
                  isRTL && msg.sender === "user" && styles.messageRowUserRTL,
                  isRTL && msg.sender === "admin" && styles.messageRowAdminRTL,
                ]}>
                  {/* Avatar for user messages */}
                  {msg.sender === "user" && (
                    <View style={styles.messageAvatarContainer}>
                      {showAvatar ? (
                        <View style={[styles.messageAvatar, { backgroundColor: getAvatarColor(msg.senderName || 'U') }]}>
                          <Text style={styles.messageAvatarText}>
                            {(msg.senderName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.messageAvatarSpacer} />
                      )}
                    </View>
                  )}

                  {/* Message Bubble */}
                  <View style={[
                    styles.messageBubble,
                    msg.sender === "user" && styles.userBubble,
                    msg.sender === "admin" && styles.adminBubble,
                    isRTL && msg.sender === "user" && styles.userBubbleRTL,
                    isRTL && msg.sender === "admin" && styles.adminBubbleRTL,
                    !isSameSender && styles.messageBubbleFirst,
                  ]}>
                    <View style={styles.messageTextContainer}>
                      {parseMessageText(msg.text).map((part, partIndex) => {
                        if (part.type === 'link') {
                          return (
                            <TouchableOpacity
                              key={partIndex}
                              onPress={() => handleLinkPress(part.content)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.messageText,
                                styles.messageLink,
                                msg.sender === "admin" && styles.adminMessageText,
                                msg.sender === "admin" && styles.adminMessageLink,
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
                              msg.sender === "admin" && styles.adminMessageText,
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
                      msg.sender === "admin" && styles.adminMessageTime,
                    ]}>
                      {formatMessageTime(msg.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Message Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
          >
            <View style={[styles.inputArea, isRTL && styles.inputAreaRTL]}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Ionicons name={showEmojiPicker ? "close-circle" : "happy-outline"} size={28} color={COLORS.primary} />
              </TouchableOpacity>

              <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('chat.typeMessage')}
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

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                visible={showEmojiPicker}
                onEmojiSelect={(emoji) => {
                  setMessage(prev => prev + emoji);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </KeyboardAvoidingView>

          {/* Employee Assignment Modal */}
          <Modal
            visible={showAssignModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowAssignModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {t('chat.assignEmployee')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {isLoadingEmployees ? (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
                ) : (
                  <ScrollView style={styles.employeeList}>
                    {employees.map((employee) => (
                      <TouchableOpacity
                        key={employee.id}
                        style={styles.employeeItem}
                        onPress={() => handleAssignEmployee(employee.id)}
                      >
                        <View style={[styles.employeeAvatar, { backgroundColor: getAvatarColor(employee.first_name || employee.email || 'U') }]}>
                          <Text style={styles.employeeAvatarText}>
                            {(employee.first_name || employee.email || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.employeeName}>
                          {employee.first_name || ''} {employee.last_name || employee.email || 'Employee'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          <Modal
            visible={showCloseConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCloseConfirm(false)}
          >
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmModal}>
                <View style={styles.confirmHeader}>
                  <Ionicons name="warning-outline" size={48} color={COLORS.warning} />
                </View>

                <Text style={styles.confirmTitle}>
                  {t('chat.closeConversation')}
                </Text>

                <Text style={styles.confirmMessage}>
                  {t('chat.closeConfirmMessage')}
                </Text>

                <View style={[styles.confirmButtons, isRTL && styles.confirmButtonsRTL]}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmBtnCancel]}
                    onPress={() => setShowCloseConfirm(false)}
                  >
                    <Text style={styles.confirmBtnTextCancel}>
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmBtn, styles.confirmBtnConfirm]}
                    onPress={confirmCloseConversation}
                  >
                    <Text style={styles.confirmBtnTextConfirm}>
                      {t('common.close')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
      {/* Custom Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },

  // ===== HEADER STYLES =====
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ===== FILTER TABS =====
  filterContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterScrollRTL: {
    flexDirection: 'row-reverse',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.searchBg,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  filterTabTextActive: {
    color: COLORS.background,
  },

  // ===== SEARCH BAR =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.searchBg,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },
  searchInputRTL: {
    textAlign: 'right',
  },

  // ===== LOADING & EMPTY STATES =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },

  // ===== CONVERSATIONS LIST =====
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  conversationItemRTL: {
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarContainerRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  conversationAvatarText: {
    color: COLORS.background,
    fontSize: 20,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTopRTL: {
    flexDirection: 'row-reverse',
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  conversationTime: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 8,
  },
  conversationBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationBottomRTL: {
    flexDirection: 'row-reverse',
  },
  conversationMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  conversationMessageUnread: {
    fontWeight: '600',
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.unreadBadge,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusRowRTL: {
    flexDirection: 'row-reverse',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // ===== CHAT HEADER =====
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  chatHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  backBtnRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderInfoRTL: {
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarRTL: {
    marginRight: 0,
    marginLeft: 12,
  },
  chatAvatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  chatUserName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeContainerRTL: {
    flexDirection: 'row-reverse',
  },
  chatUserStatus: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderActionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
    zIndex: 10,
    elevation: 10,
  },

  // ===== MESSAGES AREA =====
  messagesScroll: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  messageRowAdmin: {
    justifyContent: 'flex-end',
  },
  messageRowUserRTL: {
    flexDirection: 'row-reverse',
  },
  messageRowAdminRTL: {
    flexDirection: 'row-reverse',
  },
  messageAvatarContainer: {
    width: 32,
    marginEnd: 8,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
  },
  messageAvatarSpacer: {
    width: 28,
    height: 28,
  },

  // ===== MESSAGE BUBBLES =====
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
  },
  messageBubbleFirst: {
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  userBubbleRTL: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: COLORS.messageBg,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  adminBubbleRTL: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  messageTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.background,
    marginBottom: 2,
  },
  adminMessageText: {
    color: COLORS.text,
  },
  messageLink: {
    textDecorationLine: 'underline',
    color: COLORS.background,
  },
  adminMessageLink: {
    color: COLORS.primary,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-end',
  },
  adminMessageTime: {
    color: COLORS.textLight,
  },

  // ===== INPUT AREA =====
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputAreaRTL: {
    flexDirection: 'row-reverse',
  },
  attachBtn: {
    padding: 4,
    marginEnd: 8,
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.searchBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
  },
  inputContainerRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },
  inputRTL: {
    textAlign: 'right',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },

  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  employeeList: {
    maxHeight: 400,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  employeeName: {
    fontSize: 16,
    color: COLORS.text,
  },


  // ===== CONFIRM MODAL =====
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
      default: { elevation: 5 },
    }),
  },
  confirmHeader: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnCancel: {
    backgroundColor: COLORS.messageBg,
  },
  confirmBtnConfirm: {
    backgroundColor: COLORS.error,
  },
  confirmBtnTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmBtnTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },

  // ===== RTL SUPPORT =====
  textRTL: {
    textAlign: 'right',

  },
  // ===== TOAST STYLES =====
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: 'rgba(50, 50, 50, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 10,
  },
});
