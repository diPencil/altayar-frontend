import Constants from 'expo-constants';

import { Platform } from 'react-native';
import { emitMembershipRequired } from '../utils/membershipGate';

export const getBaseUrl = () => {
  // Use environment variable if available (for production)
  const apiUrl = Constants.expoConfig?.extra?.apiUrl;

  if (apiUrl && typeof apiUrl === 'string') {
    return apiUrl;
  }

  // Development fallback
  console.log('[API] Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    // Use localhost instead of 127.0.0.1 for better CORS compatibility
    const url = 'http://localhost:8082/api';
    console.log('[API] Using Web URL:', url);
    return url;
  }

  // FORCE PRODUCTION IP FOR MOBILE TESTING
  // This ensures the app connects to the VPS backend
  const prodUrl = 'http://69.62.117.50:8082/api';
  console.log(`[API] Using Production URL: ${prodUrl}`);
  return prodUrl;
};

/** Dev / old VPS hosts often stored in reel video_url while the app uses extra.apiUrl */
const REWRITE_MEDIA_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '69.62.117.50',
]);

/**
 * Point reel thumbnails / videos at the same public host the app uses (fixes real devices
 * when the DB still has http://localhost:8082/... or the legacy VPS IP).
 */
export function rewriteBackendMediaUrl(url: string | undefined | null): string | undefined {
  if (url == null || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  try {
    const base = getBaseUrl().replace(/\/$/, '');
    const apiRoot = new URL(base.includes('://') ? base : `https://${base}`);
    const publicOrigin = `${apiRoot.protocol}//${apiRoot.host}`;
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return trimmed;
    }
    if (REWRITE_MEDIA_HOSTS.has(parsed.hostname)) {
      return `${publicOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** Absolute URLs: rewrite dev host; relative paths: prefix getBaseUrl() without duplicating /api */
export function resolveReelMediaUrl(videoUrl: string | undefined | null): string | undefined {
  if (videoUrl == null || typeof videoUrl !== 'string') return undefined;
  const trimmed = videoUrl.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return rewriteBackendMediaUrl(trimmed);
  }
  const base = getBaseUrl().replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const joined =
    path.startsWith('/api/') && /\/api$/.test(base)
      ? `${base}${path.slice('/api'.length)}`
      : `${base}${path}`;
  return joined;
}

const BASE_URL = getBaseUrl();

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return BASE_URL;
  }

  private getHeaders(isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async get<T>(endpoint: string, params?: any): Promise<T> {
    // Create AbortController for timeout (AbortSignal.timeout is not supported in React Native)
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      let url = `${BASE_URL}${endpoint}`;

      if (params) {
        const queryString = Object.keys(params)
          .filter(key => params[key] !== undefined && params[key] !== null)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
          .join('&');

        if (queryString) {
          url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }
      }

      console.log(`[API] GET ${url}`);
      console.log(`[API] Base URL: ${BASE_URL}`);
      console.log(`[API] Endpoint: ${endpoint}`);
      console.log(`[API] Headers:`, this.getHeaders());

      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
      } as RequestInit);

      if (!response.ok) {
        // Try to get error details
        let errorData: any = {};
        let errorDetail: any = `HTTP ${response.status}`;
        try {
          errorData = await response.json();
          errorDetail = errorData.detail || errorData.message || errorDetail;
        } catch {
          // If response is not JSON, use status text
          errorDetail = response.statusText || errorDetail;
        }

        // Handle authentication errors separately (keep friendly text)
        if (response.status === 401) {
          const err: any = new Error('Authentication required. Please log in again.');
          err.response = { status: response.status, data: errorData };
          throw err;
        }

        const msg = typeof errorDetail === 'string'
          ? errorDetail
          : (Array.isArray(errorDetail) ? JSON.stringify(errorDetail) : JSON.stringify(errorDetail || {}));

        const err: any = new Error(msg);
        err.response = { status: response.status, data: errorData };
        if (response.status === 403 && String(errorData?.detail || msg) === 'MEMBERSHIP_REQUIRED') {
          err.code = 'MEMBERSHIP_REQUIRED';
          emitMembershipRequired({ source: endpoint });
        }
        throw err;
      }

      return response.json();
    } catch (error: any) {
      console.error('API GET Error:', error);
      console.error('Error URL:', `${BASE_URL}${endpoint}`);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // If error message already contains specific error info (like auth errors), preserve it
      if (error.message?.includes('Authentication required')) {
        throw error; // Preserve auth/access errors
      }

      // Provide more helpful error messages for network issues
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error('Request timeout. Please check if the backend server is running.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.name === 'TypeError') {
        // Check if it's a CORS issue or connection issue
        const isCorsIssue = error.message?.includes('CORS') || error.message?.includes('Access-Control');
        if (isCorsIssue) {
          throw new Error(`CORS error: Backend server at ${BASE_URL} is not allowing requests from this origin. Please check CORS configuration.`);
        }
        throw new Error(`Cannot connect to backend server at ${BASE_URL}. Please ensure the server is running on http://localhost:8082`);
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    // Create AbortController for timeout (AbortSignal.timeout is not supported in React Native)
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      console.log(`[API] POST ${BASE_URL}${endpoint}`);
      console.log(`[API] Payload:`, data);

      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      const isFormData = data instanceof FormData;

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
        signal: controller.signal,
      } as RequestInit);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        let errorMessage = error.detail || `HTTP ${response.status}`;

        if (typeof errorMessage === 'object') {
          if (Array.isArray(errorMessage)) {
            // Handle Pydantic validation errors
            errorMessage = errorMessage.map((e: any) => e.msg ? `${e.loc?.join('.')} ${e.msg}` : JSON.stringify(e)).join('\n');
          } else {
            errorMessage = JSON.stringify(errorMessage);
          }
        }

        const err: any = new Error(errorMessage);
        err.response = { status: response.status, data: error };
        if (response.status === 403 && String(error?.detail || errorMessage) === 'MEMBERSHIP_REQUIRED') {
          err.code = 'MEMBERSHIP_REQUIRED';
          emitMembershipRequired({ source: endpoint });
        }
        throw err;
      }

      return response.json();
    } catch (error: any) {
      console.error('API POST Error:', error);
      console.error('Error URL:', `${BASE_URL}${endpoint}`);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // Provide more helpful error messages
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        throw new Error('Request timeout. Please check if the backend server is running.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error(`Cannot connect to backend server at ${BASE_URL}. Please ensure the server is running and your device is on the same network.`);
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log(`[API] PUT ${url}`);
      console.log(`[API] Payload:`, data);
      console.log(`[API] Headers:`, this.getHeaders());

      const isFormData = data instanceof FormData;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      });

      console.log(`[API] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(`[API] PUT Error:`, error);

        let errorMessage = error.detail || `HTTP ${response.status}`;
        if (typeof errorMessage === 'object') {
          if (Array.isArray(errorMessage)) {
            errorMessage = errorMessage.map((e: any) => e.msg ? `${e.loc?.join('.')} ${e.msg}` : JSON.stringify(e)).join('\n');
          } else {
            errorMessage = JSON.stringify(errorMessage);
          }
        }

        const err: any = new Error(errorMessage);
        err.response = { status: response.status, data: error };
        if (response.status === 403 && String(error?.detail || errorMessage) === 'MEMBERSHIP_REQUIRED') {
          err.code = 'MEMBERSHIP_REQUIRED';
          emitMembershipRequired({ source: endpoint });
        }
        throw err;
      }

      const result = await response.json();
      console.log(`[API] PUT Success:`, result);
      return result;
    } catch (error: any) {
      console.error('API PUT Error:', error);
      console.error('Error URL:', `${BASE_URL}${endpoint}`);
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.detail || `HTTP ${response.status}`;
        const err: any = new Error(errorMessage);
        err.response = { status: response.status, data: error };
        if (response.status === 403 && String(error?.detail || errorMessage) === 'MEMBERSHIP_REQUIRED') {
          err.code = 'MEMBERSHIP_REQUIRED';
          emitMembershipRequired({ source: endpoint });
        }
        throw err;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const url = `${BASE_URL}${endpoint}`;
      console.log(`[API] PATCH ${url}`);
      console.log(`[API] Payload:`, data);
      console.log(`[API] Headers:`, this.getHeaders());

      const isFormData = data instanceof FormData;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(isFormData),
        body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      });

      console.log(`[API] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(`[API] PATCH Error:`, error);

        let errorMessage = error.detail || `HTTP ${response.status}`;
        if (typeof errorMessage === 'object') {
          if (Array.isArray(errorMessage)) {
            errorMessage = errorMessage.map((e: any) => e.msg ? `${e.loc?.join('.')} ${e.msg}` : JSON.stringify(e)).join('\n');
          } else {
            errorMessage = JSON.stringify(errorMessage);
          }
        }

        const err: any = new Error(errorMessage);
        err.response = { status: response.status, data: error };
        if (response.status === 403 && String(error?.detail || errorMessage) === 'MEMBERSHIP_REQUIRED') {
          err.code = 'MEMBERSHIP_REQUIRED';
          emitMembershipRequired({ source: endpoint });
        }
        throw err;
      }

      const result = await response.json();
      console.log(`[API] PATCH Success:`, result);
      return result;
    } catch (error: any) {
      console.error('API PATCH Error:', error);
      console.error('Error URL:', `${BASE_URL}${endpoint}`);
      throw error;
    }
  }
}

