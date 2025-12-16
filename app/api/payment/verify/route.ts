import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            courseId,
            courseIds,
        } = await req.json();
        const reqBody = { courseId, courseIds }; // Keep ref for logic below

        // 1. Authenticate Request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            (!courseId && !courseIds)
        ) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Signature is valid, update user's purchased courses
            if (reqBody.courseIds && Array.isArray(reqBody.courseIds)) {
                await adminDb.collection('users').doc(userId).update({
                    purchasedCourseIds: FieldValue.arrayUnion(...reqBody.courseIds),
                });
            } else {
                await adminDb.collection('users').doc(userId).update({
                    purchasedCourseIds: FieldValue.arrayUnion(courseId),
                });
            }

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
