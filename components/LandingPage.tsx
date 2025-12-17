"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Zap, Star, GraduationCap, Users, TrendingUp, Sparkles, ChevronDown, ChevronUp, MousePointer, Filter, Check } from "lucide-react";
import { useSubjects } from "@/hooks/useSubjects";
import { cn, getColorClass, getInitials } from "@/lib/utils";
import { SaleBanner } from "@/components/SaleBanner";

interface LandingPageProps {
    preloadedSubjects?: any[];
}

interface Bundle {
    id: string;
    branch: string;
    semester: string;
    subjects: any[];
    totalPrice: number;
    totalOriginalPrice: number;
    subjectCount: number;
    title: string;
}

export function LandingPage({ preloadedSubjects }: LandingPageProps) {
    // Only use the hook if preloadedSubjects is not provided
    const hookData = useSubjects();
    const subjects = preloadedSubjects || hookData.subjects;

    // Group subjects into bundles
    const allBundlesMap = subjects.reduce((acc: Record<string, Bundle>, subject) => {
        const branch = (subject.branch || "General").trim();
        const semester = subject.semester || "All Semesters";
        const key = `${branch}-${semester}`;

        if (!acc[key]) {
            acc[key] = {
                id: key,
                branch,
                semester,
                subjects: [],
                totalPrice: 0,
                totalOriginalPrice: 0,
                subjectCount: 0,
                title: `${branch} - ${semester}` // Create a title for the bundle
            };
        }

        acc[key].subjects.push(subject);
        acc[key].totalPrice += subject.price || 0;
        acc[key].totalOriginalPrice += subject.originalPrice || subject.price || 0;
        acc[key].subjectCount++;

        return acc;
    }, {} as Record<string, Bundle>);

    const allBundlesList = Object.values(allBundlesMap);

    // Select 3 bundles from different branches to showcase variety
    const featuredBundles: Bundle[] = [];
    const seenBranches = new Set<string>();

    // specific order of preference if available, else standard order
    const preferredBranches = ["Computer Science & Engineering", "Civil Engineering", "Mechanical Engineering", "Electronics & Telecommunication"];

    // Sort bundles to prioritize preferred branches and populated bundles
    allBundlesList.sort((a, b) => {
        const aIndex = preferredBranches.indexOf(a.branch);
        const bIndex = preferredBranches.indexOf(b.branch);
        // If both are in preferred list, sort by index
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        // If only a is in preferred, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // Otherwise sort by subject count (descending)
        return b.subjectCount - a.subjectCount;
    });

    for (const bundle of allBundlesList) {
        if (!seenBranches.has(bundle.branch) && featuredBundles.length < 3) {
            featuredBundles.push(bundle);
            seenBranches.add(bundle.branch);
        }
    }

    // Fallback: If we couldn't find 3 unique branches, just fill with next available bundles until we have 3 (or run out)
    if (featuredBundles.length < 3) {
        for (const bundle of allBundlesList) {
            if (featuredBundles.length >= 3) break;
            if (!featuredBundles.includes(bundle)) {
                featuredBundles.push(bundle);
            }
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-white text-zinc-900 overflow-hidden dark:bg-zinc-950 dark:text-white">
            <SaleBanner />
            {/* Hero Section */}
            <section className="relative px-6 pt-6 pb-10 sm:pt-10 sm:pb-16 lg:px-8">

                {/* Animated Background Gradients */}
                <div className="absolute -left-[10%] -top-[20%] h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" />
                <div className="absolute -right-[10%] top-[10%] h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse delay-1000" />

                <div className="relative mx-auto max-w-4xl text-center z-10">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-700 backdrop-blur-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                        <Star className="h-4 w-4 fill-orange-700 dark:fill-orange-300" />
                        <span>#1 Exam Prep Platform for SGBAU</span>
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent pb-2 dark:from-white dark:via-indigo-200 dark:to-indigo-400">
                        Ace your University Engineering Exams with <RotatingText />
                    </h1>

                    <p className="mt-6 text-lg leading-8 text-zinc-600 max-w-2xl mx-auto dark:text-zinc-400">
                        The smartest way to prepare for SGBAU exams. Master key concepts with <strong>high-frequency PYQs</strong>, <strong>expert text/video explanations</strong> and <strong>smart syllabus tracking</strong> in half the time.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="w-full sm:w-auto rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 hover:scale-105 transition-all duration-200"
                        >
                            Start Learning for Free
                        </Link>
                        <Link
                            href="/marketplace"
                            className="w-full sm:w-auto rounded-xl border border-zinc-200 bg-white/50 px-8 py-4 text-base font-semibold text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 backdrop-blur-sm transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white dark:hover:bg-zinc-800 dark:hover:border-zinc-700"
                        >
                            Explore Courses
                        </Link>
                    </div>


                </div>
            </section>

            {/* Features Bento Grid Section */}
            <section className="relative py-24 bg-zinc-50 dark:bg-zinc-900/30">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Everything You Need</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                            Powerful Features for Peak Performance
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-[270px]">
                        {/* Large Card: Question Bank */}
                        <div className="md:col-span-2 row-span-1 group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 hover:border-indigo-500/30 transition-all duration-300 dark:border-white/5 dark:bg-zinc-900">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:from-indigo-500/10" />
                            <div className="relative h-full flex flex-col md:flex-row md:items-center gap-8 z-10">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                            <Zap className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-xl font-bold">Smart Question Bank</h3>
                                    </div>
                                    <p className="text-zinc-600 max-w-md dark:text-zinc-400">
                                        Don't study blindly. Our questions are sorted by <strong>frequency</strong>—see exactly how many times a question has asked in previous years.
                                    </p>
                                </div>

                                {/* Visual Placeholder for UI */}
                                <div className="w-full md:w-1/2 bg-zinc-50 rounded-xl border border-zinc-100 p-6 md:p-8 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="h-2.5 flex-1 bg-zinc-200 rounded-full dark:bg-zinc-800" />
                                        <span className="shrink-0 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/30">Asked 5 times</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-2.5 flex-1 max-w-[60%] bg-zinc-200 rounded-full dark:bg-zinc-800" />
                                        <span className="shrink-0 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full dark:bg-orange-900/30">Asked 3 times</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tall Card: Solution Card with Tabs */}
                        <SolutionCard />

                        {/* Small Card: Notes & Favorites */}
                        <div className="md:col-span-1 row-span-1 group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 hover:border-indigo-500/30 transition-all duration-300 dark:border-white/5 dark:bg-zinc-900">
                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:from-yellow-500/10" />
                            <div className="relative h-full flex flex-col z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold">Notes & Stars</h3>
                                </div>
                                <p className="text-sm text-zinc-600 mb-4 dark:text-zinc-400">
                                    Mark important questions and attach your own private notes for last-minus revision.
                                </p>
                                <div className="mt-auto w-full bg-zinc-50 rounded-xl border border-zinc-100 p-6 md:p-8 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 flex gap-2">
                                    <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800">
                                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    </div>
                                    <div className="flex-1 p-2 bg-white rounded-lg border border-zinc-200 text-xs text-zinc-500 italic dark:bg-zinc-900 dark:border-zinc-800">
                                        "Revise formula for this..."
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Small Card: Progress Tracking */}
                        <div className="md:col-span-1 row-span-1 group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 hover:border-indigo-500/30 transition-all duration-300 dark:border-white/5 dark:bg-zinc-900">
                            <div className="absolute inset-0 bg-gradient-to-tl from-green-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:from-green-500/10" />
                            <div className="relative h-full flex flex-col z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold">Syllabus Tracker</h3>
                                </div>
                                <p className="text-sm text-zinc-600 mb-4 dark:text-zinc-400">
                                    Visualize completed units and never miss a topic.
                                </p>
                                <div className="mt-auto w-full bg-zinc-50 rounded-xl border border-zinc-100 p-6 md:p-8 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                                    <div className="flex justify-between text-xs font-medium mb-1">
                                        <span>Unit 1</span>
                                        <span className="text-green-600 dark:text-green-400">85%</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 rounded-full h-2 dark:bg-zinc-800">
                                        <div className="bg-green-500 h-2 rounded-full w-[85%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white mb-6">
                                From "Confused" to "Confident" in 3 Steps
                            </h2>
                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">1</div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Choose Your Subject</h3>
                                        <p className="text-zinc-600 dark:text-zinc-400">Select from our library of engineering subjects tailored for your semester.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">2</div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Filter by Frequency</h3>
                                        <p className="text-zinc-600 dark:text-zinc-400">Toggle the "High Frequency" filter to see questions that have appeared 3+ times.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-none flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">3</div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Master & Track</h3>
                                        <p className="text-zinc-600 dark:text-zinc-400">Read the solution, watch the video, and mark it as done. Watch your confidence grow.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Abstract Visual representation of the app interface */}
                        <AnimatedQuestionApp />
                    </div>
                </div>
            </section>

            {/* Course Showcase */}
            <section className="py-24 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-100/40 via-white to-white dark:from-indigo-900/20 dark:via-zinc-950 dark:to-zinc-950" />
                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">Popular Semester Bundles</h2>
                            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
                                Get everything you need for your semester in one package.
                            </p>
                        </div>
                        <Link href="/marketplace" className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center gap-2 group dark:text-indigo-400 dark:hover:text-indigo-300">
                            View all courses <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredBundles.map((bundle, index) => (
                            <Link
                                key={bundle.id}
                                href={`/marketplace/semester/${encodeURIComponent(bundle.id)}`}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 dark:border-white/10 dark:bg-zinc-900"
                            >
                                {/* Popular Badge */}
                                {index === 0 && (
                                    <div className="absolute right-4 top-4 z-10 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-lg">
                                        <Star className="mr-1 inline-block h-3 w-3 fill-current" />
                                        Best Value
                                    </div>
                                )}

                                <div className="relative h-48 overflow-hidden">
                                    <div className={cn(
                                        "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br text-white transition-transform duration-500 group-hover:scale-110 p-4 text-center",
                                        getColorClass(bundle.branch) // Use branch for color
                                    )}>
                                        <span className="text-xs font-medium uppercase tracking-wider opacity-80 mb-1 line-clamp-1 w-full px-2">
                                            {bundle.branch}
                                        </span>
                                        <span className="text-3xl font-bold">
                                            {bundle.semester}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors dark:bg-black/20" />
                                </div>

                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center gap-x-2 text-xs font-medium text-indigo-600 mb-3 dark:text-indigo-400">
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20">
                                            Semester Bundle
                                        </span>
                                        <span className="text-zinc-400 dark:text-zinc-500">•</span>
                                        <span className="text-zinc-500 dark:text-zinc-400">{bundle.branch}</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-zinc-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
                                        {bundle.branch}
                                    </h3>

                                    <p className="text-sm text-zinc-600 line-clamp-2 mb-6 flex-1 dark:text-zinc-400">
                                        Get access to all <strong>{bundle.subjectCount} subjects</strong> for {bundle.semester}. Includes frequency checking, videos, and notes for every subject.
                                    </p>

                                    <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-auto dark:border-white/5">
                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <BookOpen className="h-3.5 w-3.5" />
                                                {bundle.subjectCount} Subjects
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" />
                                                {100 * (index + 2)}+ enrolled
                                            </span>
                                        </div>
                                        {/* Price display if needed, or just view */}
                                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors dark:text-white dark:bg-white/10">
                                            Explore
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>



            {/* Trust Section */}
            <section className="py-20 border-t border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-zinc-900/30">
                <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
                    <p className="text-sm font-medium text-zinc-500 mb-10 uppercase tracking-widest">Trusted by students from top colleges</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                        {/* Logos are normalized with fixed height and object-contain to look consistent */}
                        <img src="/logos/college1.png" alt="GCOEA" className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-110" />
                        <img src="/logos/college2.png" alt="SIPNA" className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-110" />
                        <img src="/logos/college3.png" alt="PRMITR" className="h-16 w-auto object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-300 hover:scale-110" />
                        <img src="/logos/college4.png" alt="HVPM" className="h-16 w-auto object-contain transition-transform duration-300 hover:scale-110" />
                        <img src="/logos/college5.png" alt="Ram Meghe" className="h-16 w-auto object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-300 hover:scale-110" />

                        {/* More indicator */}
                        <div className="text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-wider">
                            + Many More
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative isolate mt-auto px-6 py-24 sm:py-32 lg:px-8 bg-indigo-50 dark:bg-indigo-950/30">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] opacity-50 dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.900),black)]" />
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                        Ready to boost your grades?
                    </h2>
                    <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
                        Join thousands of SGBAU students who are already learning smarter with Saraav.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            href="/login"
                            className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white dark:text-indigo-600 dark:hover:bg-zinc-100 dark:focus-visible:outline-white"
                        >
                            Get Started Now
                        </Link>
                    </div>
                </div>
            </section>

            {/* --- FAQ SECTION --- */}
            <section className="py-24 bg-zinc-50 dark:bg-zinc-900/30">
                <div className="mx-auto max-w-3xl px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-white mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <FaqItem
                            question="Is the content strictly according to SGBAU syllabus?"
                            answer="Yes! We strictly follow the latest Amravati University syllabus. We constantly update our content to ensure you aren't studying outdated topics."
                        />
                        <FaqItem
                            question="How accurate is the Question Frequency?"
                            answer="Our team manually analyzes question papers from the last 5-7 years to categorize questions. If a question is marked 'High Frequency', it means it has appeared repeatedly in recent exams."
                        />
                        <FaqItem
                            question="Can I access Saraav on mobile?"
                            answer="Absolutely. The website is fully responsive and works perfectly on mobile, tablet, and desktop. Study on the bus, in the library, or at home."
                        />
                        <FaqItem
                            question="Are the video solutions created by Saraav?"
                            answer="We curate the best explanation videos available on YouTube for each specific topic/question. We save you the time of searching for the 'right' tutorial."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

// Simple FAQ Component
function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between py-4 text-left text-base font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
                {question}
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", isOpen ? "max-h-48 opacity-100 pb-4" : "max-h-0 opacity-0")}>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

// Animated App Walkthrough Component
function AnimatedQuestionApp() {
    const [filterActive, setFilterActive] = useState(false);
    const [questionSolved, setQuestionSolved] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [cursorPosition, setCursorPosition] = useState({ x: 50, y: 50 }); // Percentages
    const [clickEffect, setClickEffect] = useState(false);

    useEffect(() => {
        const sequence = async () => {
            while (true) {
                // Reset
                setFilterActive(false);
                setShowSolution(false);
                setQuestionSolved(false);
                setCursorPosition({ x: 80, y: 80 }); // Start somewhere neutral
                setClickEffect(false);
                await new Promise(r => setTimeout(r, 1000));

                // Step 1: Move to Filter (Top Right)
                setCursorPosition({ x: 85, y: 15 });
                await new Promise(r => setTimeout(r, 1000));

                // Click Filter
                setClickEffect(true);
                setTimeout(() => setClickEffect(false), 200);
                setFilterActive(true);
                await new Promise(r => setTimeout(r, 1500));

                // Step 2: Show Solution (Bottom Left of text)
                setCursorPosition({ x: 15, y: 60 });
                await new Promise(r => setTimeout(r, 800));

                // Click Solution
                setClickEffect(true);
                setTimeout(() => setClickEffect(false), 200);
                setShowSolution(true);
                await new Promise(r => setTimeout(r, 2000)); // Read solution

                // Step 3: Mark as Done (Left Side)
                setCursorPosition({ x: 8, y: 35 });
                await new Promise(r => setTimeout(r, 800));

                // Click Mark
                setClickEffect(true);
                setTimeout(() => setClickEffect(false), 200);
                setQuestionSolved(true);
                await new Promise(r => setTimeout(r, 3000)); // Show success state
            }
        };
        sequence();
    }, []);

    return (
        <div className="relative rounded-2xl bg-zinc-900 p-2 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden border border-zinc-800">
            {/* Window Controls */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-zinc-950 flex items-center px-4 gap-2 border-b border-zinc-800">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>

            {/* App Content */}
            <div className="mt-8 p-4 h-[350px] bg-zinc-950 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-2 w-24 bg-zinc-800 rounded mb-2" />
                        <h4 className="text-zinc-100 font-bold text-sm">Engineering Mathematics</h4>
                    </div>
                    {/* Filter Toggle */}
                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300",
                            filterActive
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                : "bg-zinc-900 border-zinc-800 text-zinc-500"
                        )}
                    >
                        <Filter className="h-3 w-3" />
                        <span className="text-xs font-medium">High Frequency</span>
                    </div>
                </div>

                {/* Question Card */}
                <div className={cn(
                    "bg-zinc-900 border border-zinc-800 rounded-xl p-5 relative overflow-hidden flex gap-4 transition-all duration-500",
                    questionSolved ? "border-green-500/30" : ""
                )}>
                    {/* Left Action Sidebar */}
                    <div className="flex flex-col gap-2 border-r border-zinc-800 pr-4">
                        <button
                            className={cn(
                                "h-8 w-8 flex items-center justify-center rounded-lg border transition-all duration-500",
                                questionSolved
                                    ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-900/20 scale-110"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-600"
                            )}
                        >
                            <Check className="h-4 w-4" />
                        </button>
                        <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Star className="h-4 w-4 text-zinc-700" />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {/* Tags */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                                Unit 2
                            </span>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold transition-all duration-500",
                                filterActive ? "bg-red-500/20 text-red-400 opacity-100 translate-x-0" : "opacity-0 -translate-x-2 w-0 overflow-hidden px-0"
                            )}>
                                Asked 5 times
                            </span>
                        </div>

                        {/* Question Text */}
                        <p className="text-zinc-300 text-sm font-medium leading-relaxed mb-4">
                            "Find the eigen values and eigen vectors of the matrix A = [1 2; 3 4]."
                        </p>

                        {/* Solution Toggle */}
                        <div className="flex gap-2">
                            <button
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300",
                                    showSolution
                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                                )}
                            >
                                {showSolution ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                Solution
                            </button>
                        </div>

                        {/* Solution Content */}
                        <div className={cn(
                            "grid transition-all duration-500 ease-in-out overflow-hidden",
                            showSolution ? "grid-rows-[1fr] mt-3 opacity-100" : "grid-rows-[0fr] mt-0 opacity-0"
                        )}>
                            <div className="min-h-0 bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50">
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    <span className="text-indigo-400 font-bold block mb-1">Step 1:</span>
                                    The characteristic equation is |A - λI| = 0...
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Success Overlay Effect on Card */}
                {questionSolved && (
                    <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
                )}


                {/* Second Question Partial (for look) */}
                <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 opacity-40">
                    <div className="h-2 w-1/3 bg-zinc-800 rounded mb-4" />
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-zinc-800 rounded" />
                        <div className="h-2 w-2/3 bg-zinc-800 rounded" />
                    </div>
                </div>

            </div>

            {/* Animated Cursor */}
            <div
                className="absolute pointer-events-none z-50 transition-all duration-700 ease-in-out"
                style={{
                    left: `${cursorPosition.x}%`,
                    top: `${cursorPosition.y}%`
                }}
            >
                <div className={cn(
                    "relative transition-transform duration-100",
                    clickEffect ? "scale-75" : "scale-100"
                )}>
                    <MousePointer className="h-6 w-6 text-white fill-white drop-shadow-xl" />
                    {clickEffect && (
                        <div className="absolute -inset-2 rounded-full border-2 border-white/50 animate-ping" />
                    )}
                </div>
            </div>
        </div >
    );
}

