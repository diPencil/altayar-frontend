import { api } from './api';

// Auth API methods
export const updateProfile = async (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar?: string;
}): Promise<any> => {
    console.log('[AuthAPI] Updating profile with data:', data);
    const result = await api.put('/auth/me', data);
    console.log('[AuthAPI] Profile update result:', result);
    return result;
};

export const changePassword = async (data: {
    current_password: string;
    new_password: string;
}): Promise<any> => {
    console.log('[AuthAPI] Changing password...');
    const result = await api.post('/auth/change-password', data);
    console.log('[AuthAPI] Password change result:', result);
    return result;
};

export const uploadAvatar = async (data: FormData): Promise<{ url: string }> => {
    console.log('[AuthAPI] Uploading avatar...');
    const result = await api.post<{ url: string }>('/auth/upload-avatar', data);
    console.log('[AuthAPI] Avatar upload result:', result);
    return result;
};
