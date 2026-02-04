import { api } from './api';

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
    payment_method_id?: number; // 1=Card, 2=Fawry, etc.
    save_card?: boolean;
}

export interface CreatePaymentResponse {
    payment_id: string;
    payment_number: string;
    payment_url: string;
    invoice_id: string;
    invoice_key: string;
    fawry_code?: string;
    status: string;
}

export interface PaymentStatus {
    payment_id: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    amount: number;
    currency: string;
    paid_at?: string;
    error_message?: string;
}

export interface UserPayment {
    id: string;
    payment_number: string;
    amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    paid_at?: string;
    booking?: {
        id: string;
        booking_number: string;
        title_en: string;
        title_ar: string;
    };
    order?: {
        id: string;
        order_number: string;
    };
}

class PaymentService {
    /**
     * Create a new payment
     */
    async createPayment(data: CreatePaymentRequest): Promise<CreatePaymentResponse> {
        return await api.post('/payments/create', data);
    }

    /**
     * Get payment status by ID
     */
    async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
        // Backend route: GET /api/payments/status/{payment_id}
        return await api.get(`/payments/status/${paymentId}`);
    }

    /**
     * Get current user's payments
     */
    async getMyPayments(): Promise<UserPayment[]> {
        // Backend route: GET /api/payments/my-payments  -> { items, total }
        const response: any = await api.get('/payments/my-payments');
        return response?.items || [];
    }

    /**
     * Get unpaid orders (invoices)
     */
    async getUnpaidOrders(): Promise<any[]> {
        const items = await this.getMyPayments();
        // Items with source === "INVOICE" represent unpaid/standalone orders
        return items.filter((x: any) => x?.source === "INVOICE" && x?.status !== "PAID");
    }

    /**
     * Poll payment status until it's no longer pending
     * Useful after returning from WebView
     */
    async pollPaymentStatus(
        paymentId: string,
        maxAttempts: number = 10,
        intervalMs: number = 2000
    ): Promise<PaymentStatus> {
        for (let i = 0; i < maxAttempts; i++) {
            const status = await this.getPaymentStatus(paymentId);

            if (status.status !== 'PENDING') {
                return status;
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        // Return last status if still pending
        return await this.getPaymentStatus(paymentId);
    }
}

export default new PaymentService();
