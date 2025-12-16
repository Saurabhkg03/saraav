"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Pages that should be full width (no global container)
    const isFullWidth = pathname === "/login" || pathname === "/";

    return (
        <main className={cn(
            "flex-1 w-full",
            !isFullWidth && "pt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        )}>
            {children}
        </main>
    );
}
