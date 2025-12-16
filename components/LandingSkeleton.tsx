import { Skeleton } from "@/components/ui/skeleton";

export function LandingSkeleton() {
    return (
        <div className="flex min-h-screen flex-col bg-white overflow-hidden dark:bg-zinc-950">
            {/* Navbar Skeleton (approximate) */}
            <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <Skeleton className="h-8 w-32" /> {/* Logo */}
                <div className="flex gap-4">
                    <Skeleton className="hidden h-10 w-24 rounded-lg sm:block" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </header>

            {/* Hero Section Skeleton */}
            <section className="relative px-6 pt-6 pb-10 sm:pt-10 sm:pb-16 lg:px-8 mt-12">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Badge */}
                    <div className="mx-auto mb-8 h-8 w-64 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />

                    {/* Heading */}
                    <div className="space-y-4 mb-8">
                        <Skeleton className="mx-auto h-12 w-3/4 sm:h-16" />
                        <Skeleton className="mx-auto h-12 w-2/3 sm:h-16" />
                    </div>

                    {/* Subtext */}
                    <div className="space-y-3 mb-10">
                        <Skeleton className="mx-auto h-4 w-full max-w-2xl" />
                        <Skeleton className="mx-auto h-4 w-5/6 max-w-lg" />
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Skeleton className="h-14 w-full rounded-xl sm:w-48" />
                        <Skeleton className="h-14 w-full rounded-xl sm:w-48" />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bento Grid Skeleton (Top Row) */}
            <section className="py-12 bg-zinc-50 dark:bg-zinc-900/30">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center mb-16 space-y-4">
                        <Skeleton className="mx-auto h-4 w-32" />
                        <Skeleton className="mx-auto h-10 w-96" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="md:col-span-2 h-[270px] rounded-3xl" />
                        <Skeleton className="md:col-span-1 h-[270px] rounded-3xl" />
                    </div>
                </div>
            </section>
        </div>
    );
}
