import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const { courseId, courseIds, bundleId } = await req.json();

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

        // Write batch: Update user and increment analytics
        const batch = adminDb.batch();
        const userRef = adminDb.collection('users').doc(userId);
        const analyticsRef = adminDb.collection('admin_data').doc('analytics');
        
        const today = new Date().toISOString().split('T')[0];
        const dailyRecordRef = adminDb.collection('admin_data').doc('analytics_daily').collection('days').doc(today);

        const analyticsUpdates: Record<string, any> = {
            totalEnrollments: FieldValue.increment(coursesToEnroll.length)
        };
        coursesToEnroll.forEach((cid: string) => {
            analyticsUpdates[`courseEnrollmentCounts.${cid}`] = FieldValue.increment(1);
        });
        
        if (bundleId) {
            analyticsUpdates[`bundleEnrollmentCounts.${bundleId}`] = FieldValue.increment(1);
        }

        const dailyUpdates: Record<string, any> = {
            date: today,
            totalNewEnrollments: FieldValue.increment(courseIds && bundleId ? 1 : coursesToEnroll.length) // Group bundles as 1 enrollment hit visually or courses length
        };

        batch.update(userRef, updates);
        batch.set(analyticsRef, analyticsUpdates, { merge: true });
        batch.set(dailyRecordRef, dailyUpdates, { merge: true });
        
        await batch.commit();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error enrolling user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