export const api = new ApiService();

// Types
export interface MembershipData {
  membership_number: string;
  membership_id_display?: string | null;
  plan_name_ar: string;
  plan_name_en: string;
  tier_code: string;
  expiry_date: string | null;
  status: string;
  points_balance: number;
  is_lifetime: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'EMPLOYEE' | 'AGENT' | 'SUPER_ADMIN';
  language: string;
  avatar: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  membership_id_display?: string;
  membership?: MembershipData;
  gender?: string;
  country?: string;
  wallet_balance?: number;
  cashback_balance?: number;
  points?: {
    current_balance: number;
    total_earned: number;
  };
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  language?: string;
  referral_code?: string;
  gender?: string;
  country?: string;
}

export interface WalletBalance {
  user_id: string;
  balance: number;
  currency: string;
}

export interface PointsBalance {
  user_id: string;
  balance: number; // Current balance
  total_earned: number; // For progress bar
  tier: string;
}

export interface CashbackBalance {
  user_id: string;
  total: number;
  available: number;
}

export interface BookingItem {
  id: string;
  item_type: string;
  description_ar: string;
  description_en: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  item_details?: any;
}

export interface Booking {
  id: string;
  booking_number: string;
  user_id: string;
  created_by_user_id: string;
  booking_type: string;
  booking_source: string;  // SELF, ADMIN, AGENT
  creator_name: string;
  customer_name: string;
  membership_id?: string;
  status: string;
  payment_status: string;
  title_en: string;
  title_ar: string;
  total_amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  guest_count: number;
  guest_names?: any[];
  customer_notes?: string;
  confirmation_number?: string;
  items?: BookingItem[];
  booking_details?: any;
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  total_amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

// API endpoints helpers
export const authApi = {
  login: (identifier: string, password: string): Promise<LoginResponse> =>
    api.post('/auth/login', { identifier, password }),

  register: (data: RegisterRequest): Promise<any> =>
    api.post('/auth/register', data),

  me: (): Promise<User> =>
    api.get('/auth/me'),

  refresh: (refresh_token: string): Promise<{ access_token: string }> =>
    api.post('/auth/refresh', { refresh_token }),
};

export const walletApi = {
  getBalance: (): Promise<WalletBalance> => api.get('/wallet/me'),
  getTransactions: (): Promise<any[]> => api.get('/wallet/me/transactions'),
};

export const pointsApi = {
  getBalance: (): Promise<PointsBalance> => api.get('/points/me'),
  getTransactions: (): Promise<any[]> => api.get('/points/me/transactions'),
};

export const cashbackApi = {
  getBalance: (): Promise<CashbackBalance> => api.get('/cashback/me/balance'),
  getRecords: (): Promise<any[]> => api.get('/cashback/me/records'),
  withdrawToWallet: (amount: number): Promise<any> => api.post('/cashback/withdraw', { amount }),

  // Admin Withdrawal Management
  getWithdrawalRequests: (params?: { status?: string; limit?: number }): Promise<any[]> => api.get('/cashback/admin/withdrawal-requests', params),
  approveWithdrawal: (requestId: string): Promise<any> => api.post(`/cashback/admin/requests/${requestId}/approve`, {}),
  rejectWithdrawal: (requestId: string, reason: string): Promise<any> => api.post(`/cashback/admin/requests/${requestId}/reject`, { reason }),
};

export const ordersApi = {
  getMyOrders: (params?: { payment_status?: string; status?: string }): Promise<Order[]> => api.get('/orders/me', params),
  getOrder: (id: string): Promise<Order> => api.get(`/orders/${id}`),
  createOrder: (data: any): Promise<Order> => api.post('/orders', data),
  payOrder: (id: string, save_card: boolean = false): Promise<InitiatePaymentResponse> =>
    api.post(`/orders/${id}/pay`, { save_card }),
  downloadInvoice: (id: string) => api.get(`/orders/${id}/invoice/download`),
  deleteOrder: (id: string): Promise<any> => api.delete(`/orders/${id}`),
  updateOrder: (id: string, data: any): Promise<Order> => api.put(`/orders/${id}`, data),
};

export interface InitiatePaymentResponse {
  payment_id: string;
  payment_number?: string;
  order_number?: string;
  booking_number?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_url: string;
  fawry_code?: string;
  expires_at?: string;
}

export const bookingsApi = {
  getMyBookings: (): Promise<Booking[]> => api.get('/bookings/me'),
  getBooking: (id: string): Promise<Booking> => api.get(`/bookings/${id}`),
  payBooking: (id: string, paymentMethodId: number = 1, save_card: boolean = false): Promise<InitiatePaymentResponse> =>
    api.post(`/bookings/${id}/pay`, { payment_method_id: paymentMethodId, save_card }),
};

export const paymentsApi = {
  getMyPayments: (): Promise<{ items: any[], total: number }> => api.get('/payments/my-payments'),

  create: (data: CreatePaymentRequest): Promise<CreatePaymentResponse> =>
    api.post('/payments/create', data),

  quickPay: (amount: number, currency: string = 'EGP', payment_method_id: number = 2): Promise<CreatePaymentResponse> =>
    api.post('/payments/quick-pay', { amount, currency, payment_method_id }),

  getStatus: (paymentId: string): Promise<any> =>
    api.get(`/payments/status/${paymentId}`),
};

export const membershipsApi = {
  getPlans: (activeOnly: boolean = true): Promise<any[]> => api.get(`/memberships/plans?active_only=${activeOnly}`),
};

// Offers API
export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Offer {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  image_url?: string;
  offer_type: string;
  category?: string;
  category_id?: string;
  category_details?: Category;
  destination?: string;
  original_price: number;
  discounted_price?: number;
  currency: string;
  discount_percentage?: number;
  duration_days?: number;
  duration_nights?: number;
  status: string;
  is_featured: boolean;
  is_hot: boolean;
  valid_from?: string; // Added
  valid_until?: string; // Added
  display_order?: number; // Added
  includes?: string | string[]; // What's included in the offer
  excludes?: string | string[]; // What's excluded from the offer
  terms?: string; // Terms and conditions
  created_at: string;
  updated_at?: string;
  // Creator & Targeting
  created_by_user_id?: string;
  created_by_name?: string;
  created_by_email?: string;
  created_by_role?: string;
  target_audience?: 'ALL' | 'ASSIGNED' | 'SPECIFIC';
  target_user_ids?: string[];
  offer_source?: 'ADMIN' | 'MARKETING';
  is_favorited?: boolean;
  rating_count?: number;
  average_rating?: number;
  my_rating?: number;
}
export const offersApi = {
  getFeatured: (): Promise<Offer[]> => api.get('/offers/public/featured'),
  getPublic: (params?: { offer_type?: string; category?: string }): Promise<Offer[]> => {
    return api.get('/offers/public', params);
  },
  getOffer: (id: string): Promise<Offer> => api.get(`/offers/public/${id}`),

  // Favorites (user)
  getFavorites: (): Promise<Offer[]> => api.get('/offers/favorites'),
  addFavorite: (offerId: string): Promise<any> => api.post(`/offers/${offerId}/favorite`),
  removeFavorite: (offerId: string): Promise<any> => api.delete(`/offers/${offerId}/favorite`),
  rateOffer: (
    offerId: string,
    rating: number
  ): Promise<{ rating_count: number; average_rating: number; my_rating: number }> =>
    api.post(`/offers/${offerId}/rate`, { rating }),

  // Category endpoints
  getCategories: (activeOnly: boolean = false): Promise<Category[]> => {
    let url = '/offers/categories';
    if (activeOnly) url += '/public'; // Or query param, but we have /categories/public route
    return api.get(url);
  },

  // Create Offer
  create: (data: FormData): Promise<Offer> => {
    return api.post('/offers', data);
  },

  // Authenticated User Offers
  getMyOffers: (): Promise<Offer[]> => api.get('/offers/user/my-offers'),

  // Admin endpoints
  getAll: (params?: any): Promise<Offer[]> => api.get('/offers', params),
  getById: (id: string): Promise<Offer> => api.get(`/offers/${id}`),
  update: (id: string, data: FormData): Promise<Offer> => {
    return api.put(`/offers/${id}`, data);
  },
  delete: (id: string): Promise<any> => api.delete(`/offers/${id}`),
  activate: (id: string): Promise<void> => api.post(`/offers/${id}/activate`),
  pause: (id: string): Promise<void> => api.post(`/offers/${id}/pause`),

  // Admin Category Management
  createCategory: (data: Partial<Category>): Promise<Category> => api.post('/offers/categories', data),
  updateCategory: (id: string, data: Partial<Category>): Promise<Category> => api.put(`/offers/categories/${id}`, data),
  deleteCategory: (id: string): Promise<void> => api.delete(`/offers/categories/${id}`),
  bookOffer: (id: string, save_card: boolean = false): Promise<any> =>
    api.post(`/offers/${id}/book`, { save_card }),
};

// Chat API
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_type: string;
  content: string;
  file_url?: string;
  offer_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  assigned_to?: string;
  assigned_to_name?: string;
  status: string;
  subject?: string;
  last_message_at?: string;
  last_message_preview?: string;
  customer_unread_count: number;
  employee_unread_count: number;
  created_at: string;
  messages?: Message[];
  customer_avatar?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_entity_id?: string;
  related_entity_type?: string;
  target_role: string;
  target_user_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  triggered_by_id?: string;
  triggered_by_role?: string;
  priority: string;
  action_url?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}



