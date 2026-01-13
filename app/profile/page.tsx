"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Save, Loader2, LogOut, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { BRANCHES, YEARS } from '@/lib/constants';

export default function ProfilePage() {
    const { user, loading: authLoading, logout, updateProfile, branch: authBranch, year: authYear } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Sync from AuthContext when available
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
        }
        if (authBranch) setBranch(authBranch);
        if (authYear) setYear(authYear);
    }, [user, authBranch, authYear]);

    const handleSave = async () => {
        if (!user) return;

        setSaving(true);
        setMessage(null);

        try {
            await setDoc(doc(db, "users", user.uid), {
                displayName,
                email: user.email,
                photoURL: user.photoURL,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Update Context & Separate Fields
            await updateProfile({ branch, year });

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error("Failed to logout", error);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        try {
            // 1. Delete user data from Firestore
            await deleteDoc(doc(db, "users", user.uid));

            // 2. Delete user from Firebase Auth
            await deleteUser(user);

            // 3. Redirect to home
            router.push('/');
        } catch (error: any) {
            console.error("Error deleting account:", error);

            // Handle requires-recent-login error
            if (error.code === 'auth/requires-recent-login') {
                try {
                    const provider = new GoogleAuthProvider();
                    await reauthenticateWithPopup(user, provider);
                    // Retry deletion after re-auth
                    await deleteDoc(doc(db, "users", user.uid));
                    await deleteUser(user);
                    router.push('/');
                } catch (reAuthError) {
                    console.error("Re-auth failed:", reAuthError);
                    throw new Error("Re-authentication failed. Please log in again and try.');");
                }
            } else {
                throw error;
            }
        }
    };

    if (authLoading) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    if (!user) return null;

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Your Profile</h1>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                    <LogOut className="h-4 w-4" />
                    Log Out
                </button>
            </div>

            <div className="space-y-8">
                {/* Profile Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-8 flex flex-col items-center sm:flex-row sm:items-start sm:gap-6">
                        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 sm:mb-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <User className="h-12 w-12" />
                            )}
                        </div>

                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{displayName || "User"}</h2>
                            <p className="text-zinc-500 dark:text-zinc-400">{user.email}</p>
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <Mail className="h-3 w-3" />
                                {user.email}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Display Name
                            </label>
                            <input
                                type="text"
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="branch" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Branch
                                </label>
                                <div className="relative">
                                    <select
                                        id="branch"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                        className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    >
                                        <option value="">Select Branch</option>
                                        {BRANCHES.map((b) => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="year" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Year
                                </label>
                                <div className="relative">
                                    <select
                                        id="year"
                                        value={year}
                                        onChange={(e) => setYear(e.target.value)}
                                        className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    >
                                        <option value="">Select Year</option>
                                        {YEARS.map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {message && (
                            <div className={`rounded-lg p-3 text-sm ${message.type === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </h3>
                    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                        Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 dark:bg-red-950 dark:text-red-400 dark:ring-red-900 dark:hover:bg-red-900/50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Support & Policies (Moved from Footer for Mobile) */}
            <div className="mt-8 space-y-6 lg:hidden">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                        Support & Policies
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Legal</h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="/policies/terms" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        Terms & Conditions
                                    </a>
                                </li>
                                <li>
                                    <a href="/policies/privacy" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        Privacy Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="/policies/refund" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        Refund Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="/policies/shipping" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        Shipping Policy
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Help</h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="/policies/contact" className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        Contact Us
                                    </a>
                                </li>
                                <li>
                                    <button
                                        onClick={() => window.location.href = 'mailto:support@saraav.in'}
                                        className="text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 text-left"
                                    >
                                        Email Support
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </div>
    );
}
