"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, getDocFromServer } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    purchasedCourseIds: string[];
    purchases?: UserProfile['purchases'];
    branch?: string;
    year?: string;
    hasSeenWelcomeModal?: boolean;
    progress: UserProfile['progress'];
    login: () => Promise<void>;
    logout: () => Promise<void>;
    purchaseCourse: (courseId: string) => Promise<void>;
    updateProfile: (data: { branch?: string; year?: string }) => Promise<void>;
    markWelcomeModalAsSeen: () => Promise<void>;
    checkAccess: (courseId: string) => boolean;
    getAccessStatus: (courseId: string) => "not_purchased" | "active" | "expired";
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    purchasedCourseIds: [],
    progress: {},
    login: async () => { },
    logout: async () => { },
    purchaseCourse: async () => { },
    updateProfile: async () => { },
    markWelcomeModalAsSeen: async () => { },
    checkAccess: () => false,
    getAccessStatus: () => "not_purchased" as const,
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [purchasedCourseIds, setPurchasedCourseIds] = useState<string[]>([]);
    const [purchases, setPurchases] = useState<UserProfile['purchases']>({});
    const [branch, setBranch] = useState<string>();
    const [year, setYear] = useState<string>();
    const [hasSeenWelcomeModal, setHasSeenWelcomeModal] = useState<boolean>(false);
    const [progress, setProgress] = useState<UserProfile['progress']>({});

    const refreshUser = async () => {
        if (!user) return;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDocFromServer(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                const rawPurchasedIds: string[] = data.purchasedCourseIds || [];
                const rawPurchases: UserProfile['purchases'] = data.purchases || {};

                // Keep ALL purchased IDs in local state (including expired ones)
                // so getAccessStatus can correctly return 'expired' and the study
                // page can show the re-enroll banner instead of redirecting.
                setPurchasedCourseIds(rawPurchasedIds);
                setPurchases(rawPurchases);
                setBranch(data.branch);
                setYear(data.year);
                setHasSeenWelcomeModal(data.hasSeenWelcomeModal || false);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    useEffect(() => {
        // ✅ REVERTED: Removed the complex isMobile/getRedirectResult logic.
        // We now rely solely on the standard auth listener which works for Popups.

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // Set predictive flag
                localStorage.setItem('isLoggedIn', 'true');

                // Check Admin Status
                try {
                    const idTokenResult = await user.getIdTokenResult();
                    if (idTokenResult.claims.admin) {
                        setIsAdmin(true);
                    } else {
                        try {
                            const token = await user.getIdToken();
                            const res = await fetch('/api/admin/set-claims', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            if (res.ok) {
                                const result = await res.json();
                                if (result.success) {
                                    await user.getIdToken(true);
                                    const newIdTokenrResult = await user.getIdTokenResult();
                                    if (newIdTokenrResult.claims.admin) {
                                        setIsAdmin(true);
                                    }
                                }
                            }
                        } catch (apiErr) {
                            console.error("Admin check API failed:", apiErr);
                        }
                    }
                } catch (err) {
                    console.error("Error checking admin roles:", err);
                    setIsAdmin(false);
                }

                // Fetch user data from Firestore
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        const rawPurchasedIds: string[] = data.purchasedCourseIds || [];
                        const rawPurchases: UserProfile['purchases'] = data.purchases || {};

                        // Keep ALL purchased IDs in local state (including expired ones)
                        // getAccessStatus uses the purchases map to return 'expired' status,
                        // so the study page can show the re-enroll banner instead of redirecting.
                        setPurchasedCourseIds(rawPurchasedIds);
                        setPurchases(rawPurchases);
                        setBranch(data.branch);
                        setYear(data.year);
                        setHasSeenWelcomeModal(data.hasSeenWelcomeModal || false);

                        // --- Background Expiry Revocation (syncs Firestore) ---
                        // Detect expired courses and fire-and-forget a Firestore cleanup.
                        // This keeps the DB tidy so security rules based on purchasedCourseIds
                        // won't grant stale access.
                        const now = Date.now();
                        const expiredIds = rawPurchasedIds.filter(id => {
                            const p = rawPurchases?.[id];
                            return p && p.expiryDate && now > p.expiryDate;
                        });

                        if (expiredIds.length > 0) {
                            console.log(`[AuthContext] Detected ${expiredIds.length} expired course(s), syncing to DB:`, expiredIds);
                            user.getIdToken().then(token => {
                                fetch('/api/user/revoke-expired', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ expiredIds })
                                }).catch(err => console.error('[AuthContext] Revoke-expired API error:', err));
                            });
                        }
                    } else {
                        await setDoc(userDocRef, {
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            createdAt: new Date().toISOString(),
                            purchasedCourseIds: [],
                            hasSeenWelcomeModal: false
                        });
                        setPurchasedCourseIds([]);
                        setPurchases({});
                        setHasSeenWelcomeModal(false);
                    }

                    // Fire-and-forget: track login session for DAU
                    user.getIdToken().then(token => {
                        fetch('/api/admin/tracking', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ event: 'login' })
                        }).catch(() => {}); // silent fail
                    });

                    // Listen to progress subcollection
                    import("firebase/firestore").then(({ collection, onSnapshot }) => {
                        const progressCollectionRef = collection(db, "users", user.uid, "progress");
                        const unsubscribeProgress = onSnapshot(progressCollectionRef, (snapshot) => {
                            const newProgress: UserProfile['progress'] = {};
                            snapshot.forEach((doc) => {
                                newProgress[doc.id] = doc.data() as any;
                            });
                            setProgress(newProgress);
                        });
                    });

                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                localStorage.removeItem('isLoggedIn');
                setIsAdmin(false);
                setPurchasedCourseIds([]);
                setPurchases({});
                setBranch(undefined);
                setYear(undefined);
                setHasSeenWelcomeModal(false);
                setProgress({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ✅ REVERTED: Simplified login function that works on both Desktop and Mobile
    const login = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        // Using Popup for everyone since you confirmed it works for you
        await signInWithPopup(auth, provider);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const purchaseCourse = async (courseId: string) => {
        if (!user) return;
        try {
            const settingsDoc = await getDoc(doc(db, "settings", "global"));
            const durationMonths = settingsDoc.exists() ? (settingsDoc.data().courseDurationMonths || 5) : 5;
            const purchaseDate = Date.now();
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
            const purchaseData = {
                purchaseDate,
                expiryDate: expiryDate.getTime(),
                durationMonths
            };
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                purchasedCourseIds: arrayUnion(courseId),
                [`purchases.${courseId}`]: purchaseData
            });
            setPurchasedCourseIds(prev => [...prev, courseId]);
            setPurchases(prev => ({
                ...prev,
                [courseId]: purchaseData
            }));
        } catch (error) {
            console.error("Error purchasing course:", error);
            throw error;
        }
    };

    const checkAccess = (courseId: string): boolean => {
        return getAccessStatus(courseId) === "active";
    };

    const getAccessStatus = (courseId: string): "not_purchased" | "active" | "expired" => {
        if (!purchasedCourseIds.includes(courseId)) return "not_purchased";
        const purchase = purchases?.[courseId];
        if (purchase) {
            // If purchase data exists, honour the expiryDate
            if (!purchase.expiryDate) return "active"; // legacy entry with no expiry = perpetual
            if (Date.now() > purchase.expiryDate) return "expired";
            return "active";
        }
        // No purchase record but ID is in purchasedCourseIds → treat as active (legacy / grandfathered)
        return "active";
    };

    const updateProfile = async (data: { branch?: string; year?: string }) => {
        if (!user) return;
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, data);
            if (data.branch) setBranch(data.branch);
            if (data.year) setYear(data.year);
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    const markWelcomeModalAsSeen = async () => {
        if (!user) return;
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { hasSeenWelcomeModal: true });
            setHasSeenWelcomeModal(true);
        } catch (error) {
            console.error("Error marking welcome modal as seen:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, purchasedCourseIds, branch, year, hasSeenWelcomeModal, progress, login, logout, purchaseCourse, updateProfile, markWelcomeModalAsSeen, checkAccess, getAccessStatus, purchases, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
