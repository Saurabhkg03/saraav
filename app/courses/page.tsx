"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { SubjectMetadata } from "@/lib/types";
import { useSubjects } from '@/hooks/useSubjects';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, AlertCircle, PlayCircle, ArrowLeft, Search } from 'lucide-react';
import { cn, getInitials, getColorClass } from '@/lib/utils';
import { QuestionProgress } from '@/lib/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';

function MyCoursesContent() {
    // const { subjects, loading } = useSubjects(); // REMOVED: Fetching all subjects is inefficient
    const [subjects, setSubjects] = useState<SubjectMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const { purchasedCourseIds, user, loading: authLoading, progress, purchases } = useAuth();

    // Track interactions
    const [viewingSemester, setViewingSemester] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Track which folder is open: { semester: "Semester 3", category: "Elective I" }
    const [expandedFolder, setExpandedFolder] = useState<{ semester: string; category: string } | null>(null);

    const searchParams = useSearchParams();
    const bundleParam = searchParams.get('bundle');

    useEffect(() => {
        if (bundleParam) {
            setViewingSemester(bundleParam);
        }
    }, [bundleParam]);

    // Fetch only purchased courses
    useEffect(() => {
        if (authLoading) return;

        const fetchMyCourses = async () => {
            // If no purchases, stop early
            if (!purchasedCourseIds || purchasedCourseIds.length === 0) {
                setSubjects([]);
                setLoading(false);
                return;
            }

            try {
                const { doc, getDoc, getFirestore } = await import("firebase/firestore");
                const db = getFirestore();

                // Fetch in parallel (reading subjects_metadata for details)
                // We use getDoc for each ID to ensure we get exactly what we need
                // Optimization: If list is huge (>20), we should batch, but for now Promise.all is fine for user's course list
                const promises = purchasedCourseIds.map(id => getDoc(doc(db, "subjects_metadata", id)));
                const snapshots = await Promise.all(promises);

                const fetchedSubjects = snapshots
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() })) as unknown as SubjectMetadata[];

                setSubjects(fetchedSubjects);
            } catch (err) {
                console.error("Error fetching my courses:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyCourses();
    }, [purchasedCourseIds, authLoading]);

    const myCourses = useMemo(() => {
        return subjects; // Subjects are already filtered by fetching strategy
    }, [subjects]);

    // Derived State: Sorted Bundles by Latest Purchase
    const sortedBundles = useMemo(() => {
        // First Pass: Group by Standard Key
        const rawGroups = myCourses.reduce((acc, subject) => {
            const branch = subject.branch || 'General';
            const semester = subject.semester || 'Other';

            // Standard Key
            const bundleKey = `${branch}-${semester}`;

            if (!acc[bundleKey]) {
                acc[bundleKey] = {
                    key: bundleKey,
                    branch,
                    semester,
                    subjects: [],
                    lastPurchased: 0
                };
            }
            acc[bundleKey].subjects.push(subject);
            return acc;
        }, {} as Record<string, { key: string; branch: string; semester: string; subjects: SubjectMetadata[]; lastPurchased: number }>);

        // Second Pass: Split First Year if needed
        const processedGroups: typeof rawGroups = {};

        Object.values(rawGroups).forEach(group => {
            // Check if this is the generic First Year bundle
            if (group.branch === 'First Year' || group.semester === 'First Year') {
                const subjectsA = group.subjects.filter(s => s.group === 'A');
                const subjectsB = group.subjects.filter(s => s.group === 'B');
                const subjectsCommon = group.subjects.filter(s => s.isCommon);

                // Heuristic: Create Bundle A if specific A subjects exist, OR if we have only Common subjects (Default to A)
                const shouldCreateA = subjectsA.length > 0 || (subjectsA.length === 0 && subjectsB.length === 0 && subjectsCommon.length > 0);

                // Heuristic: Create Bundle B only if specific B subjects exist
                const shouldCreateB = subjectsB.length > 0;

                if (shouldCreateA) {
                    const keyA = 'FirstYear-GroupA';
                    processedGroups[keyA] = {
                        key: keyA,
                        branch: 'First Year - Group A',
                        semester: 'First Year',
                        subjects: [...subjectsA, ...subjectsCommon],
                        lastPurchased: 0
                    };
                }

                if (shouldCreateB) {
                    const keyB = 'FirstYear-GroupB';
                    processedGroups[keyB] = {
                        key: keyB,
                        branch: 'First Year - Group B',
                        semester: 'First Year',
                        subjects: [...subjectsB, ...subjectsCommon],
                        lastPurchased: 0
                    };
                }
            } else {
                // Pass through other bundles
                processedGroups[group.key] = group;
            }
        });

        // Calculate last purchased time
        Object.values(processedGroups).forEach(group => {
            let maxTime = 0;
            group.subjects.forEach(c => {
                const time = purchases?.[c.id]?.purchaseDate || 0;
                if (time > maxTime) maxTime = time;
            });
            group.lastPurchased = maxTime;
        });

        // Sort
        return Object.entries(processedGroups).sort(([, a], [, b]) => {
            if (a.lastPurchased !== b.lastPurchased) return b.lastPurchased - a.lastPurchased;
            const getNum = (sem: string) => {
                const match = sem.match(/\d+/);
                return match ? parseInt(match[0], 10) : 999;
            };
            return getNum(a.semester) - getNum(b.semester);
        });
    }, [myCourses, purchases]);

    // Derived State: Search Results
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lowerQ = searchQuery.toLowerCase();
        return myCourses.filter(s =>
            s.title.toLowerCase().includes(lowerQ) ||
            (s.branch && s.branch.toLowerCase().includes(lowerQ)) ||
            (s.semester && s.semester.toLowerCase().includes(lowerQ))
        ).sort((a, b) => {
            const timeA = purchases?.[a.id]?.purchaseDate || 0;
            const timeB = purchases?.[b.id]?.purchaseDate || 0;
            return timeB - timeA;
        });
    }, [myCourses, searchQuery, purchases]);

    if (loading || authLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col overflow-hidden rounded-xl bg-white border-2 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                            <div className="h-32 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex-1 p-5 space-y-4">
                                <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center text-center">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Please Log In</h2>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">You need to be logged in to view your courses.</p>
                <Link href="/login" className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
                    Log In
                </Link>
            </div>
        );
    }

    // Reuse Subject Card Component
    const SubjectCard = ({ subject }: { subject: any }) => {
        const subjectProgress = progress?.[subject.id]?.questions || {};
        const solvedCount = (Object.values(subjectProgress) as QuestionProgress[]).filter((p) => p.status !== null).length;
        const totalQuestions = subject.questionCount || 1;
        const progressPercentage = Math.round((solvedCount / totalQuestions) * 100);

        const purchaseData = purchases?.[subject.id];
        const expiryDate = purchaseData?.expiryDate;
        const isExpired = expiryDate ? Date.now() > expiryDate : false;
        const targetLink = isExpired ? `/marketplace/${subject.id}` : `/study/${subject.id}`;

        return (
            <Link
                key={subject.id}
                href={targetLink}
                className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-white transition-all hover:shadow-md dark:border dark:border-zinc-800 dark:bg-zinc-900",
                    isExpired ? "opacity-75 grayscale hover:grayscale-0 hover:opacity-100" : ""
                )}
            >
                <div className={cn(
                    "flex h-32 items-center justify-center bg-gradient-to-br text-3xl font-bold text-white relative",
                    getColorClass(subject.title)
                )}>
                    {getInitials(subject.title)}
                    {isExpired && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700 shadow-sm border border-red-200">
                                Expired
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {subject.title}
                    </h3>
                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                        <span>{subject.unitCount} Units</span>
                        <span className={cn(
                            "flex items-center gap-1",
                            isExpired ? "text-red-600 dark:text-red-400 font-medium" : "text-indigo-600 dark:text-indigo-400"
                        )}>
                            {isExpired ? (
                                <>
                                    <AlertCircle className="h-4 w-4" />
                                    Renew
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="h-4 w-4" />
                                    Continue
                                </>
                            )}
                        </span>
                    </div>

                    <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            <span>Progress</span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    isExpired ? "bg-zinc-400" : "bg-indigo-600"
                                )}
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">My Courses</h1>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">Continue where you left off.</p>
                </div>

                {/* Search Input */}
                {myCourses.length > 0 && (
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search your courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                        />
                    </div>
                )}
            </div>

            {/* Navigation: Back Buttons */}
            {!searchQuery && (
                <>
                    {expandedFolder ? (
                        <button
                            onClick={() => setExpandedFolder(null)}
                            className="mb-6 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to {expandedFolder.semester}
                        </button>
                    ) : viewingSemester ? (
                        <button
                            onClick={() => setViewingSemester(null)}
                            className="mb-6 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to All Semesters
                        </button>
                    ) : null}
                </>
            )}

            {myCourses.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="No courses yet"
                    description="You haven't enrolled in any courses yet. Visit the marketplace to get started."
                    actionLabel="Browse Marketplace"
                    actionHref="/marketplace"
                />
            ) : searchQuery ? (
                // VIEW: Search Results (Flat Grid)
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Search Results ({searchResults.length})
                        </h2>
                        <button
                            onClick={() => setSearchQuery("")}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Clear Search
                        </button>
                    </div>

                    {searchResults.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-zinc-500 dark:text-zinc-400">No matching subjects found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {searchResults.map(subject => (
                                <SubjectCard key={subject.id} subject={subject} />
                            ))}
                        </div>
                    )}
                </div>
            ) : !viewingSemester ? (
                // VIEW 1: All Bundles (Branches) - Sorted by Latest Purchase
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedBundles.map(([bundleId, bundleData]) => {
                        const { branch, semester, subjects } = bundleData;
                        const subjectCount = subjects.length;

                        return (
                            <div
                                key={bundleId}
                                onClick={() => setViewingSemester(bundleId)} // Using bundleId as key now
                                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-zinc-300 bg-white transition-all hover:shadow-lg dark:border dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className={cn(
                                    "flex min-h-[9rem] flex-col items-center justify-center bg-gradient-to-br p-4 text-center",
                                    getColorClass(branch)
                                )}>
                                    <p className="mb-1 text-sm font-medium text-white opacity-90">
                                        {semester}
                                    </p>
                                    <h3 className="text-xl font-bold text-white line-clamp-3">
                                        {branch}
                                    </h3>
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {semester} Bundle
                                        </p>
                                        <h4 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                            {branch}
                                        </h4>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{subjectCount} Subjects</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full dark:bg-green-900/20 dark:text-green-400">
                                                Owned
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // VIEW 2: Specific Bundle (Core + Elective Folders + PCC Folders)
                <div className="space-y-12">
                    {/* Header for the open bundle */}
                    {(() => {
                        const bundleData = sortedBundles.find(([k]) => k === viewingSemester)?.[1];
                        if (!bundleData) return null;

                        return (
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                {bundleData.branch} - {bundleData.semester}
                            </h2>
                        );
                    })()}

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {(() => {
                            // viewingSemester is now the bundleId (e.g. "CSE-Sem3")
                            const bundleData = sortedBundles.find(([k]) => k === viewingSemester)?.[1];
                            if (!bundleData) return <div>Bundle not found</div>;

                            const semesterCourses = bundleData.subjects;
                            const activeCategory = expandedFolder?.semester === viewingSemester ? expandedFolder.category : null;

                            // 1. Collect Categories
                            const electiveCategories = Array.from(new Set(
                                semesterCourses
                                    .filter(s => s.isElective && s.electiveCategory)
                                    .map(s => s.electiveCategory)
                            ));

                            // 2. Check for PCC Subjects
                            const hasPCC = semesterCourses.some(s => s.isCommon);
                            if (hasPCC) {
                                // Add "PCC Subjects" pseudo-category if not already there
                                // We treat "PCC Subjects" as a category key
                            }

                            // 3. Filter displayed courses (Inside a folder or Root)
                            let displayedCourses: SubjectMetadata[] = [];

                            if (activeCategory === 'PCC Subjects') {
                                displayedCourses = semesterCourses.filter(s => s.isCommon);
                            } else if (activeCategory) {
                                displayedCourses = semesterCourses.filter(s => s.isElective && s.electiveCategory === activeCategory);
                            } else {
                                // Root View: Show only Core (Non-Elective AND Non-Common)
                                displayedCourses = semesterCourses.filter(s => !s.isElective && !s.isCommon);
                            }

                            return (
                                <>
                                    {/* Folders (Only show in Root View i.e. no activeCategory) */}
                                    {!activeCategory && (
                                        <>
                                            {/* Elective Folders */}
                                            {electiveCategories.map((category) => (
                                                <div
                                                    key={category}
                                                    onClick={() => setExpandedFolder({ semester: viewingSemester, category: category as string })}
                                                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-zinc-50 transition-all hover:border-indigo-500 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                                                >
                                                    <div className="flex h-32 items-center justify-center bg-indigo-100 dark:bg-zinc-800">
                                                        <BookOpen className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-1 flex-col p-5">
                                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {category}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {semesterCourses.filter(s => s.electiveCategory === category).length} Subjects
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* PCC Folder */}
                                            {hasPCC && (
                                                <div
                                                    onClick={() => setExpandedFolder({ semester: viewingSemester, category: 'PCC Subjects' })}
                                                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-zinc-300 bg-zinc-50 transition-all hover:border-indigo-500 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                                                >
                                                    <div className="flex h-32 items-center justify-center bg-indigo-100 dark:bg-zinc-800">
                                                        <BookOpen className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                    <div className="flex flex-1 flex-col p-5">
                                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                                            PCC Subjects
                                                        </h3>
                                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                            {semesterCourses.filter(s => s.isCommon).length} Subjects
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Subject Cards */}
                                    {displayedCourses
                                        .sort((a, b) => {
                                            const timeA = purchases?.[a.id]?.purchaseDate || 0;
                                            const timeB = purchases?.[b.id]?.purchaseDate || 0;
                                            return timeB - timeA;
                                        })
                                        .map((subject) => (
                                            <SubjectCard key={subject.id} subject={subject} />
                                        ))}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MyCoursesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-black" />}>
            <MyCoursesContent />
        </Suspense>
    );
}
