import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 space-y-16 sm:px-6 lg:px-8">
            {/* Header Skeleton */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <Skeleton className="h-10 w-64 rounded-lg" />
                    <Skeleton className="mt-2 h-4 w-96 rounded" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-12 w-40 rounded-xl" />
                    <Skeleton className="h-12 w-32 rounded-xl" />
                </div>
            </div>

            {/* Continue Learning Skeleton */}
            <section>
                <div className="mb-6 flex items-center justify-between">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-20 rounded" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <Skeleton className="h-40 w-full" />
                            <div className="flex-1 p-6 space-y-4">
                                <Skeleton className="h-6 w-3/4 rounded" />
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-24 rounded" />
                                    <Skeleton className="h-4 w-16 rounded" />
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3 w-12 rounded" />
                                        <Skeleton className="h-3 w-8 rounded" />
                                    </div>
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Bundles Skeleton */}
            <section>
                <div className="mb-6 flex items-center justify-between">
                    <Skeleton className="h-8 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-20 rounded" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <Skeleton className="h-48 w-full" />
                            <div className="flex-1 p-6 space-y-4">
                                <Skeleton className="h-4 w-24 rounded" />
                                <Skeleton className="h-6 w-3/4 rounded" />
                                <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <Skeleton className="h-4 w-20 rounded" />
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
