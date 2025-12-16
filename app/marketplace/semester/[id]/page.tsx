"use client";

import { useSubjects } from "@/hooks/useSubjects";
import { useAuth } from "@/context/AuthContext";
import { PaymentButton } from "@/components/PaymentButton";
import { SubjectCard } from "@/components/SubjectCard";
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useSettings } from "@/hooks/useSettings";

export default function SemesterBundlePage() {
    const params = useParams();
    const router = useRouter();
    const { subjects, loading } = useSubjects();
    const { user, purchasedCourseIds } = useAuth();
    const { settings } = useSettings() as any; // distinct hook call, temporary cast if needed based on previous context
    const [viewingCategory, setViewingCategory] = useState<string | null>(null);

    // Decode ID: "Branch-Semester"
    const bundleId = decodeURIComponent(params.id as string);
    const [branch, semester] = bundleId.split('-');

    const bundleSubjects = useMemo(() => {
        if (!branch || !semester) return [];
        return subjects.filter(s =>
            (s.branch === branch || (!s.branch && branch === "General")) &&
            (s.semester === semester || (!s.semester && semester === "All Semesters"))
        );
    }, [subjects, branch, semester]);

    const totalPrice = bundleSubjects.reduce((sum, s) => sum + (s.price || 0), 0);
    const totalOriginalPrice = bundleSubjects.reduce((sum, s) => sum + (s.originalPrice || s.price || 0), 0);
    const courseIds = bundleSubjects.map(s => s.id);

    // Check if user already owns ALL courses in this bundle
    const isFullyOwned = courseIds.length > 0 && courseIds.every(id => purchasedCourseIds.includes(id));

    // Calculate price only for unowned courses
    const unownedSubjects = bundleSubjects.filter(s => !purchasedCourseIds.includes(s.id));
    const bundlePrice = unownedSubjects.reduce((sum, s) => sum + (s.price || 0), 0);
    const bundleOriginalPrice = unownedSubjects.reduce((sum, s) => sum + (s.originalPrice || s.price || 0), 0);
    const unownedCourseIds = unownedSubjects.map(s => s.id);

    // Previous implementation returned early here
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black">
                <div className="mx-auto max-w-7xl">
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                </div>
            </div>
        );
    }

    if (!branch || !semester || bundleSubjects.length === 0) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-black">
                <AlertCircle className="mb-4 h-12 w-12 text-zinc-400" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bundle Not Found</h1>
                <p className="mt-2 text-zinc-500">The requested semester bundle does not exist.</p>
                <Link href="/marketplace" className="mt-6 text-indigo-600 hover:underline">
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black">
            <div className="mx-auto max-w-7xl">
                <Link
                    href="/marketplace"
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Bundles
                </Link>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left: Subject List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                {semester}
                            </h1>
                            <p className="text-lg text-zinc-500 dark:text-zinc-400">
                                {branch}
                            </p>
                        </div>

                        {/* Breadcrumb for Elective Folder */}
                        {viewingCategory && (
                            <button
                                onClick={() => setViewingCategory(null)}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to All Subjects
                            </button>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* View: Specific Elective Folder */}
                            {viewingCategory ? (
                                bundleSubjects
                                    .filter(s => s.isElective && s.electiveCategory === viewingCategory)
                                    .map(subject => (
                                        <SubjectCard
                                            key={subject.id}
                                            subject={subject}
                                            href={`/marketplace/${subject.id}`}
                                            actionLabel="View Details"
                                        />
                                    ))
                            ) : (
                                /* View: Top Level (Core + Folders) */
                                <>
                                    {/* 1. Core Subjects */}
                                    {bundleSubjects.filter(s => !s.isElective).map(subject => (
                                        <SubjectCard
                                            key={subject.id}
                                            subject={subject}
                                            href={`/marketplace/${subject.id}`}
                                            actionLabel="View Details"
                                        />
                                    ))}

                                    {/* 2. Elective Folders */}
                                    {Array.from(new Set(
                                        bundleSubjects
                                            .filter(s => s.isElective && s.electiveCategory)
                                            .map(s => s.electiveCategory)
                                    )).map(category => (
                                        <div
                                            key={category}
                                            onClick={() => setViewingCategory(category as string)}
                                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50 transition-all hover:border-indigo-500 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                                        >
                                            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                                                <div className="mb-4 rounded-full bg-indigo-100 p-4 dark:bg-indigo-900/30">
                                                    <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                    {category}
                                                </h3>
                                                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {bundleSubjects.filter(s => s.electiveCategory === category).length} Options
                                                </p>
                                            </div>
                                            <div className="flex w-full items-center justify-center border-t border-zinc-200 bg-white py-3 text-sm font-medium text-indigo-600 transition-colors group-hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-indigo-400 dark:group-hover:bg-zinc-800">
                                                View Electives
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Summary & Checkout */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Bundle Summary
                            </h2>

                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">Validity</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{settings?.courseDurationMonths || 5} Months</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">Total Subjects</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{bundleSubjects.length}</span>
                                </div>

                                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">Total Price</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg text-zinc-400 line-through">₹{bundleOriginalPrice}</span>
                                            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">₹{bundlePrice}</span>
                                        </div>
                                    </div>
                                    {unownedSubjects.length < bundleSubjects.length && (
                                        <p className="mt-1 text-xs text-zinc-500 text-right">
                                            (Adjusted for owned courses)
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8">
                                {isFullyOwned ? (
                                    <button
                                        disabled
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-100 px-8 py-4 text-base font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                        Bundle Owned
                                    </button>
                                ) : (
                                    <PaymentButton
                                        courseIds={unownedCourseIds}
                                        amount={bundlePrice}
                                        courseName={`${branch} - ${semester} Bundle`}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
