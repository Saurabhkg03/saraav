import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        // 1. Authenticate the request
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } catch {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Parse the expired IDs passed by the client
        const { expiredIds } = await req.json();

        if (!Array.isArray(expiredIds) || expiredIds.length === 0) {
            return NextResponse.json({ success: true, message: 'Nothing to revoke' });
        }

        // 3. Verify expiry server-side (never trust the client blindly)
        const now = Date.now();
        const userRef = adminDb.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const purchases: Record<string, { expiryDate: number }> = userData.purchases || {};

        // Only revoke IDs where server confirms they are actually expired
        const confirmedExpiredIds = expiredIds.filter(courseId => {
            const purchase = purchases[courseId];
            if (!purchase || !purchase.expiryDate) return false;
            return now > purchase.expiryDate;
        });

        if (confirmedExpiredIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No confirmed expired courses' });
        }

        // 4. Remove expired IDs from purchasedCourseIds only.
        //    We keep the purchases map intact for history/re-enrollment reference.
        await userRef.update({
            purchasedCourseIds: FieldValue.arrayRemove(...confirmedExpiredIds),
        });

        console.log(`[revoke-expired] User ${userId}: revoked ${confirmedExpiredIds.length} course(s):`, confirmedExpiredIds);

        return NextResponse.json({
            success: true,
            revokedIds: confirmedExpiredIds,
        });
    } catch (error) {
        console.error('[revoke-expired] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
