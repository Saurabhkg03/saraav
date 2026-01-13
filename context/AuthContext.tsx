"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    signOut,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence,
    fetchSignInMethodsForEmail
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, getDocFromServer } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { toast } from "sonner";

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
                setPurchasedCourseIds(data.purchasedCourseIds || []);
                setPurchases(data.purchases || {});
                setBranch(data.branch);
                setYear(data.year);
                setHasSeenWelcomeModal(data.hasSeenWelcomeModal || false);
            }
        } catch (error) {
            console.error("Error refreshing user data:", error);
        }
    };

    useEffect(() => {
        let unsubscribe: () => void;

        const initializeAuth = async () => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                try {
                    // On mobile, check for redirect result FIRST before listening to auth state
                    const result = await getRedirectResult(auth);
                    if (result) {
                        console.log("[Auth] Redirect login successful:", result.user.uid);
                    }
                } catch (error: any) {
                    console.error("Error confirming redirect login", error);
                    if (error.code !== 'auth/popup-closed-by-user') {
                        toast.error("Login failed: " + error.message);
                    }
                }
            }

            // Now listen to auth state changes
            unsubscribe = onAuthStateChanged(auth, async (user) => {
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
                            setPurchasedCourseIds(data.purchasedCourseIds || []);
                            setPurchases(data.purchases || {});
                            setBranch(data.branch);
                            setYear(data.year);
                            setHasSeenWelcomeModal(data.hasSeenWelcomeModal || false);
                        } else {
                            // Create user doc if it doesn't exist
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
                    setHasSeenWelcomeModal(false);
                    setProgress({});
                }
                setLoading(false);
            });
        };

        initializeAuth();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const login = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        // Ensure persistence is set to LOCAL to allow redirects to work across page loads
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch (err) {
            console.error("Persistence error:", err);
        }

        // Detect Mobile Device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            console.log("[Auth] Starting mobile redirect login...");
            await signInWithRedirect(auth, provider);
        } else {
            console.log("[Auth] Starting desktop popup login...");
            await signInWithPopup(auth, provider);
        }
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
        <AuthContext.Provider value={{ user, loading, isAdmin, purchasedCourseIds, branch, year, hasSeenWelcomeModal, progress, login, logout, purchaseCourse, updateProfile, markWelcomeModalAsSeen, checkAccess, purchases, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
