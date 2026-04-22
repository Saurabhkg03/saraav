import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Secure the endpoint with CRON_SECRET (set in Vercel env vars)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = Date.now();
        let processedUsers = 0;
        let totalRevoked = 0;

        // Fetch all users (for large DBs, consider paginating with startAfter)
        const usersSnapshot = await adminDb.collection('users').get();

        // Firestore batches are limited to 500 operations
        let currentBatch = adminDb.batch();
        let batchOpCount = 0;

        const commitBatchIfNeeded = async () => {
            if (batchOpCount >= 490) {
                await currentBatch.commit();
                currentBatch = adminDb.batch();
                batchOpCount = 0;
            }
        };

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const purchasedCourseIds: string[] = userData.purchasedCourseIds || [];
            const purchases: Record<string, { expiryDate: number }> = userData.purchases || {};

            // Identify expired course IDs
            const expiredIds = purchasedCourseIds.filter(courseId => {
                const purchase = purchases[courseId];
                // Only revoke if we have explicit purchase data with a passed expiry date.
                // If no purchase data exists (legacy users), we leave them untouched.
                if (!purchase || !purchase.expiryDate) return false;
                return now > purchase.expiryDate;
            });

            if (expiredIds.length > 0) {
                currentBatch.update(userDoc.ref, {
                    purchasedCourseIds: FieldValue.arrayRemove(...expiredIds)
                });
                batchOpCount++;
                totalRevoked += expiredIds.length;

                await commitBatchIfNeeded();
            }

            processedUsers++;
        }

        // Commit any remaining batch operations
        if (batchOpCount > 0) {
            await currentBatch.commit();
        }

        console.log(`[expire-purchases] Done. Users: ${processedUsers}, Revoked: ${totalRevoked}`);

        return NextResponse.json({
            success: true,
            processedUsers,
            totalRevoked,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[expire-purchases] Cron error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
