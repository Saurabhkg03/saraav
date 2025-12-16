import { Sparkles } from "lucide-react";

export function SaleBanner() {
    return (
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white py-1.5 overflow-hidden shadow-md z-40">
            <div className="absolute inset-0 bg-white/20 skew-x-12 animate-shimmer" />
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold tracking-wide uppercase animate-pulse">
                <Sparkles className="h-4 w-4 animate-spin-slow" />
                <span>Limited Time Offer: 100% OFF On All Courses!</span>
                <Sparkles className="h-4 w-4 animate-spin-slow" />
            </div>
        </div>
    );
}
