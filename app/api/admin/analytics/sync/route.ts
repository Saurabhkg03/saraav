import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        // Verify Token and check admin claim
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
            if (!decodedToken.admin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Fetch all users
        const usersSnapshot = await adminDb.collection('users').get();
        const totalUsers = usersSnapshot.size;
        let totalEnrollments = 0;
        const courseEnrollmentCounts: Record<string, number> = {};

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const purchasedCourseIds = data.purchasedCourseIds || [];
            
            totalEnrollments += purchasedCourseIds.length;

            purchasedCourseIds.forEach((courseId: string) => {
                if (!courseEnrollmentCounts[courseId]) {
                    courseEnrollmentCounts[courseId] = 0;
                }
                courseEnrollmentCounts[courseId]++;
            });
        });

        const analyticsData = {
            totalUsers,
            totalEnrollments,
            courseEnrollmentCounts,
            lastSyncedAt: new Date().toISOString()
        };

        // Save to admin_data/analytics
        await adminDb.collection('admin_data').doc('analytics').set(analyticsData);

        return NextResponse.json({ success: true, data: analyticsData });
    } catch (error) {
        console.error('Error syncing analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
