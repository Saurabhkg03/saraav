import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET(req: Request) {
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

        // 1. Get Analytics Data
        const analyticsDoc = await adminDb.collection('admin_data').doc('analytics').get();
        const analyticsData = analyticsDoc.exists ? analyticsDoc.data() : {
            totalUsers: 0,
            totalEnrollments: 0,
            courseEnrollmentCounts: {},
            bundleEnrollmentCounts: {}
        };
        const { totalUsers, totalEnrollments, courseEnrollmentCounts, bundleEnrollmentCounts } = analyticsData as any;

        // 2. Count Pending Reports
        const reportsQuery = adminDb.collection('reports').where('status', '==', 'pending');
        const pendingReportsSnapshot = await reportsQuery.count().get();
        const pendingReportsCount = pendingReportsSnapshot.data().count;

        // 3. Get Subjects Metadata
        const subjectsSnapshot = await adminDb.collection('subjects_metadata').get();
        const subjectsMap: Record<string, any> = {};
        let activeSubjectsCount = 0;
        subjectsSnapshot.forEach(doc => {
            subjectsMap[doc.id] = doc.data();
            activeSubjectsCount++;
        });

        // 4. Calculate Top 5 Courses
        const courseEntries = Object.entries(courseEnrollmentCounts || {}) as [string, number][];
        const top5Courses = courseEntries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([courseId, count]) => {
                const subject = subjectsMap[courseId];
                return {
                    courseId,
                    count,
                    title: subject?.title || 'Unknown Subject',
                    branch: subject?.branch || 'Unknown Branch',
                };
            });

        // 5. Calculate Top 5 Bundles
        const bundleEntries = Object.entries(bundleEnrollmentCounts || {}) as [string, number][];
        const top5Bundles = bundleEntries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([bundleId, count]) => {
                return {
                    bundleId,
                    count
                };
            });

        // 6. Fetch 7 Days Analytics Logs
        const today = new Date();
        today.setDate(today.getDate() - 7);
        const dailyQuery = adminDb.collection('admin_data').doc('analytics_daily').collection('days')
                               .where('date', '>=', today.toISOString().split('T')[0])
                               .orderBy('date', 'asc');
        const dailySnap = await dailyQuery.get();
        const dailyMetrics = dailySnap.docs.map(doc => doc.data());

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: totalUsers || 0,
                totalEnrollments: totalEnrollments || 0,
                pendingReports: pendingReportsCount,
                activeSubjects: activeSubjectsCount,
                topSubjects: top5Courses,
                topBundles: top5Bundles,
                dailyMetrics: dailyMetrics
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
