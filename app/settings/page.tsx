"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { BRANCHES, YEARS } from '@/lib/constants';
import Link from 'next/link';

export default function SettingsPage() {
    const { user, loading: authLoading, updateProfile, branch: authBranch, year: authYear } = useAuth();
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
                    throw new Error("Re-authentication failed. Please log in again and try.");
                }
            } else {
                throw error;
            }
        }
    };

    if (authLoading || !user) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <Link
                href="/profile"
                className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
            </Link>

            <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>

            <div className="space-y-8">
                {/* Edit Profile */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit Profile</h2>

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

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </div>
    );
}
