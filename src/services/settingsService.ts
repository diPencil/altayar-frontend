import { api } from './api';

export interface OnboardingSettings {
    image: string;
    title: {
        en: string;
        ar: string;
    };
    subtitle: {
        en: string;
        ar: string;
    };
}

export interface ContactUsSettings {
    /**
     * WhatsApp number as digits only, e.g. 966575180639 (no +, no spaces).
     */
    whatsapp_number: string;
    /**
     * Call number in E.164 format, e.g. +201125889336
     */
    call_number: string;
    /**
     * Support email address, e.g. info@altayarvip.com
     */
    email: string;
}

export interface AboutLinksSettings {
    websites: {
        official: string;
        hotel_booking: string;
    };
    socials: {
        facebook: string;
        instagram: string;
        x: string;
        linkedin: string;
        snapchat: string;
        tiktok: string;
    };
}

export const SettingsService = {
    /**
     * Get public settings for onboarding (no auth required)
     */
    getOnboardingSettings: async (): Promise<OnboardingSettings | null> => {
        try {
            const response: any = await api.get('/settings/public/onboarding');
            // If settings exist, return them nested under 'onboarding' key.
            // Our backend returns flat dict for the group. 

            if (response && response.onboarding) {
                return response.onboarding;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch onboarding settings:', error);
            return null;
        }
    },

    /**
     * Get public settings by group (no auth required)
     */
    getPublicGroupSettings: async (group: string): Promise<Record<string, any> | null> => {
        try {
            const response: any = await api.get(`/settings/public/${group}`);
            return response || null;
        } catch (error) {
            console.error(`Failed to fetch public settings group "${group}":`, error);
            return null;
        }
    },

    /**
     * Get settings by group (Admin only)
     */
    getGroupSettings: async (group: string): Promise<Record<string, any> | null> => {
        try {
            const response: any = await api.get(`/settings/${group}`);
            return response || null;
        } catch (error) {
            console.error(`Failed to fetch admin settings group "${group}":`, error);
            return null;
        }
    },

    /**
     * Get Contact Us settings (public)
     */
    getContactUsSettings: async (): Promise<ContactUsSettings | null> => {
        const data = await SettingsService.getPublicGroupSettings('support');
        if (data && data.contact_us) return data.contact_us as ContactUsSettings;
        return null;
    },

    /**
     * Get Contact Us settings (admin)
     */
    getContactUsSettingsAdmin: async (): Promise<ContactUsSettings | null> => {
        const data = await SettingsService.getGroupSettings('support');
        if (data && data.contact_us) return data.contact_us as ContactUsSettings;
        return null;
    },

    /**
     * Update Contact Us settings (Admin only)
     */
    updateContactUsSettings: async (settings: ContactUsSettings) => {
        return SettingsService.updateSettings('support', { contact_us: settings });
    },

    /**
     * Get About links settings (public)
     */
    getAboutLinksSettings: async (): Promise<AboutLinksSettings | null> => {
        const data = await SettingsService.getPublicGroupSettings('about');
        if (data && data.about_links) return data.about_links as AboutLinksSettings;
        return null;
    },

    /**
     * Get About links settings (admin)
     */
    getAboutLinksSettingsAdmin: async (): Promise<AboutLinksSettings | null> => {
        const data = await SettingsService.getGroupSettings('about');
        if (data && data.about_links) return data.about_links as AboutLinksSettings;
        return null;
    },

    /**
     * Update About links settings (Admin only)
     */
    updateAboutLinksSettings: async (settings: AboutLinksSettings) => {
        return SettingsService.updateSettings('about', { about_links: settings });
    },

    /**
     * Update settings (Admin only)
     */
    updateSettings: async (group: string, settings: any) => {
        const response: any = await api.put(`/settings/${group}`, settings);
        return response;
    }
};
