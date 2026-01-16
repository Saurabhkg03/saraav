"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, LogOut, Settings, GraduationCap, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ProfilePage() {
    const { user, loading: authLoading, logout, branch, year } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error("Failed to logout", error);
        }
    };

    if (authLoading || !user) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">My Profile</h1>
                <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </Link>
            </div>

            <div className="space-y-8">
                {/* Profile Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-zinc-100 p-1 ring-4 ring-white dark:bg-zinc-800 dark:ring-zinc-900">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <User className="h-16 w-16 text-zinc-400" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{user.displayName || "User"}</h2>
                            <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                                <Mail className="h-4 w-4" />
                                <span>{user.email}</span>
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                            <div className="flex flex-col items-center gap-1 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                <GraduationCap className="mb-2 h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Branch</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{branch || "Not Set"}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                <Calendar className="mb-2 h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Year</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{year || "Not Set"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support & Policies Links */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Support & Policies
                    </h3>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        <div className="space-y-4">
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Legal</h4>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <Link href="/policies/terms" className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        <span>Terms & Conditions</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/policies/privacy" className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        <span>Privacy Policy</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/policies/refund" className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        <span>Refund Policy</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/policies/shipping" className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        <span>Shipping Policy</span>
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Help</h4>
                            <ul className="space-y-3 text-sm">
                                <li>
                                    <Link href="/policies/contact" className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                        <span>Contact Us</span>
                                    </Link>
                                </li>
                                <li>
                                    <a
                                        href="mailto:support@saraav.in"
                                        className="flex items-center justify-between text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
                                    >
                                        <span>Email Support</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Logout Button (Full Width) */}
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-4 text-base font-medium text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                    <LogOut className="h-5 w-5" />
                    Log Out
                </button>

                <div className="text-center text-xs text-zinc-400 dark:text-zinc-600">
                    Version 1.2.0 • Saraav Education
                </div>
            </div>
        </div>
    );
}
