import { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer').then(mod => mod.MarkdownRenderer), {
    loading: () => <Skeleton className="h-64 w-full" />,
});
import { cn } from '@/lib/utils';

interface SolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

export function SolutionModal({ isOpen, onClose, content }: SolutionModalProps) {
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Use ref to keep the latest onClose without triggering re-renders of the effect
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Scroll Lock Effect
    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle Back Button behavior with Hash
    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isOpen && isMobile) {
            // Push a hash state. This is more robust on mobile browsers.
            // Check if we already have the hash to avoid double-pushing in Strict Mode
            if (window.location.hash !== '#solution') {
                window.history.pushState({ modalOpen: true }, "", "#solution");
            }

            const handlePopState = () => {
                // User pressed Back (hash removed) -> Call the latest onClose
                onCloseRef.current();
            };

            window.addEventListener("popstate", handlePopState);

            return () => {
                window.removeEventListener("popstate", handlePopState);

                // Cleanup: If the component unmounts but the hash is still there (e.g. parent closed it programmatically),
                // we should try to remove it to keep URL clean, but be careful not to pop if user already popped.
                // For simplicity/safety, we rely on the user's manual interactions or the manual close handler.
            };
        }
    }, [isOpen]);

    const handleManualClose = () => {
        // When manually closing, if we have our hash, go back to remove it.
        // If we don't have our hash (rare edge case), just call onClose.
        if (window.location.hash === '#solution') {
            window.history.back();
        } else {
            onCloseRef.current(); // Fallback if hash is missing
        }
    };

    // Check if we are in landscape mode based on full screen state
    // When isFullScreen is true, we rotate the view 90 degrees to simulate landscape on portrait phones

    if (!isOpen) return null;

    return (
        <div className={cn(
            "fixed z-50 flex flex-col bg-white dark:bg-zinc-950 md:hidden transition-all duration-300 ease-in-out",
            !isFullScreen && "inset-0",
            isFullScreen
                ? "origin-center rotate-90 w-[100dvh] h-[100dvw] max-h-[100dvw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-none overscroll-none"
                : ""
        )}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 shrink-0">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {isFullScreen ? "Landscape View" : "Solution"}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        title={isFullScreen ? "Exit Landscape" : "Landscape Mode"}
                    >
                        {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={handleManualClose}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                        title="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={cn(
                "flex-1 min-w-0 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 break-words",
                isFullScreen ? "p-8" : "p-4"
            )}>
                <ErrorBoundary label="solution modal content">
                    <MarkdownRenderer content={content} />
                </ErrorBoundary>
            </div>
        </div>
    );
}
