import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;
        const email = decodedToken.email;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // --- AUTHORIZATION CHECK ---
        // We must check if this user SHOULD be an admin.
        // We use the same logic as the old Firestore rules / AuthContext to verify.

        let isAuthorized = false;

        // 1. Check Env Variable (Secure)
        const OWNER_EMAIL = process.env.OWNER_EMAIL;
        console.log(`[AdminCheck] Email: ${email}, Owner: ${OWNER_EMAIL}`); // Debug Log
        if (OWNER_EMAIL && email === OWNER_EMAIL) {
            isAuthorized = true;
        }

        // 2. Check Firestore 'settings/roles'
        if (!isAuthorized) {
            const rolesDoc = await adminDb.collection('settings').doc('roles').get();
            if (rolesDoc.exists) {
                const data = rolesDoc.data();
                if (data?.adminEmails && Array.isArray(data.adminEmails)) {
                    if (data.adminEmails.includes(email)) {
                        isAuthorized = true;
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized to become admin' }, { status: 403 });
        }

        // --- SET CUSTOM CLAIM ---
        await adminAuth.setCustomUserClaims(uid, { admin: true });

        // Force token refresh on client side? Client needs to call getIdTokenResult(true)

        return NextResponse.json({
            success: true,
            message: `Admin claim set for ${email}. Please refresh your browser or re-login to activate.`
        });

    } catch (error: any) {
        console.error('Error setting custom claims:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
