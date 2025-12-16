"use client";

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { SubjectMetadata } from '@/lib/types';
import { cn, getInitials, getColorClass } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface SubjectCardProps {
    subject: SubjectMetadata;
    onDelete?: (id: string) => void;
    href?: string;
    actionLabel?: string;
}

export function SubjectCard({ subject, onDelete, href, actionLabel = "Continue Studying" }: SubjectCardProps) {
    const { isAdmin } = useAuth();

    const containerClasses = "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700";

    const content = (
        <SubjectCardContent
            subject={subject}
            isAdmin={!!isAdmin}
            onDelete={onDelete}
            actionLabel={actionLabel}
        />
    );

    if (href) {
        return (
            <Link href={href} className={containerClasses}>
                {content}
            </Link>
        );
    }

    return (
        <div className={containerClasses}>
            {content}
        </div>
    );
}

function SubjectCardContent({
    subject,
    isAdmin,
    onDelete,
    actionLabel
}: {
    subject: SubjectMetadata;
    isAdmin: boolean;
    onDelete?: (id: string) => void;
    actionLabel: string;
}) {
    return (
        <>
            {/* Featured Badge - Optional, can be controlled by prop if needed */}
            <div className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-indigo-600 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                Featured
            </div>

            <div className="relative h-48 w-full overflow-hidden">
                <div className={cn(
                    "flex h-full w-full items-center justify-center bg-gradient-to-br text-6xl font-bold text-white transition-transform duration-500 group-hover:scale-110",
                    getColorClass(subject.title)
                )}>
                    {getInitials(subject.title)}
                </div>

                {isAdmin && onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(subject.id);
                        }}
                        className="absolute left-4 top-4 z-20 rounded-lg bg-black/50 p-2 text-white hover:bg-red-500 transition-colors"
                        title="Delete Subject"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col bg-white p-6 dark:bg-zinc-900">
                <h3 className="text-xl font-bold text-zinc-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
                    {subject.title}
                </h3>

                <p className="text-sm text-zinc-500 mb-6 line-clamp-2 dark:text-zinc-400">
                    Complete syllabus coverage with practice questions and solutions.
                </p>

                <div className="mt-auto flex items-center justify-between">
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">
                        {subject.price ? `₹${subject.price}` : 'Free'}
                    </span>

                    <div className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                        {actionLabel}
                    </div>
                </div>
            </div>
        </>
    );
}
