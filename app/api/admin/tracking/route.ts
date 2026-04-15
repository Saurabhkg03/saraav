import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        // Verify Token
        let userId: string;
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            userId = decodedToken.uid;
        } catch (error) {
            console.error("Token verification failed:", error);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const { event, count = 1 } = await req.json();

        if (!event || !['questionAttempted', 'questionDone', 'login'].includes(event)) {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        const dailyRecordRef = adminDb.collection('admin_data').doc('analytics_daily').collection('days').doc(today);

        const updates: Record<string, any> = {
            date: today,
        };

        if (event === 'questionAttempted') {
            updates.questionsAttempted = FieldValue.increment(count);
        } else if (event === 'questionDone') {
            updates.questionsDone = FieldValue.increment(count);
        } else if (event === 'login') {
             // For DAU: Since counting exactly unique logins without reading is hard via increments alone efficiently, 
             // we will just track login sessions.
            updates.loginSessions = FieldValue.increment(1);
        }

        // Use merge to create if not exists
        await dailyRecordRef.set(updates, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking event:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
