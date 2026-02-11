import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RecentUser } from '../hooks/useRecentUsers';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../utils/theme';

interface RecentUsersListProps {
    users: RecentUser[];
    onSelectUser: (user: RecentUser) => void;
    onClear: () => void;
}

export default function RecentUsersList({ users, onSelectUser, onClear }: RecentUsersListProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    // if (users.length === 0) return null; // Commented out to always show the section for now

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={[styles.title, isRTL && styles.textRTL]}>{t('common.recentUsers')}</Text>
                <TouchableOpacity onPress={onClear}>
                    <Text style={styles.clearText}>{t('common.clear')}</Text>
                </TouchableOpacity>
            </View>

            {users.length === 0 ? (
                <Text style={styles.emptyText}>{t('common.noRecentUsers')}</Text>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.listContent, isRTL && styles.listContentRTL]}
                >
                    {users.map(user => (
                        <TouchableOpacity
                            key={user.id}
                            style={styles.userCard}
                            onPress={() => onSelectUser(user)}
                        >
                            {user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {user.first_name?.[0]?.toUpperCase() || ''}{user.last_name?.[0]?.toUpperCase() || ''}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.userName} numberOfLines={1}>
                                {user.first_name} {user.last_name}
                            </Text>
                            {user.plan && (
                                <View style={[styles.badge, { backgroundColor: user.plan.color || '#2563eb' }]}>
                                    <Text style={styles.badgeText}>{user.plan.code}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748b',
    },
    textRTL: {
        textAlign: 'right',
    },
    clearText: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '500',
    },
    listContent: {
        paddingVertical: 4,
        gap: 12,
    },
    listContentRTL: {
        flexDirection: 'row-reverse',
    },
    userCard: {
        alignItems: 'center',
        width: 80,
        marginEnd: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b',
    },
    userName: {
        fontSize: 11,
        color: '#1e293b',
        textAlign: 'center',
        maxWidth: '100%',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    badgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    emptyText: {
        fontSize: 12,
        color: '#94a3b8',
        fontStyle: 'italic',
        paddingVertical: 8,
        textAlign: 'center',
    },
});