export const chatApi = {
  // Customer
  startConversation: (data: { subject?: string; initial_message: string }): Promise<Conversation> =>
    api.post('/chat/start', data),
  getMyConversations: (): Promise<Conversation[]> => api.get('/chat/my'),
  getMyActiveConversation: (): Promise<Conversation | null> => api.get('/chat/my/active'),
  sendMessage: (conversationId: string, data: { content: string; message_type?: string; offer_id?: string }): Promise<Message> =>
    api.post(`/chat/${conversationId}/message`, data),
  getConversation: (id: string): Promise<Conversation> => api.get(`/chat/${id}`),

  // Employee
  getAssigned: (status?: string): Promise<Conversation[]> => {
    let url = '/chat/assigned';
    if (status) url += `?status_filter=${status}`;
    return api.get(url);
  },
  getEmployeeStats: (): Promise<any> => api.get('/chat/stats/employee'),
  closeConversation: (id: string, notes?: string): Promise<void> =>
    api.post(`/chat/${id}/close`, { resolution_notes: notes }),

  // Admin
  getAllConversations: (params?: { status?: string; unassigned_only?: boolean }): Promise<Conversation[]> => {
    let url = '/chat/admin/all';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status_filter', params.status);
      if (params.unassigned_only) searchParams.append('unassigned_only', 'true');
      if (searchParams.toString()) url += `?${searchParams.toString()}`;
    }
    return api.get(url);
  },
  assignConversation: (id: string, employeeId: string): Promise<void> =>
    api.post(`/chat/${id}/assign`, { employee_id: employeeId }),
  getAdminStats: (): Promise<any> => api.get('/chat/stats/admin'),
};

