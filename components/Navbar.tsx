"use client";

import { useState } from 'react';
import Link from 'next/link';
import { User, Sparkles, LogIn, Shield, LayoutDashboard, Menu, X, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { OnboardingModal } from '@/components/OnboardingModal';
import { NotificationDropdown } from '@/components/NotificationDropdown';

const BRANCHES = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Telecommunication",
    "Mechanical Engineering",
    "Electrical Engineering"
];

const YEARS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year"
];

export function Navbar() {
    const { user, loading, isAdmin, branch, year, updateProfile } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

    const handleBranchChange = async (newBranch: string) => {
        await updateProfile({ branch: newBranch });
        setIsBranchMenuOpen(false);
    };

    const handleYearChange = async (newYear: string) => {
        await updateProfile({ year: newYear });
        setIsBranchMenuOpen(false);
    };

    return (
        <>
            <OnboardingModal />
            <nav className="fixed top-0 z-50 w-full border-b border-zinc-100 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                            <Logo />
                        </Link>

                        {/* Branch/Year Selector (Desktop) */}
                        {!loading && user && branch && year && (
                            <div className="hidden md:relative md:block">
                                <button
                                    onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Current View</span>
                                        <span className="font-semibold">{branch.split(' ')[0]} • {year}</span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                </button>

                                {isBranchMenuOpen && (
                                    <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Branch</label>
                                                <div className="space-y-1">
                                                    {BRANCHES.map((b) => (
                                                        <button
                                                            key={b}
                                                            onClick={() => handleBranchChange(b)}
                                                            className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${branch === b ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-xs font-medium text-zinc-500">Year</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {YEARS.map((y) => (
                                                        <button
                                                            key={y}
                                                            onClick={() => handleYearChange(y)}
                                                            className={`rounded-md px-2 py-1.5 text-center text-sm ${year === y ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}
                                                        >
                                                            {y}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                                <Shield className="h-4 w-4" />
                                <span>Admin</span>
                            </Link>
                        )}

                        <Link
                            href="/courses"
                            className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors dark:text-zinc-400 dark:hover:text-indigo-400"
                        >
                            <BookOpen className="h-4 w-4" />
                            <span>My Courses</span>
                        </Link>

                        <Link
                            href="/marketplace"
                            className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm font-medium text-white dark:text-black shadow-sm transition-all hover:shadow-md hover:opacity-90"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            <span>Browse Courses</span>
                        </Link>

                        <NotificationDropdown />

                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

                        <ThemeToggle />

                        {!loading && (
                            user ? (
                                <Link href="/profile" className="rounded-full bg-zinc-50 p-1 ring-2 ring-zinc-100 transition-all hover:ring-indigo-100 dark:bg-zinc-800 dark:ring-zinc-800 dark:hover:ring-indigo-900">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || "User"} className="h-8 w-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                            <User className="h-4 w-4" />
                                        </div>
                                    )}
                                </Link>
                            ) : (
                                <Link href="/login" className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors">
                                    <LogIn className="h-4 w-4" />
                                    <span>Login</span>
                                </Link>
                            )
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center gap-3 md:hidden">
                        <NotificationDropdown />
                        <ThemeToggle />
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="border-t border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
                        <div className="flex flex-col space-y-4">
                            {!loading && user && (
                                <Link
                                    href="/profile"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm active:scale-95 transition-all dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName || "User"} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900" />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                            <User className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{user.displayName || "User"}</p>
                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                    </div>
                                    <div className="rounded-full bg-zinc-100 p-1 text-zinc-400 dark:bg-zinc-800">
                                        <ChevronDown className="-rotate-90 h-4 w-4" />
                                    </div>
                                </Link>
                            )}

                            {/* Mobile Branch Selector */}
                            {!loading && user && branch && year && (
                                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                    <p className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Current View</p>
                                    <div className="space-y-2">
                                        <select
                                            value={branch}
                                            onChange={(e) => handleBranchChange(e.target.value)}
                                            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                                        >
                                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        <select
                                            value={year}
                                            onChange={(e) => handleYearChange(e.target.value)}
                                            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                                        >
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <Link
                                href="/courses"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-indigo-400"
                            >
                                <BookOpen className="h-4 w-4" />
                                My Courses
                            </Link>

                            <Link
                                href="/marketplace"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-medium text-white dark:text-black shadow-sm"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Browse Courses
                            </Link>

                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                    <Shield className="h-4 w-4" />
                                    Admin
                                </Link>
                            )}


                            {!loading && !user && (
                                <Link
                                    href="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
