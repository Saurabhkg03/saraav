"use client";

import { useAuth } from "@/context/AuthContext";
import { AlertCircle, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SubjectMetadata } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";

interface MarketplaceContentProps {
    initialSubjects: SubjectMetadata[];
}

export function MarketplaceContent({ initialSubjects }: MarketplaceContentProps) {
    const { branch: userBranch, year: userYear } = useAuth();
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedSemester, setSelectedSemester] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Group subjects by Branch + Semester
    const semesterBundles = useMemo(() => {
        const groups: Record<string, {
            id: string;
            branch: string;
            semester: string;
            subjects: any[];
            totalPrice: number;
            totalOriginalPrice: number;
            subjectCount: number;
        }> = {};

        initialSubjects.forEach(subject => {
            // Fallback for missing data
            const branch = subject.branch || "General";
            const semester = subject.semester || "All Semesters";

            // Filter Logic
            if (selectedBranch && branch !== selectedBranch) return;
            if (selectedSemester && semester !== selectedSemester) return;
            if (searchQuery) {
                const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

                // Add common acronyms for better search experience
                let acronyms = "";
                const b = branch.toLowerCase();
                if (b.includes("computer")) acronyms = "cse cs";
                else if (b.includes("information")) acronyms = "it";
                else if (b.includes("electronics")) acronyms = "entc extc";
                else if (b.includes("mechanical")) acronyms = "mech";

                const searchableText = `${subject.title} ${branch} ${semester} ${acronyms}`.toLowerCase();

                // Check if ALL search terms are present in the text (Order independent)
                if (!queryTerms.every(term => searchableText.includes(term))) return;
            }

            const key = `${branch}-${semester}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    branch,
                    semester,
                    subjects: [],
                    totalPrice: 0,
                    totalOriginalPrice: 0,
                    subjectCount: 0
                };
            }

            groups[key].subjects.push(subject);
            groups[key].totalPrice += subject.price || 0;
            groups[key].totalOriginalPrice += subject.originalPrice || subject.price || 0;
            groups[key].subjectCount++;
        });

        return Object.values(groups).sort((a, b) => {
            // Sort by Branch first
            if (a.branch !== b.branch) {
                return a.branch.localeCompare(b.branch);
            }

            // Then by Semester (extract number)
            const semA = parseInt(a.semester.replace(/\D/g, '')) || 0;
            const semB = parseInt(b.semester.replace(/\D/g, '')) || 0;

            return semA - semB;
        });
    }, [initialSubjects, selectedBranch, selectedSemester, searchQuery]);

    return (
        <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                Semester Bundles
                            </h1>
                            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                                Select your semester to view available courses.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search by subject, branch, or semester..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                                />
                            </div>

                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                                <option value="">All Branches</option>
                                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                                <option value="Information Technology">Information Technology</option>
                                <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                            </select>

                            <select
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
                                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                            >
                                <option value="">All Semesters</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                    <option key={sem} value={`Semester ${sem}`}>
                                        Semester {sem}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {semesterBundles.length === 0 ? (
                    <EmptyState
                        icon={AlertCircle}
                        title="No bundles found"
                        description="We couldn't find any semester bundles matching your filters at the moment."
                        actionLabel="Clear Filters"
                        onAction={() => {
                            setSelectedBranch("");
                            setSelectedSemester("");
                            setSearchQuery("");
                        }}
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {semesterBundles.map((bundle) => (
                            <Link
                                key={bundle.id}
                                href={`/marketplace/semester/${encodeURIComponent(bundle.id)}`}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-300 bg-white transition-all hover:shadow-lg dark:border dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex h-32 flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-center">
                                    <p className="mb-1 text-xs font-medium text-indigo-100 opacity-90">
                                        {bundle.branch}
                                    </p>
                                    <h3 className="text-2xl font-bold text-white">
                                        {bundle.semester}
                                    </h3>
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {bundle.branch}
                                        </p>
                                        <h4 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                            {bundle.semester} Bundle
                                        </h4>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                            <BookOpen className="h-4 w-4" />
                                            <span>{bundle.subjectCount} Subjects</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {bundle.totalOriginalPrice > bundle.totalPrice && (
                                                <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                                                    ₹{bundle.totalOriginalPrice}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                                ₹{bundle.totalPrice}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
