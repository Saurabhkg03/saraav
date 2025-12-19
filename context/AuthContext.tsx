"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
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
    progress: UserProfile['progress'];
    login: () => Promise<void>;
    logout: () => Promise<void>;
    purchaseCourse: (courseId: string) => Promise<void>;
    updateProfile: (data: { branch?: string; year?: string }) => Promise<void>;
    checkAccess: (courseId: string) => boolean;
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
    checkAccess: () => false,
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
    const [progress, setProgress] = useState<UserProfile['progress']>({});

    const refreshUser = async () => {
        if (!user) return;
        try {
            const userDocRef = doc(db, "users", user.uid);
            // Force fetch from server to bypass local cache, ensuring we get the latest
            // purchasedCourseIds updated by the API/Backend.
            const userDocSnap = await getDocFromServer(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setPurchasedCourseIds(data.purchasedCourseIds || []);
                setPurchases(data.purchases || {});
                setBranch(data.branch);
                setYear(data.year);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // Set predictive flag
                localStorage.setItem('isLoggedIn', 'true');

                // Check Admin Status
                try {
                    // 1. FAST PATH: Custom Claims
                    const idTokenResult = await user.getIdTokenResult();
                    if (idTokenResult.claims.admin) {
                        setIsAdmin(true);
                    } else {
                        // 2. SLOW PATH: Database Check (Fallback/Migration)
                        const rolesDocRef = doc(db, "settings", "roles");
                        const rolesSnap = await getDoc(rolesDocRef);

                        let isDbAdmin = false;

                        if (rolesSnap.exists()) {
                            const adminEmails = rolesSnap.data().adminEmails || [];
                            if (user.email && adminEmails.includes(user.email)) {
                                isDbAdmin = true;
                            }
                        } else {
                            // Fallback for bootstrapping
                            const HARDCODED_ADMIN = "saurabhkg36@gmail.com";
                            if (user.email === HARDCODED_ADMIN) {
                                isDbAdmin = true;
                                await setDoc(rolesDocRef, { adminEmails: [HARDCODED_ADMIN] });
                            }
                        }

                        if (isDbAdmin) {
                            setIsAdmin(true);
                            // 3. AUTO-UPGRADE: Set Claim for next time
                            try {
                                const token = await user.getIdToken();
                                await fetch('/api/admin/set-claims', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                // Force token refresh to get the new claim immediately
                                await user.getIdToken(true);
                            } catch (upgradeErr) {
                                console.error("Auto-upgrade to admin claim failed:", upgradeErr);
                            }
                        } else {
                            setIsAdmin(false);
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
                        setPurchasedCourseIds(data.purchasedCourseIds || []);
                        setPurchases(data.purchases || {});
                        setBranch(data.branch);
                        setYear(data.year);
                    } else {
                        // Create user doc if it doesn't exist
                        await setDoc(userDocRef, {
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            createdAt: new Date().toISOString(),
                            purchasedCourseIds: [],
                        });
                        setPurchasedCourseIds([]);
                        setPurchases({});
                    }

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
                // Clear predictive flag
                localStorage.removeItem('isLoggedIn');

                setIsAdmin(false);
                setPurchasedCourseIds([]);
                setPurchases({});
                setBranch(undefined);
                setYear(undefined);
                setProgress({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        await signInWithPopup(auth, provider);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const purchaseCourse = async (courseId: string) => {
        if (!user) return;

        try {
            // Get current global settings for duration
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
        if (!purchasedCourseIds.includes(courseId)) return false;

        // Check if we have extended purchase data
        const purchase = purchases?.[courseId];
        if (purchase) {
            // Check expiry
            if (Date.now() > purchase.expiryDate) {
                return false; // Expired
            }
            return true; // Valid
        }

        // Legacy support: If no purchase date recorded, assume valid (lifetime) 
        // OR we could force a migration. For now, let's keep it valid to avoid breaking existing users.
        return true;
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

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, purchasedCourseIds, branch, year, progress, login, logout, purchaseCourse, updateProfile, checkAccess, purchases, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