// Admin API
export const adminApi = {
  // Users Management
  getAllUsers: (params?: any): Promise<any> => api.get('/admin/users', params),

  getUserWallet: (userId: string): Promise<any> =>
    api.get(`/admin/users/${userId}/details`).then((res: any) => res.wallet),

  getUserPoints: (userId: string): Promise<any> =>
    api.get(`/admin/users/${userId}/details`).then((res: any) => res.points),

  // Bookings
  createManualBooking: (data: any): Promise<any> => api.post('/bookings/manual-create', data),

  getOverviewStats: (): Promise<any> => api.get('/admin/stats/overview'),
  getRevenueChart: (days?: number): Promise<any[]> => api.get(`/admin/stats/revenue-chart${days ? `?days=${days}` : ''}`),
  getRecentActivities: (limit?: number): Promise<any[]> => api.get(`/admin/stats/recent-activities${limit ? `?limit=${limit}` : ''}`),
  getRecentTransactions: (limit?: number): Promise<any[]> => api.get(`/admin/stats/transactions${limit ? `?limit=${limit}` : ''}`),

  getAllMemberships: (): Promise<any> => api.get('/memberships/plans'),
  getMembershipPlans: (): Promise<any> => api.get('/memberships/plans'),
  getMembershipStats: (): Promise<any> => api.get('/memberships/stats'),
  getRecentSubscriptions: (limit: number = 5): Promise<any[]> => {
    // The backend now returns { total, items } for subscriptions, so we need to handling that
    // But getRecentSubscriptions was calling ?limit=5 which defaults to new structure.
    // We should update this to return items array to avoid breaking existing UI
    return api.get(`/memberships/subscriptions?limit=${limit}`).then((res: any) => res.items || []);
  },

  getAllSubscriptions: (params?: any): Promise<any> => {
    // Params: search, search_field, plan_filter, status_filter, skip, limit
    return api.get('/memberships/subscriptions', params);
  },

  bulkSubscriptionActions: (action: string, ids: string[], targetPlanId?: string): Promise<any> =>
    api.post('/memberships/subscriptions/bulk', { action, subscription_ids: ids, target_plan_id: targetPlanId }),
  getUserDetails: (userId: string): Promise<any> => api.get(`/admin/users/${userId}/details`),
  getUserCompetition: (userId: string): Promise<{ plan_id: string; tier_code: string; tier_name_en: string; tier_name_ar: string; count: number }[]> =>
    api.get(`/admin/users/${userId}/competition`),
  createUser: (data: any): Promise<any> => api.post('/admin/users', data),
  updateUser: (userId: string, data: any): Promise<any> => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId: string): Promise<any> => api.delete(`/admin/users/${userId}`),


  createMembershipPlan: (data: any): Promise<any> => api.post('/memberships/plans', data),
  getMembershipPlan: (id: string): Promise<any> => api.get(`/memberships/plans/${id}`),
  getMembershipMembers: (planId: string): Promise<any> => api.get(`/memberships/plans/${planId}/members`),
  updateMembershipPlan: (id: string, data: any): Promise<any> => api.put(`/memberships/plans/${id}`, data),
  deleteMembershipPlan: (id: string): Promise<any> => api.delete(`/memberships/plans/${id}`),

  getEmployees: (): Promise<any[]> => api.get('/admin/employees'),
  updateUserRole: (userId: string, newRole: string): Promise<void> =>
    api.put(`/admin/users/${userId}/role?new_role=${newRole}`),
  getAllOrders: (params?: any): Promise<any> => api.get('/orders', params),
  getAllPayments: (params?: any): Promise<any> => api.get('/payments', params),
  getAllWallets: (params?: any): Promise<any> => api.get('/wallet', params),
  getGlobalWalletHistory: (limit?: number): Promise<any[]> =>
    api.get(`/wallet/transactions/all${limit ? `?limit=${limit}` : ''}`),
  getWalletHistory: (userId: string, limit?: number): Promise<any> =>
    api.get(`/wallet/transactions/${userId}${limit ? `?limit=${limit}` : ''}`),
  depositToWallet: (userId: string, amount: number, descriptionEn?: string, descriptionAr?: string): Promise<any> =>
    api.post(`/wallet/deposit?user_id=${userId}`, { amount, description_en: descriptionEn, description_ar: descriptionAr }),
  withdrawFromWallet: (userId: string, amount: number, descriptionEn?: string, descriptionAr?: string): Promise<any> =>
    api.post(`/wallet/withdraw?user_id=${userId}`, { amount, description_en: descriptionEn, description_ar: descriptionAr }),
  getAllBookings: (params?: any): Promise<any> => api.get('/bookings', params),
  getBooking: (id: string): Promise<any> => api.get(`/bookings/${id}`),
  updateBooking: (id: string, data: any): Promise<any> => api.put(`/bookings/${id}`, data),
  updateBookingStatus: (id: string, status: string, reason?: string): Promise<any> =>
    api.patch(`/bookings/${id}/status`, { status, reason }),
  deleteBooking: (id: string): Promise<any> => api.delete(`/bookings/${id}`),
  getAllOffers: (params?: any): Promise<any> => api.get('/offers', params),
  getDashboardStats: (): Promise<any> => api.get('/admin/stats/overview'),

  // Points Management
  addPoints: (userId: string, points: number, reason?: string): Promise<any> =>
    api.post(`/admin/points/add?user_id=${userId}&points=${points}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  removePoints: (userId: string, points: number, reason?: string): Promise<any> =>
    api.post(`/admin/points/remove?user_id=${userId}&points=${points}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  getPointsHistory: (userId: string, limit?: number): Promise<any> =>
    api.get(`/admin/points/history/${userId}${limit ? `?limit=${limit}` : ''}`),
  getGlobalPointsHistory: (limit?: number): Promise<any[]> =>
    api.get(`/admin/points/history/all${limit ? `?limit=${limit}` : ''}`),

  // Cashback Management
  addCashback: (userId: string, amount: number, reason?: string): Promise<any> =>
    api.post(`/cashback/admin/add?user_id=${userId}&amount=${amount}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  removeCashback: (userId: string, amount: number, reason?: string): Promise<any> =>
    api.post(`/cashback/admin/remove?user_id=${userId}&amount=${amount}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`),
  getCashbackHistory: (userId: string, limit?: number): Promise<any> =>
    api.get(`/cashback/admin/history/${userId}${limit ? `?limit=${limit}` : ''}`),
  getGlobalCashbackHistory: (limit?: number): Promise<any[]> =>
    api.get(`/admin/cashback/history/all${limit ? `?limit=${limit}` : ''}`),

  // Payment Request
  sendPaymentRequest: (userId: string): Promise<any> =>
    api.post(`/admin/users/${userId}/send-payment-request`),

  // Employee Assignment
  assignEmployee: (userId: string, employeeId: string | null): Promise<any> =>
    api.put(`/admin/users/${userId}/assign-employee`, { employee_id: employeeId }),

  // Manual Referral Attribution
  attributeReferral: (userId: string, employeeId: string): Promise<any> =>
    api.post(`/admin/users/${userId}/attribute-referral`, { employee_id: employeeId }),

  getAssignedCustomers: (userId: string): Promise<any> =>
    api.get(`/admin/users/${userId}/assigned-customers`),

  // Membership Benefits
  getMembershipBenefits: (planId: string): Promise<any> =>
    api.get(`/memberships/plans/${planId}/benefits`),
  updateMembershipBenefits: (planId: string, data: any): Promise<any> =>
    api.post(`/memberships/plans/${planId}/benefits`, data),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (params?: {
    limit?: number;
    offset?: number;
    include_read?: boolean;
  }): Promise<NotificationListResponse> => api.get('/notifications', params),

  getStats: (): Promise<NotificationStats> => api.get('/notifications/stats'),

  markAsRead: (notificationId: string): Promise<{ message: string }> =>
    api.post(`/notifications/${notificationId}/read`),

  markAllAsRead: (): Promise<{ message: string }> =>
    api.post('/notifications/read-all'),

  deleteNotification: (notificationId: string): Promise<{ message: string }> =>
    api.delete(`/notifications/${notificationId}`),

  getUnreadCount: (): Promise<{ unread_count: number }> =>
    api.get('/notifications/unread-count'),

  getSettings: (): Promise<NotificationSettings> => api.get('/notifications/settings'),

  updateSettings: (settings: Partial<NotificationSettings>): Promise<NotificationSettings> =>
    api.put('/notifications/settings', settings),

  updatePushToken: (token: string): Promise<{ message: string }> =>
    api.post('/notifications/token', { token }),
};

export interface NotificationSettings {
  id: string;
  user_id: string;
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  booking_updates: boolean;
  booking_updates_desc?: string;
  payment_alerts: boolean;
  chat_messages: boolean;
  promotions: boolean;
  new_offers: boolean;
  price_drops: boolean;
}

// Tier Posts API
export interface TierPost {
  id: string;
  user_id: string;
  tier_code: string;
  content: string;
  image_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_avatar?: string;
  likes_count: number;
  comments_count: number;
  is_liked_by_current_user: boolean;
}

export interface TierComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  user_first_name?: string;
  user_last_name?: string;
  user_avatar?: string;
}

export const tierPostsApi = {
  // User endpoints
  createPost: (data: { tier_code: string; content: string; image_url?: string }): Promise<TierPost> =>
    api.post('/tier-posts', data),

  getPosts: (tier?: string): Promise<TierPost[]> =>
    api.get('/tier-posts', tier ? { tier } : undefined),

  toggleLike: (postId: string): Promise<{ liked: boolean; message: string }> =>
    api.post(`/tier-posts/${postId}/like`),

  addComment: (postId: string, content: string): Promise<TierComment> =>
    api.post(`/tier-posts/${postId}/comments`, { content }),

  getComments: (postId: string): Promise<TierComment[]> =>
    api.get(`/tier-posts/${postId}/comments`),

  // Admin endpoints
  getAllPosts: (params?: { tier?: string; status_filter?: string }): Promise<TierPost[]> =>
    api.get('/tier-posts/admin/all', params),

  approvePost: (postId: string): Promise<{ success: boolean; message: string }> =>
    api.put(`/tier-posts/${postId}/approve`),

  rejectPost: (postId: string): Promise<{ success: boolean; message: string }> =>
    api.put(`/tier-posts/${postId}/reject`),

  deletePost: (postId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/tier-posts/${postId}`),

  getAllComments: (statusFilter?: string): Promise<TierComment[]> =>
    api.get('/tier-posts/admin/comments', statusFilter ? { status_filter: statusFilter } : undefined),

  approveComment: (commentId: string): Promise<{ success: boolean; message: string }> =>
    api.put(`/tier-posts/comments/${commentId}/approve`),

  deleteComment: (commentId: string): Promise<{ success: boolean; message: string }> =>
    api.delete(`/tier-posts/comments/${commentId}`),
};

