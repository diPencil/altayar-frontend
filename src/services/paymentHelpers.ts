/**
 * Payment Helper Functions
 * Reusable functions for initiating payments from bookings and orders
 */

import { Alert } from 'react-native';
import { router } from 'expo-router';
import paymentService, { CreatePaymentRequest } from './paymentService';

export interface PaymentInitiationData {
    amount: number;
    currency?: string;
    description: string;
    booking_id?: string;
    order_id?: string;
    customer_first_name: string;
    customer_last_name?: string;
    customer_email: string;
    customer_phone?: string;
    save_card?: boolean;
}

/**
 * Initiate payment and navigate to payment screen
 */
export async function initiatePayment(data: PaymentInitiationData): Promise<void> {
    try {
        // Show loading
        Alert.alert('جاري التحضير...', 'يرجى الانتظار');

        // Create payment
        const paymentRequest: CreatePaymentRequest = {
            amount: data.amount,
            currency: data.currency || 'USD',
            customer_first_name: data.customer_first_name,
            customer_last_name: data.customer_last_name,
            customer_email: data.customer_email,
            customer_phone: data.customer_phone,
            description: data.description,
            booking_id: data.booking_id,
            order_id: data.order_id,
            payment_method_id: 2, // Fawry (2) - often works when Card returns 422
            save_card: data.save_card,
        };

        const response = await paymentService.createPayment(paymentRequest);

        // Navigate to payment WebView with the payment URL
        router.push({
            pathname: '/(user)/payment/[paymentId]',
            params: {
                paymentId: response.payment_id,
                paymentUrl: response.payment_url,
            },
        });
    } catch (error: any) {
        console.error('Payment initiation error:', error);
        const detail = error.response?.data?.detail ?? error.response?.data?.message;
        const message = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.join('\n') : 'فشل إنشاء عملية الدفع. يرجى المحاولة مرة أخرى.');
        Alert.alert(
            'خطأ',
            message || error?.message || 'فشل إنشاء عملية الدفع. يرجى المحاولة مرة أخرى.'
        );
    }
}

/**
 * Initiate payment for a booking
 */
export async function initiateBookingPayment(
    booking: any,
    userEmail: string,
    userName: string,
    saveCard: boolean = false
): Promise<void> {
    await initiatePayment({
        amount: booking.total_amount,
        currency: booking.currency,
        description: `دفع حجز ${booking.booking_number}`,
        booking_id: booking.id,
        customer_first_name: userName.split(' ')[0] || 'Customer',
        customer_last_name: userName.split(' ').slice(1).join(' '),
        customer_email: userEmail,
        save_card: saveCard,
    });
}

/**
 * Initiate payment for an order/invoice
 */
export async function initiateOrderPayment(
    order: any,
    userEmail: string,
    userName: string,
    saveCard: boolean = false
): Promise<void> {
    await initiatePayment({
        amount: order.total_amount,
        currency: order.currency,
        description: `دفع فاتورة ${order.order_number || order.id?.slice(0, 8)}`,
        order_id: order.id,
        customer_first_name: userName.split(' ')[0] || 'Customer',
        customer_last_name: userName.split(' ').slice(1).join(' '),
        customer_email: userEmail,
        save_card: saveCard,
    });
}
