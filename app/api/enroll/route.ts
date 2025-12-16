import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const { courseId, courseIds } = await req.json();

        // 1. Get Token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        // 2. Verify Token
        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        if (!courseId && !courseIds) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if payments are actually disabled
        const settingsDoc = await adminDb.collection('settings').doc('global').get();
        const isPaymentEnabled = settingsDoc.exists ? settingsDoc.data()?.isPaymentEnabled : true;

        if (isPaymentEnabled) {
            return NextResponse.json({ error: 'Payments are enabled. Cannot enroll for free.' }, { status: 403 });
        }

        // Enroll user using verified userId
        if (courseIds && Array.isArray(courseIds)) {
            await adminDb.collection('users').doc(userId).update({
                purchasedCourseIds: FieldValue.arrayUnion(...courseIds),
            });
        } else {
            await adminDb.collection('users').doc(userId).update({
                purchasedCourseIds: FieldValue.arrayUnion(courseId),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error enrolling user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
