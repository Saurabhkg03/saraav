import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ uid: string }> }
) {
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

        const { uid } = await params;
        if (!uid) {
            return NextResponse.json({ error: 'UID is required' }, { status: 400 });
        }

        // Fetch User Profile
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : { uid };

        if (!userData?.uid) {
            userData!.uid = uid;
        }

        // Fetch Progress
        const progressSnapshot = await adminDb.collection('users').doc(uid).collection('progress').get();
        const progressData: Record<string, any> = {};
        
        progressSnapshot.forEach(doc => {
            const data = doc.data();
            const questions = data.questions || {};
            let attempted = 0;
            let done = 0;
            
            Object.values(questions).forEach((q: any) => {
                if (q.status) {
                    attempted++;
                    if (q.status === 'easy' || q.status === 'medium' || q.status === 'hard') {
                        // Assuming any status means done or attempted. 
                        // If they marked it easy/medium/hard, they've done it.
                        done++;
                    }
                }
            });

            progressData[doc.id] = {
                lastAccessed: data.lastAccessed,
                attempted,
                done,
                totalQuestionsInteracted: Object.keys(questions).length
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                ...userData,
                progressSummary: progressData
            }
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
