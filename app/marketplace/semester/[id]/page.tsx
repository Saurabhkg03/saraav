"use client";

// import { useSubjects } from "@/hooks/useSubjects"; // REMOVED
import { useAuth } from "@/context/AuthContext";
import { PaymentButton } from "@/components/PaymentButton";
import { SubjectCard } from "@/components/SubjectCard";
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import { useSettings } from "@/hooks/useSettings";

import { cn } from "@/lib/utils";

import { SubjectMetadata } from "@/lib/types";

interface BundleData {
    branch: string;
    semester: string;
    subjects: SubjectMetadata[];
}

export default function SemesterBundlePage() {
    const params = useParams();
    const router = useRouter();
    // const { subjects, loading } = useSubjects(); // REMOVED
    const [bundleData, setBundleData] = useState<BundleData | null>(null);
    const [loading, setLoading] = useState(true);
    const { user, purchasedCourseIds } = useAuth();
    const { settings } = useSettings() as any; // distinct hook call, temporary cast if needed based on previous context
    const [viewingCategory, setViewingCategory] = useState<string | null>(null);

    // Decode ID: "Branch-Semester"
    const bundleId = decodeURIComponent(params.id as string);
    // const [branch, semester] = bundleId.split('-'); // REMOVED: splitting might be unreliable if id is just the key

    useEffect(() => {
        const fetchBundle = async () => {
            try {
                const { getDoc, doc, getFirestore, collection, query, where, getDocs } = await import("firebase/firestore");
                const db = getFirestore();

                // Special handling for synthetic 1st Year bundles
                if (bundleId === 'FirstYear-GroupA' || bundleId === 'FirstYear-GroupB') {
                    // Fetch all 1st year subjects
                    // We need subjects from Sem 1, Sem 2, or First Year
                    // OR just fetch all and filter client side if the dataset is small (subjects_metadata)
                    // Better: Fetch by 'semester' IN [...] if possible, or multiple queries.
                    // Firestore 'in' query works for 'semester'.

                    const q = query(
                        collection(db, "subjects_metadata"),
                        where('semester', 'in', ['Semester 1', 'Semester 2', 'First Year'])
                    );

                    const snap = await getDocs(q);
                    const allFirstYear = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectMetadata));

                    const targetGroup = bundleId === 'FirstYear-GroupA' ? 'A' : 'B';

                    const validSubjects = allFirstYear.filter(s => s.group === targetGroup || s.isCommon);

                    if (validSubjects.length > 0) {
                        setBundleData({
                            branch: `First Year - Group ${targetGroup}`,
                            semester: 'First Year',
                            subjects: validSubjects
                        });
                        return; // Done
                    }
                }

                // Standard fetch for normal bundles
                const snap = await getDoc(doc(db, "bundles", bundleId));
                if (snap.exists()) {
                    setBundleData(snap.data() as BundleData);
                } else {
                    // Fallback: If bundle doc is missing but subjects exist (Legacy/Migration issue?)
                    // Maybe we can try to reconstruct it? 
                    // For now, if not found and not special, it's not found.
                }
            } catch (e) {
                console.error("Failed to fetch bundle", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBundle();
    }, [bundleId]);

    const bundleSubjects = useMemo(() => {
        return bundleData?.subjects || [];
    }, [bundleData]);

    const branch = bundleData?.branch;
    const semester = bundleData?.semester;

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
        <div className="min-h-screen bg-zinc-50 pb-32 pt-8 dark:bg-black lg:pb-8"> {/* Added pb-32 for mobile footer space */}
            <div className="mx-auto max-w-7xl px-4">
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

                        {/* Mobile Bundle Summary (Top) */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                Bundle Summary
                            </h2>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-zinc-500 dark:text-zinc-400">Validity</p>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{settings?.courseDurationMonths || 5} Months</p>
                                </div>
                                <div>
                                    <p className="text-zinc-500 dark:text-zinc-400">Total Subjects</p>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{bundleSubjects.length}</p>
                                </div>
                            </div>
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
                            {/* View: Specific Elective Folder OR PCC Folder */}
                            {viewingCategory ? (
                                viewingCategory === 'PCC Subjects' ? (
                                    /* 1. View PCC Subjects */
                                    bundleSubjects
                                        .filter(s => s.isCommon)
                                        .map(subject => (
                                            <SubjectCard
                                                key={subject.id}
                                                subject={subject}
                                                href={`/marketplace/${subject.id}`}
                                                actionLabel="View Details"
                                            />
                                        ))
                                ) : (
                                    /* 2. View Specific Elective Category */
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
                                )
                            ) : (
                                /* View: Top Level (Core + Folders) */
                                <>
                                    {/* 1. Core Subjects (Non-Elective, Non-Common) */}
                                    {bundleSubjects.filter(s => !s.isElective && !s.isCommon).map(subject => (
                                        <SubjectCard
                                            key={subject.id}
                                            subject={subject}
                                            href={`/marketplace/${subject.id}`}
                                            actionLabel="View Details"
                                        />
                                    ))}

                                    {/* 2. PCC / Common Folder */}
                                    {bundleSubjects.some(s => s.isCommon) && (
                                        <div
                                            onClick={() => setViewingCategory('PCC Subjects')}
                                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50 transition-all hover:border-indigo-500 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                                        >
                                            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                                                <div className="mb-4 rounded-full bg-indigo-100 p-4 dark:bg-indigo-900/30">
                                                    <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                    PCC Subjects
                                                </h3>
                                                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                                    {bundleSubjects.filter(s => s.isCommon).length} Common Core
                                                </p>
                                            </div>
                                            <div className="flex w-full items-center justify-center border-t border-zinc-200 bg-white py-3 text-sm font-medium text-indigo-600 transition-colors group-hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-indigo-400 dark:group-hover:bg-zinc-800">
                                                View Subjects
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Elective Folders */}
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

                    {/* Right: Summary & Checkout (Desktop Only) */}
                    <div className="hidden lg:col-span-1 lg:block">
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

                                {isFullyOwned ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">Status</span>
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            Owned
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">Total Price</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg text-zinc-400 line-through">₹{bundleOriginalPrice}</span>
                                                <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">₹{bundlePrice}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-8">
                                {isFullyOwned ? (
                                    <Link
                                        href={`/courses?bundle=${encodeURIComponent(`${branch}-${semester}`)}`}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl"
                                    >
                                        <BookOpen className="h-5 w-5" />
                                        Go to Bundle
                                    </Link>
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

            {/* Mobile Sticky Footer */}
            <div className={cn(
                "fixed left-0 right-0 z-50 border-t border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:hidden",
                user ? "bottom-[55px]" : "bottom-0"
            )}>
                <div className="flex items-center justify-between gap-4">
                    {isFullyOwned ? (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">Bundle Owned</span>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Price</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm text-zinc-400 line-through">₹{bundleOriginalPrice}</span>
                                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{bundlePrice}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex-1">
                        {isFullyOwned ? (
                            <Link
                                href={`/courses?bundle=${encodeURIComponent(`${branch}-${semester}`)}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-700"
                            >
                                <BookOpen className="h-4 w-4" />
                                Go to Bundle
                            </Link>
                        ) : (
                            <PaymentButton
                                courseIds={unownedCourseIds}
                                amount={bundlePrice}
                                courseName={`${branch} - ${semester} Bundle`}
                                className="w-full py-3"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