// Payment Vault API
export interface UserCard {
  id: string;
  last4: string;
  brand: string;
  expiry_month?: string;
  expiry_year?: string;
  holder_name?: string;
  is_default: boolean;
  created_at?: string;
}

export const cardsApi = {
  getCards: (): Promise<UserCard[]> =>
    api.get('/payments/cards'),

  initAddCard: (): Promise<{ url: string }> =>
    api.post('/payments/cards/init'),

  deleteCard: (cardId: string): Promise<{ status: string; message: string }> =>
    api.delete(`/payments/cards/${cardId}`),
};

// Payments API
export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  customer_first_name: string;
  customer_last_name?: string;
  customer_email: string;
  customer_phone?: string;
  description: string;
  booking_id?: string;
  order_id?: string;
  payment_method_id?: number;
  save_card?: boolean;
}

export interface CreatePaymentResponse {
  payment_id: string;
  payment_number: string;
  amount: number;
  currency: string;
  status: string;
  payment_url: string;
  invoice_id?: string;
  invoice_key?: string;
  fawry_code?: string;
  qr_code_url?: string;
  expires_at?: string;
}

// Employee API
export const employeeApi = {
  // Get customers assigned to current employee
  getMyCustomers: (params?: any): Promise<any> =>
    api.get('/admin/employees/my-customers', params),

  // Get employee stats
  getStats: (): Promise<any> =>
    api.get('/admin/employees/stats'),

  // Create/get referral code for employee
  createReferral: (): Promise<any> =>
    api.post('/referrals/employee/create-referral'),

  // Get employee's referral code
  getMyReferralCode: (): Promise<any> =>
    api.get('/referrals/code'),

  // Get employee's referral history
  getMyReferrals: (): Promise<any> =>
    api.get('/referrals/history'),

  // Get employee's referral stats
  getReferralStats: (): Promise<any> =>
    api.get('/referrals/stats'),

  // Get customer details (for assigned customers only)
  getCustomerDetails: (userId: string): Promise<any> =>
    api.get(`/admin/employees/customers/${userId}/details`),

  // Competition: cards sold (yearly per tier and monthly total)
  getCompetitionStats: (): Promise<{
    tiers: { plan_id: string; tier_code: string; tier_name_en: string; tier_name_ar: string; count: number }[];
    monthly_total: number;
    yearly_total: number;
    chart_data: { label: string; count: number }[];
  }> =>
    api.get('/admin/employees/competition'),

  getCompetitionPlanCustomers: (planId: string): Promise<{ customer_name: string; membership_number: string; customer_avatar: string | null; start_date: string | null; referred_at: string | null }[]> =>
    api.get(`/admin/employees/competition/plans/${planId}`),

  // Get orders from assigned customers
  getOrders: (params?: { search?: string; status?: string; payment_status?: string; limit?: number; offset?: number }): Promise<any> =>
    api.get('/admin/employees/orders', params),

  // Get order details for assigned customers
  getOrderDetails: (orderId: string): Promise<any> =>
    api.get(`/admin/employees/orders/${orderId}`),

  // Admin: list employees for targeting messages
  listEmployees: (params?: { search?: string; limit?: number; offset?: number }): Promise<any[]> =>
    api.get('/admin/employees/list', params),

  // Admin -> Employee messages (for employee dashboard)
  getAdminMessages: (params?: { limit?: number; include_inactive?: boolean }): Promise<any[]> =>
    api.get('/admin/employees/admin-messages', params),

  // Employee/Admin: get a single admin message by id
  getAdminMessage: (messageId: string, params?: { include_inactive?: boolean }): Promise<any> =>
    api.get(`/admin/employees/admin-messages/${messageId}`, params),

  // Admin sends message to employees
  createAdminMessage: (data: { title: string; message: string; urgent?: boolean; target_employee_id?: string | null }): Promise<any> =>
    api.post('/admin/employees/admin-messages', data),
};
