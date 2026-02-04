import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@recent_users';
const MAX_RECENT_USERS = 5;

export interface RecentUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    avatar?: string;
    plan?: {
        code: string;
        color?: string;
    };
}

export function useRecentUsers() {
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentUsers();
    }, []);

    const loadRecentUsers = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            if (jsonValue != null) {
                setRecentUsers(JSON.parse(jsonValue));
            }
        } catch (e) {
            console.error("Failed to load recent users", e);
        } finally {
            setLoading(false);
        }
    };

    const addRecentUser = useCallback(async (user: RecentUser) => {
        try {
            setRecentUsers(currentUsers => {
                // Remove if already exists to move to top
                const filtered = currentUsers.filter(u => u.id !== user.id);
                // Add to beginning
                const updated = [user, ...filtered].slice(0, MAX_RECENT_USERS);

                // Save asynchronously
                AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(e =>
                    console.error("Failed to save recent user", e)
                );

                return updated;
            });
        } catch (e) {
            console.error("Error adding recent user", e);
        }
    }, []);

    const clearRecentUsers = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setRecentUsers([]);
        } catch (e) {
            console.error("Failed to clear recent users", e);
        }
    }, []);

    return {
        recentUsers,
        loading,
        addRecentUser,
        clearRecentUsers,
        reload: loadRecentUsers
    };
}
