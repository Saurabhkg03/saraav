"use client";

import { useState } from 'react';
import { loadRazorpay } from '@/lib/loadRazorpay';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

interface PaymentButtonProps {
    courseId?: string;
    courseIds?: string[];
    amount: number;
    courseName: string;
    className?: string;
}

export function PaymentButton({ courseId, courseIds, amount, courseName, className }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false);
    const { user, refreshUser } = useAuth();
    const { settings, loading: settingsLoading } = useSettings();
    const router = useRouter();

    const handlePayment = async () => {
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);

        try {
            // Free Enrollment Flow
            if (!settings.isPaymentEnabled) {
                const token = await user.getIdToken();
                const response = await fetch('/api/enroll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        courseId,
                        courseIds,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    toast.success('Enrolled Successfully!');
                    await refreshUser(); // Refresh user data immediately
                    router.refresh();
                    if (courseId) {
                        router.push(`/study/${courseId}`);
                    } else {
                        router.push('/courses');
                    }
                } else {
                    toast.error(result.error || 'Enrollment failed');
                }
                setLoading(false);
                return;
            }

            // Paid Flow (Razorpay)
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                toast.error('Razorpay SDK failed to load. Please check your internet connection.');
                setLoading(false);
                return;
            }

            // Create Order
            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    courseId,
                    courseIds,
                    amount,
                }),
            });

            const order = await response.json();

            if (order.error) {
                toast.error(order.error);
                setLoading(false);
                return;
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Saraav",
                description: `Purchase ${courseName}`,
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const token = await user.getIdToken();
                        const verifyResponse = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                courseId,
                                courseIds,
                            }),
                        });

                        const verifyResult = await verifyResponse.json();

                        if (verifyResult.success) {
                            toast.success('Payment Successful! Course unlocked.');
                            await refreshUser(); // Refresh user data immediately
                            router.refresh();
                            if (courseId) {
                                router.push(`/study/${courseId}`);
                            } else {
                                router.push('/courses');
                            }
                        } else {
                            toast.error('Payment verification failed. Please contact support.');
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        toast.error('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: user.displayName || '',
                    email: user.email || '',
                },
                theme: {
                    color: '#4f46e5', // Indigo-600
                },
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.open();

            paymentObject.on('payment.failed', function (response: any) {
                toast.error(response.error.description);
                setLoading(false);
            });

        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (settingsLoading) {
        return (
            <button disabled className={cn("flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-8 py-4 text-base font-semibold text-zinc-400", className)}>
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
            </button>
        );
    }

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className={cn(
                "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-500 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
        >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative flex items-center gap-2">
                {loading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        {settings.isPaymentEnabled ? <Lock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                        {settings.isPaymentEnabled ? `Enroll Now - ₹${amount}` : 'Enroll for Free'}
                    </>
                )}
            </div>
        </button>
    );
}
