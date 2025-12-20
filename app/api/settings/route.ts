import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function GET() {
    try {
        const doc = await adminDb.collection('settings').doc('global').get();
        if (!doc.exists) {
            // Default settings
            return NextResponse.json({ isPaymentEnabled: true, courseDurationMonths: 5 });
        }
        return NextResponse.json(doc.data());
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check if user is admin
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();

        if (!userData?.isAdmin) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const data = await req.json();
        // Only allow specific fields if needed, or just trust the admin
        await adminDb.collection('settings').doc('global').set(data, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
