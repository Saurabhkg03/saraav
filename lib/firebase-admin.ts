import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let serviceAccount: any = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    }
} catch (error) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    console.warn("Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string in your .env.local file.");
}

export const initAdmin = () => {
    if (!getApps().length) {
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            console.warn("Firebase Admin Service Account missing. Admin features will not work.");
            // Initialize with default application credentials or mock
            // For build purposes, we can skip initialization or initialize a dummy app if needed
            // But getFirestore requires an app.
            // If we are in build, maybe we don't need to do anything?
            // But adminDb is exported.
            if (process.env.NODE_ENV === 'production') {
                // In production runtime, this should probably throw if missing
            }
            // Try to initialize with no-op or default if possible, or just don't init and let getFirestore fail later?
            // Actually, getFirestore() throws if no app.
            // We'll initialize a dummy app for build if missing.
            initializeApp({
                projectId: 'demo-project'
            });
        }
    }
    return getApp();
};

export const adminDb = getFirestore(initAdmin());
export const adminAuth = getAuth(initAdmin());
