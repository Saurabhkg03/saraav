"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Pages that should be full width (no global container)
    const isFullWidth = pathname === "/login" || pathname === "/";
    const isCommunity = pathname.startsWith("/community");

    return (
        <main className={cn(
            "flex-1 w-full",
            // Desktop/Standard Padding
            !isFullWidth && !isCommunity && "pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",

            // Community Wrapper (No top padding, but keep container max width if desired or just full width)
            !isFullWidth && isCommunity && "max-w-7xl mx-auto h-full",

            // Global Bottom Padding for Mobile Nav (Prevent overlap), EXCLUDING community which handles it internally
            !isCommunity && "pb-20 lg:pb-0"
        )}>
            {children}
        </main>
    );
}
