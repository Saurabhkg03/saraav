
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50",
            className
        )}>
            <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                <Icon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {title}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {description}
            </p>

            {actionLabel && (
                <div className="mt-6">
                    {actionHref ? (
                        <Link
                            href={actionHref}
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
                        >
                            {actionLabel}
                        </Link>
                    ) : onAction ? (
                        <button
                            onClick={onAction}
                            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
                        >
                            {actionLabel}
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
