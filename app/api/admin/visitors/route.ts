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
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            if (!decodedToken.admin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');

        if (!dateParam) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const visitorsRef = adminDb
            .collection('admin_data')
            .doc('analytics_daily')
            .collection('days')
            .doc(dateParam)
            .collection('visitors')
            .orderBy('lastVisitTime', 'desc');

        const snapshot = await visitorsRef.get();
        const visitors = snapshot.docs.map(doc => doc.data());

        return NextResponse.json({ success: true, data: visitors });
    } catch (error) {
        console.error('Error fetching visitors:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
