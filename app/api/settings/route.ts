import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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
        const data = await req.json();
        await adminDb.collection('settings').doc('global').set(data, { merge: true });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
