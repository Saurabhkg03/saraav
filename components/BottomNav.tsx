"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ShoppingBag, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";

export function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    if (!user) return null;

    const links = [
        {
            href: "/",
            label: "Home",
            icon: Home,
            active: pathname === "/"
        },
        {
            href: "/courses",
            label: "My Courses",
            icon: BookOpen,
            active: pathname.startsWith("/courses")
        },
        {
            href: "/marketplace",
            label: "Marketplace",
            icon: ShoppingBag,
            active: pathname.startsWith("/marketplace")
        },
        {
            href: "/community",
            label: "Community",
            icon: MessageSquare,
            active: pathname.startsWith("/community")
        },
        {
            href: "/profile",
            label: "Profile",
            icon: User,
            active: pathname.startsWith("/profile")
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/80 px-4 py-2 backdrop-blur-lg dark:border-zinc-800 dark:bg-black/80 lg:hidden safe-area-bottom">
            <nav className="flex items-center justify-around">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 p-2 transition-all",
                            link.active
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                        )}
                    >
                        <div className="relative flex items-center justify-center">
                            <link.icon
                                className={cn(
                                    "h-6 w-6 transition-transform",
                                    link.active && "scale-110"
                                )}
                                strokeWidth={link.active ? 2.5 : 2}
                            />
                        </div>
                        {/* 
                         Instagram style usually hides labels or keeps them very small. 
                         Let's keep them hidden for a cleaner look, or very small?
                         User said "modern bottom navigation bar like instagram".
                         Instagram has NO labels.
                         Let's hide labels for 'true' instagram feel, or make them tiny.
                         Let's try NO labels first for that sleek look, but maybe add sr-only for accessibility.
                        */}
                        <span className="sr-only">{link.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
