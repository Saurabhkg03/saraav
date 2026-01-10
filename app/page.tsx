"use client";

import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ShoppingCart, ArrowRight, PlayCircle, Star } from 'lucide-react';
import { cn, getInitials, getColorClass } from '@/lib/utils';
import { LandingPage } from '@/components/LandingPage';
import { LandingSkeleton } from '@/components/LandingSkeleton';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';

export default function Dashboard() {
  const { myCourses, branchSubjects, loading: subjectsLoading } = useDashboardData();
  const { user, loading: authLoading, branch: userBranch, year: userYear, progress, purchases, purchasedCourseIds } = useAuth();
  const [skeletonType, setSkeletonType] = useState<'dashboard' | 'landing' | null>(null);

  // 1. Group BRANCH-SPECIFIC subjects into bundles
  const allBundlesMap = useMemo(() => {
    return branchSubjects.reduce((acc, subject) => {
      const branch = (subject.branch || "General").trim();
      const semester = subject.semester || "All Semesters";

      // Special logic for 1st Year subjects (regardless of stored semester)
      // Check if it's a 1st year subject: branch is 'First Year' OR semester implies it
      const isFirstYear = branch === 'First Year' || semester === 'Semester 1' || semester === 'Semester 2' || semester === 'First Year';

      if (isFirstYear) {
        // Determine target bundles
        const targets = [];

        const isGroupA = subject.group === 'A';
        const isGroupB = subject.group === 'B';
        const isCommon = subject.isCommon;

        if (isGroupA || isCommon) targets.push('FirstYear-GroupA');
        if (isGroupB || isCommon) targets.push('FirstYear-GroupB');

        // Fallback: If no group assigned but is 1st year, maybe assign to both or a "General" bucket? 
        // Assuming user will tag them. If not tagged, let's put in 'FirstYear-General' or both?
        // Let's assume they are tagged or common. If neither, we might miss them. 
        // Let's default unlabeled to BOTH for visibility? Or 'General'.
        if (!isGroupA && !isGroupB && !isCommon) {
          targets.push('FirstYear-General');
        }

        targets.forEach(key => {
          if (!acc[key]) {
            acc[key] = {
              id: key,
              branch: key.includes('GroupA') ? 'First Year - Group A' : (key.includes('GroupB') ? 'First Year - Group B' : 'First Year'),
              semester: 'First Year', // Uniform semester label
              subjects: [],
              totalPrice: 0,
              totalOriginalPrice: 0,
              subjectCount: 0,
              isSynthetic: true
            };
          }
          acc[key].subjects.push(subject);
          acc[key].totalPrice += subject.price || 0;
          acc[key].totalOriginalPrice += subject.originalPrice || subject.price || 0;
          acc[key].subjectCount++;
        });

        return acc;
      }

      // Standard logic for items NOT in 1st Year
      const key = `${branch}-${semester}`;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          branch,
          semester,
          subjects: [],
          totalPrice: 0,
          totalOriginalPrice: 0,
          subjectCount: 0
        };
      }

      acc[key].subjects.push(subject);
      acc[key].totalPrice += subject.price || 0;
      acc[key].totalOriginalPrice += subject.originalPrice || subject.price || 0;
      acc[key].subjectCount++;

      return acc;
    }, {} as Record<string, any>);
  }, [branchSubjects]);

  const allBundlesList = useMemo(() => Object.values(allBundlesMap), [allBundlesMap]);

  // 2. Featured Bundles: Valid for User's Branch, Prioritized by Year
  const featuredBundles = useMemo(() => {
    // Special handling for 1st Year: Show BOTH Group A and Group B bundles
    // Special handling for 1st Year: USE THE SHARED BUNDLES from allBundlesList
    if (userYear === '1st Year') {
      const aggrBundles = allBundlesList.filter(b => b.id === 'FirstYear-GroupA' || b.id === 'FirstYear-GroupB');

      // If we found them in the aggregated list, use them.
      if (aggrBundles.length > 0) {
        return aggrBundles;
      }

      // Fallback: If for some reason they aren't in allBundlesList (empty data?), we return empty
      return [];
    }


    // Standard Logic for other years
    return allBundlesList
      .filter(bundle => {
        if (!userBranch) return true;

        const normalizedUserBranch = userBranch.trim();
        const branchMatches = bundle.branch === normalizedUserBranch ||
          bundle.branch === "General" ||
          (normalizedUserBranch.includes("Electrical") && bundle.branch.includes("Electrical"));

        return branchMatches;
      })
      .sort((a, b) => {
        if (!userYear) return 0;
        const getSemestersForYear = (year: string) => {
          switch (year) {
            case "1st Year": return ["Semester 1", "Semester 2"];
            case "2nd Year": return ["Semester 3", "Semester 4"];
            case "3rd Year": return ["Semester 5", "Semester 6"];
            case "4th Year": return ["Semester 7", "Semester 8"];
            default: return [];
          }
        };

        const currentSemesters = getSemestersForYear(userYear);
        const aIsCurrent = currentSemesters.includes(a.semester);
        const bIsCurrent = currentSemesters.includes(b.semester);

        if (aIsCurrent && !bIsCurrent) return -1;
        if (!aIsCurrent && bIsCurrent) return 1;

        const semA = parseInt(a.semester.replace(/\D/g, '')) || 0;
        const semB = parseInt(b.semester.replace(/\D/g, '')) || 0;
        return semA - semB;
      });
  }, [allBundlesList, userBranch, userYear, branchSubjects]);

  // For 1st year, `featuredBundles` is ALREADY the final list.
  // For others, we might want to apply the same subject filtering? No, other years are branch-locked.

  const finalFeaturedBundles = featuredBundles;
  /*
    // OLD LOGIC REMOVED
    const finalFeaturedBundles = useMemo(() => {
       return featuredBundles.map(bundle => {
          // Only filter contents for 1st Year Sem 1/2
          if (userYear === '1st Year' && (bundle.semester === 'Semester 1' || bundle.semester === 'Semester 2') && userBranch) {
            const normalizedUserBranch = userBranch.trim();
            const isGroupABranch = ['Computer Science', 'Information Technology', 'Electrical'].some(b => normalizedUserBranch.includes(b));
            const isGroupBBranch = ['Mechanical', 'Electronics', 'ENTC'].some(b => normalizedUserBranch.includes(b));
   
            let userTargetGroup: 'A' | 'B' | null = null;
            if (bundle.semester === 'Semester 1') {
              if (isGroupABranch) userTargetGroup = 'A';
              else if (isGroupBBranch) userTargetGroup = 'B';
            } else if (bundle.semester === 'Semester 2') {
              if (isGroupABranch) userTargetGroup = 'B';
              else if (isGroupBBranch) userTargetGroup = 'A';
            }
   
            if (userTargetGroup) {
              const filteredSubjects = bundle.subjects.filter((s: any) => {
                if (s.group) return s.group === userTargetGroup;
                if (s.isCommon) return true;
                // If subject matches user branch explicitly (Legacy fallback)
                if (s.branch === normalizedUserBranch) return true;
                return false;
              });
   
              // Return modified bundle with filtered subjects
              // Recalculate counts/prices if needed? 
              // For display simplicity, we just update the list.
              return {
                ...bundle,
                subjects: filteredSubjects,
                subjectCount: filteredSubjects.length
              };
            }
          }
          return bundle;
       }).filter(b => b.subjects.length > 0); // Remove empty bundles after filtering
    }, [featuredBundles, userYear, userBranch]);
  */

  // 3. All Bundles: Everything, sorted by Branch then Semester
  const allBundlesDisplay = useMemo(() => {
    return [...allBundlesList].sort((a, b) => {
      if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
      const semA = parseInt(a.semester.replace(/\D/g, '')) || 0;
      const semB = parseInt(b.semester.replace(/\D/g, '')) || 0;
      return semA - semB;
    });
  }, [allBundlesList]);

  // Check localStorage on mount to predict auth state
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    setSkeletonType(isLoggedIn === 'true' ? 'dashboard' : 'landing');
  }, []);

  // 1. Auth Loading: Show Predictive Skeleton
  if (authLoading) {
    if (skeletonType === 'dashboard') {
      return <DashboardSkeleton />;
    }
    if (skeletonType === 'landing') {
      return <LandingSkeleton />;
    }
    // Return empty bg while checking localStorage to prevent flicker
    return <div className="min-h-screen bg-white dark:bg-zinc-950" />;
  }

  // 2. Not Logged In: Show Landing Page IMMEDIATELY (Don't wait for subjects)
  if (!user) {
    return <LandingPage />;
  }

  // 3. Logged In, but Subjects Loading: Show Dashboard Skeleton
  if (subjectsLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 space-y-16 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-10 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-12 w-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>

        {/* Continue Learning Skeleton */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-40 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 p-6 space-y-4">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                      <div className="h-3 w-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                    <div className="h-2 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Bundles Skeleton */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-48 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 p-6 space-y-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 space-y-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      {/* Header & Actions */}
      <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Welcome back, <span className="block md:inline text-indigo-600 dark:text-indigo-400">{user.displayName || 'Student'}</span>
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Continue your learning journey or explore new courses.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Browse Marketplace
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            My Courses
          </Link>
        </div>
      </section>

      {/* My Learning Section (if logged in and has courses) */}
      {user && myCourses.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Continue Learning</h2>
            <Link href="/courses" className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.slice(0, 3).map((subject) => {
              const purchase = purchases?.[subject.id];
              const daysRemaining = purchase ? Math.ceil((purchase.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;

              return (
                <Link
                  key={subject.id}
                  href={`/study/${subject.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-300 bg-white transition-all hover:shadow-lg dark:border dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className={cn(
                    "flex h-40 items-center justify-center bg-gradient-to-br text-4xl font-bold text-white relative",
                    getColorClass(subject.title)
                  )}>
                    {getInitials(subject.title)}
                    {daysRemaining !== null && daysRemaining <= 30 && (
                      <div className="absolute top-3 right-3 rounded-full bg-red-500/90 px-2 py-0.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
                        Expiring in {daysRemaining} days
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {subject.title}
                    </h3>
                    <div className="mt-4 flex items-center justify-between mb-4">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {daysRemaining !== null ? (
                          daysRemaining > 30 ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Expiring Soon</span>
                          )
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-transparent p-0 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                        <PlayCircle className="h-4 w-4" />
                        Continue
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                        <span>Progress</span>
                        <span>
                          {Math.round((Object.keys(progress?.[subject.id]?.questions || {}).length / (subject.questionCount || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-500 ease-out dark:bg-indigo-500"
                          style={{
                            width: `${Math.min(100, Math.round((Object.keys(progress?.[subject.id]?.questions || {}).length / (subject.questionCount || 1)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Featured Marketplace Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bundles for you</h2>
          <Link href="/marketplace" className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {finalFeaturedBundles.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-zinc-500 dark:text-zinc-400">
                No bundles found for you ({userBranch || "None"}).
              </p>
              <Link href="/marketplace" className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Browse all courses
              </Link>
            </div>
          ) : (
            finalFeaturedBundles.map((bundle: any) => (
              <Link
                key={bundle.id}
                href={`/marketplace/semester/${encodeURIComponent(bundle.id)}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-400 bg-white transition-all hover:shadow-lg dark:border dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative h-48">
                  <div className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-indigo-600 backdrop-blur-sm">
                    <Star className="mr-1 inline-block h-3 w-3 fill-current" />
                    Featured
                  </div>
                  <div className={cn(
                    "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-6 text-center",
                    getColorClass(bundle.branch)
                  )}>
                    {(bundle.semester === 'First Year' || bundle.branch.includes('First Year')) && (
                      <div className="absolute left-0 top-0 z-20 rounded-br-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_15px_rgba(192,38,211,0.5)] border-b border-r border-white/20 backdrop-blur-md">
                        ✨ According to NEP Syllabus
                      </div>
                    )}
                    <p className="mb-1 text-lg font-medium text-white opacity-90">
                      {bundle.semester}
                    </p>
                    <h3 className="text-2xl font-bold text-white line-clamp-2">
                      {bundle.branch}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {bundle.semester} Bundle
                    </p>
                    <h4 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {bundle.branch}
                    </h4>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <BookOpen className="h-4 w-4" />
                      <span>{bundle.subjectCount} Subjects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bundle.subjects.every((s: any) => purchasedCourseIds?.includes(s.id)) ? (
                        <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Owned
                        </div>
                      ) : (
                        <>
                          {bundle.totalOriginalPrice > bundle.totalPrice && (
                            <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                              ₹{bundle.totalOriginalPrice}
                            </span>
                          )}
                          <div className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            ₹{bundle.totalPrice}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )))}
        </div>
      </section>

      {/* All Bundles Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Explore All Bundles</h2>
          <Link href="/marketplace" className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allBundlesDisplay.map((bundle: any) => (
            <Link
              key={bundle.id}
              href={`/marketplace/semester/${encodeURIComponent(bundle.id)}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-400 bg-white transition-all hover:shadow-lg dark:border dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative h-48">
                <div className={cn(
                  "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-6 text-center",
                  getColorClass(bundle.branch)
                )}>
                  <p className="mb-1 text-lg font-medium text-white/90 opacity-90">
                    {bundle.semester}
                  </p>
                  <h3 className="text-2xl font-bold text-white line-clamp-2">
                    {bundle.branch}
                  </h3>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {/* If synthetic, title is like "Semester 1 - Group A", so we can just show that, or show Branch if normal */}
                    {bundle.isSynthetic ? bundle.branch : bundle.branch}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {bundle.semester}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <BookOpen className="h-4 w-4" />
                    <span>{bundle.subjectCount} Subjects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bundle.subjects.every((s: any) => purchasedCourseIds?.includes(s.id)) ? (
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Owned
                      </div>
                    ) : (
                      <>
                        {bundle.totalOriginalPrice > bundle.totalPrice && (
                          <span className="text-xs text-zinc-400 line-through dark:text-zinc-500">
                            ₹{bundle.totalOriginalPrice}
                          </span>
                        )}
                        <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          ₹{bundle.totalPrice}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