export function SolutionCard() {
    const [activeTab, setActiveTab] = useState<'video' | 'text'>('video');

    return (
        <div className="md:col-span-1 md:row-span-2 group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 hover:border-indigo-500/30 transition-all duration-300 dark:border-white/5 dark:bg-zinc-900">
            <div className="absolute inset-0 bg-gradient-to-b from-red-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:from-red-500/10" />
            <div className="relative h-full flex flex-col z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold">Solutions</h3>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-zinc-100 p-1 rounded-lg dark:bg-zinc-800">
                        <button
                            onClick={() => setActiveTab('video')}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                activeTab === 'video'
                                    ? "bg-white text-red-600 shadow-sm dark:bg-zinc-700 dark:text-red-400"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                            )}
                        >
                            Video
                        </button>
                        <button
                            onClick={() => setActiveTab('text')}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                activeTab === 'text'
                                    ? "bg-white text-indigo-600 shadow-sm dark:bg-zinc-700 dark:text-indigo-400"
                                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                            )}
                        >
                            Text
                        </button>
                    </div>
                </div>
                <p className="text-zinc-600 mb-6 dark:text-zinc-400">
                    Stuck on a tough concept? Watch curated video solutions or read detailed text explanations.
                </p>
                {/* Visual Placeholder for UI */}
                <div className="mt-auto w-full bg-zinc-50 rounded-xl border border-zinc-100 p-6 md:p-8 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 flex flex-col gap-4 min-h-[220px]">
                    {/* Dummy Question */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">Thermodynamics</span>
                            <span className="text-[10px] font-medium text-zinc-400">2023 - Winter</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 leading-snug">
                            "State and explain the Kelvin-Planck statement of the Second Law of Thermodynamics."
                        </p>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative mt-1">
                        {activeTab === 'video' ? (
                            /* Video Player */
                            <div className="relative w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-300">
                                {/* Abstract thumbnail content */}
                                <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center opacity-50">
                                    <div className="w-full h-full bg-gradient-to-tr from-zinc-900 to-zinc-800" />
                                </div>

                                {/* Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                    <div className="w-2/3 h-full bg-red-600" />
                                </div>
                            </div>
                        ) : (
                            /* Text Solution */
                            <div className="h-full bg-white rounded-lg border border-zinc-200 p-3 text-xs leading-relaxed overflow-y-auto no-scrollbar shadow-inner dark:bg-zinc-900/50 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Answer:</p>
                                <p className="text-zinc-600 dark:text-zinc-400 italic">
                                    "It is impossible for any device that operates on a thermodynamic cycle to receive heat from a single thermal reservoir and produce a net amount of work."
                                </p>
                                <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                                    <span className="font-bold text-indigo-500">Key concept:</span> Thermal efficiency cannot be 100%.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RotatingText() {
    const [isMarathi, setIsMarathi] = useState(false);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFlipping(true);
            setTimeout(() => {
                setIsMarathi(prev => !prev);
                setIsFlipping(false);
            }, 400); // 400ms for half flip
        }, 3000); // 3 seconds interval

        return () => clearInterval(interval);
    }, []);

    return (
        <span className="relative inline-flex flex-col items-center justify-center align-bottom ml-2 min-w-[140px] h-[1.1em]">
            <span
                className={cn(
                    "absolute transition-all duration-700 ease-in-out bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent transform",
                    isFlipping ? "opacity-0 scale-y-0 translate-y-4 rotate-x-90" : "opacity-100 scale-y-100 translate-y-0 rotate-x-0"
                )}
                style={{ backfaceVisibility: 'hidden' }}
            >
                {isMarathi ? "सराव" : "Saraav"}
            </span>
            {/* Ambient Glow for "Beautiful" effect */}
            <span className={cn(
                "absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500 blur-2xl opacity-20 transition-all duration-700",
                isFlipping ? "opacity-0 scale-50" : "opacity-30 scale-110"
            )} />
        </span>
    );
}
