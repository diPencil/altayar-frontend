import { api } from './api';

export interface Notification {
    id: string;
    type: string; // Allow dynamic types from backend
    title: string;
    message: string;
    related_entity_id?: string;
    related_entity_type?: string;
    target_role?: string;
    target_user_id?: string;
    reel_id?: string;
    comment_id?: string;
    actor_id?: string;
    actor_name?: string;
    actor_avatar?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
    updated_at?: string;
    action_url?: string;
    priority?: string;
}

export interface NotificationStats {
    total: number;
    unread: number;
}

export const notificationsService = {
    async getNotifications(skip = 0, limit = 50, unreadOnly = false): Promise<Notification[]> {
        const params = new URLSearchParams({
            skip: skip.toString(),
            limit: limit.toString(),
            include_read: (!unreadOnly).toString()  // Changed from unread_only to include_read
        });
        // Backend returns { notifications: [], total: number, unread_count: number }
        const response = await api.get<{ notifications: Notification[], total: number, unread_count: number }>(`/notifications?${params}`);
        // Return just the notifications array for backward compatibility
        return response.notifications || [];
    },

    async getStats(): Promise<NotificationStats> {
        const response = await api.get<NotificationStats>('/notifications/stats');
        return response;
    },

    async markAsRead(notificationId: string): Promise<void> {
        await api.post(`/notifications/${notificationId}/read`);
    },

    async markAllAsRead(): Promise<void> {
        await api.post('/notifications/read-all');
    },

    async deleteNotification(notificationId: string): Promise<void> {
        await api.delete(`/notifications/${notificationId}`);
    }
};

