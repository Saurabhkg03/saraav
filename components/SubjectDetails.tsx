"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle, ShoppingCart, Loader2, AlertCircle, Lock } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SubjectMetadata } from "@/lib/types";
import { SyllabusView } from "@/components/SyllabusView";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { PaymentButton } from "@/components/PaymentButton";
import { useSubjects } from "@/hooks/useSubjects";

interface SubjectDetailsProps {
    subjectId: string;
}

export default function SubjectDetails({ subjectId }: SubjectDetailsProps) {
    const { user, purchasedCourseIds } = useAuth();
    const { settings, loading: settingsLoading } = useSettings() as any;
    const { subjects, loading: subjectsLoading } = useSubjects();

    const [metadata, setMetadata] = useState<SubjectMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isPurchased = purchasedCourseIds.includes(subjectId);

    // Calculate bundle course IDs (All subjects in same branch & semester)
    const bundleCourseIds = metadata && !subjectsLoading
        ? subjects
            .filter(s => s.branch === metadata.branch && s.semester === metadata.semester)
            .map(s => s.id)
        : [];

    useEffect(() => {
        const fetchSubjectData = async () => {
            try {
                const metaSnap = await getDoc(doc(db, "subjects", subjectId));
                if (metaSnap.exists()) {
                    setMetadata({ id: metaSnap.id, ...metaSnap.data() } as SubjectMetadata);
                } else {
                    setError("Course not found");
                }
            } catch (err) {
                console.error("Error fetching subject:", err);
                setError("Failed to load course data");
            } finally {
                setLoading(false);
            }
        };

        fetchSubjectData();
    }, [subjectId]);

    if (loading || subjectsLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 flex items-center gap-2">
                    <div className="h-4 w-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>

                <div className="grid gap-12 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                            <div className="mt-4 space-y-2">
                                <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        </div>

                        <div className="lg:hidden">
                            <div className="h-64 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                        </div>

                        <div>
                            <div className="mb-6 h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="mb-8 h-24 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:col-span-1 lg:block">
                        <div className="sticky top-24 h-96 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metadata) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Error Loading Course</h2>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">{error || "Course not found"}</p>
                <Link href="/marketplace" className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                    Back to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Link
                href="/marketplace"
                className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Marketplace
            </Link>

            <div className="grid gap-12 lg:grid-cols-3">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{metadata.title}</h1>
                        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
                            Comprehensive study material for {metadata.title}. Includes detailed syllabus coverage, practice questions, and solutions.
                        </p>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            {metadata.unitCount} Units
                        </span>
                        <span className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            {metadata.questionCount} Questions
                        </span>
                    </div>

                    {/* Mobile Purchase Card */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
                        <div className="mb-6">
                            {!settingsLoading && settings.isPaymentEnabled ? (
                                metadata.price !== undefined ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                            ₹{metadata.price}
                                        </span>
                                        {metadata.originalPrice && metadata.originalPrice > metadata.price && (
                                            <>
                                                <span className="text-sm text-zinc-500 line-through dark:text-zinc-400">
                                                    ₹{metadata.originalPrice}
                                                </span>
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    {Math.round(((metadata.originalPrice - metadata.price) / metadata.originalPrice) * 100)}% OFF
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Free</span>
                                )
                            ) : (
                                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Free Enrollment</span>
                            )}
                        </div>

                        {isPurchased ? (
                            <Link
                                href={`/study/${subjectId}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-700"
                            >
                                <BookOpen className="h-5 w-5" />
                                Go to Course
                            </Link>
                        ) : (
                            <PaymentButton
                                courseId={subjectId}
                                courseIds={bundleCourseIds}
                                amount={metadata.price || 0}
                                courseName={metadata.title}
                            />
                        )}

                        <div className="mt-6 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Valid for {settings.courseDurationMonths || 5} months</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Access on mobile and desktop</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Certificate of completion</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Course Content</h2>

                        {/* Locked Content Preview */}
                        <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100">
                                <Lock className="h-5 w-5 text-zinc-400" />
                                <span className="font-semibold">Practice Questions & Solutions</span>
                                <span className="ml-auto rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Locked</span>
                            </div>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                Purchase this course to unlock {metadata.questionCount} practice questions with detailed expert solutions.
                            </p>
                        </div>

                        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Syllabus Preview</h3>
                        <SyllabusView units={metadata.units} />
                    </div>
                </div>

                {/* Right Column: Purchase Card (Desktop Only) */}
                <div className="hidden lg:col-span-1 lg:block">
                    <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mb-6">
                            {!settingsLoading && settings.isPaymentEnabled ? (
                                metadata.price !== undefined ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                            ₹{metadata.price}
                                        </span>
                                        {metadata.originalPrice && metadata.originalPrice > metadata.price && (
                                            <>
                                                <span className="text-sm text-zinc-500 line-through dark:text-zinc-400">
                                                    ₹{metadata.originalPrice}
                                                </span>
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    {Math.round(((metadata.originalPrice - metadata.price) / metadata.originalPrice) * 100)}% OFF
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Free</span>
                                )
                            ) : (
                                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Free Enrollment</span>
                            )}
                        </div>

                        {isPurchased ? (
                            <Link
                                href={`/study/${subjectId}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-700"
                            >
                                <BookOpen className="h-5 w-5" />
                                Go to Course
                            </Link>
                        ) : (
                            <PaymentButton
                                courseId={subjectId}
                                courseIds={bundleCourseIds}
                                amount={metadata.price || 0}
                                courseName={metadata.title}
                            />
                        )}

                        <div className="mt-6 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Valid for {settings.courseDurationMonths || 5} months</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Access on mobile and desktop</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Certificate of completion</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
