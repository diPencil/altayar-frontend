import { api } from './api';

// Helper type for FormData iteration
type FormDataEntryValue = string | File;

export interface Reel {
    id: string;
    title?: string;
    description?: string;
    video_url: string;
    video_type?: 'URL' | 'UPLOAD' | 'YOUTUBE';
    thumbnail_url?: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
    views_count: number;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    is_liked?: boolean;
    user?: {
        id: string;
        name: string;
        avatar_url?: string;
        is_following?: boolean;
    };
}

export interface InteractionResponse {
    id: string;
    type: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE';
    content?: string;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
}

export const reelsService = {
    // Public / User
    getReels: async (skip = 0, limit = 10) => {
        const response = await api.get<Reel[]>(`/reels/?skip=${skip}&limit=${limit}`);
        return response;
    },

    getReel: async (id: string) => {
        const response = await api.get<Reel>(`/reels/${id}`);
        return response;
    },

    interact: async (id: string, type: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE', content?: string) => {
        const response = await api.post<InteractionResponse>(`/reels/${id}/interaction`, { type, content });
        return response;
    },

    getComments: async (id: string, skip = 0, limit = 50) => {
        const response = await api.get<InteractionResponse[]>(`/reels/${id}/comments?skip=${skip}&limit=${limit}`);
        return response;
    },

    // Admin
    createReel: async (data: Partial<Reel>) => {
        const response = await api.post<Reel>('/reels/', data);
        return response;
    },

    uploadReel: async (formData: FormData) => {
        const BASE_URL = api.getBaseUrl();
        const token = api.getToken();

        console.log('[Upload] Base URL:', BASE_URL);
        console.log('[Upload] Has token:', !!token);

        // Log FormData entries safely
        try {
            const entries: Array<[string, FormDataEntryValue]> = [];
            formData.forEach((value, key) => {
                entries.push([key, value]);
            });
            console.log('[Upload] FormData entries:', entries.map(([key, value]) => ({
                key,
                value: value instanceof File ? `File: ${value.name}` : value
            })));
        } catch (e) {
            console.log('[Upload] Could not log FormData entries');
        }

        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Don't set Content-Type for FormData - browser will set it with boundary

        try {
            const response = await fetch(`${BASE_URL}/reels/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });

            console.log('[Upload] Response status:', response.status);
            console.log('[Upload] Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Upload] Error response:', errorText);

                let errorDetail = `HTTP ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorDetail = errorJson.detail || errorDetail;
                } catch (e) {
                    errorDetail = errorText || errorDetail;
                }

                throw new Error(errorDetail);
            }

            const result = await response.json();
            console.log('[Upload] Success:', result);
            return result;
        } catch (error: any) {
            console.error('[Upload] Exception:', error);
            throw error;
        }
    },

    updateReel: async (id: string, data: Partial<Reel>) => {
        const response = await api.patch<Reel>(`/reels/${id}`, data);
        return response;
    },

    deleteReel: async (id: string) => {
        await api.delete(`/reels/${id}`);
    },

    async likeComment(commentId: string): Promise<InteractionResponse> {
        const response = await api.post<InteractionResponse>(`/reels/comments/${commentId}/like`);
        return response;
    },

    async replyToComment(commentId: string, content: string): Promise<InteractionResponse> {
        const response = await api.post<InteractionResponse>(`/reels/comments/${commentId}/reply`, {
            type: 'COMMENT',
            content
        });
        return response;
    },

    // Favorites
    async getFavorites(): Promise<Reel[]> {
        const response = await api.get<Reel[]>('/reels/favorites');
        return response;
    },

    async addFavorite(reelId: string): Promise<void> {
        await api.post(`/reels/${reelId}/favorite`);
    },

    async removeFavorite(reelId: string): Promise<void> {
        await api.delete(`/reels/${reelId}/favorite`);
    },

    getAllReelsAdmin: async (skip = 0, limit = 20, status?: string): Promise<Reel[]> => {
        let url = `/reels/admin/all?skip=${skip}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        const response = await api.get<Reel[]>(url);
        return response;
    },

    getAnalytics: async (): Promise<any> => {
        const response = await api.get<any>('/reels/admin/analytics');
        return response;
    },

    // Admin Comment Management
    getAllCommentsAdmin: async (skip = 0, limit = 50, reelId?: string): Promise<any[]> => {
        let url = `/reels/admin/comments?skip=${skip}&limit=${limit}`;
        if (reelId) url += `&reel_id=${reelId}`;
        const response = await api.get<any[]>(url);
        return response;
    },

    updateCommentAdmin: async (commentId: string, content: string): Promise<InteractionResponse> => {
        const response = await api.put<InteractionResponse>(`/reels/admin/comments/${commentId}`, { content });
        return response;
    },

    deleteCommentAdmin: async (commentId: string): Promise<void> => {
        await api.delete(`/reels/admin/comments/${commentId}`);
    },
};
