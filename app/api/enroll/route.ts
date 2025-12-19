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

        // 1. Fetch Course Duration Settings
        const durationMonths = settingsDoc.exists ? (settingsDoc.data()?.courseDurationMonths || 1) : 1;

        // 2. Calculate Expiry
        const purchaseDate = Date.now();
        const expiryDateObj = new Date();
        expiryDateObj.setMonth(expiryDateObj.getMonth() + durationMonths);
        const expiryDate = expiryDateObj.getTime();

        const purchaseData = {
            purchaseDate,
            expiryDate,
            durationMonths,
            type: 'manual_enrollment'
        };

        const updates: any = {};
        const coursesToEnroll = (courseIds && Array.isArray(courseIds)) ? courseIds : [courseId];

        updates.purchasedCourseIds = FieldValue.arrayUnion(...coursesToEnroll);

        // Add purchase details for EACH course
        coursesToEnroll.forEach((cid: string) => {
            updates[`purchases.${cid}`] = purchaseData;
        });

        await adminDb.collection('users').doc(userId).update(updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error enrolling user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
