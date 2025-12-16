declare module 'razorpay' {
    interface RazorpayOptions {
        key_id: string;
        key_secret: string;
    }

    interface OrderOptions {
        amount: number;
        currency: string;
        receipt: string;
        payment_capture?: number;
        notes?: Record<string, string>;
    }

    interface Order {
        id: string;
        entity: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        status: string;
        attempts: number;
        notes: any;
        created_at: number;
    }

    class Razorpay {
        constructor(options: RazorpayOptions);
        orders: {
            create(options: OrderOptions): Promise<Order>;
            fetch(orderId: string): Promise<Order>;
        };
    }

    export = Razorpay;
}

interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color?: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
        open: () => void;
    };
}
