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
    const contentRef = useRef<HTMLDivElement>(null);
    const touchStart = useRef<{ x: number; y: number; scrollTop: number } | null>(null);

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

    // Manual Touch Event Listeners (Non-Passive)
    // We attach these manually to support { passive: false }, which allows us to preventDefault
    // and stop the browser's native stuck behavior, while avoiding the "passive listener" console error.
    useEffect(() => {
        const el = contentRef.current;
        if (!el || !isFullScreen) return;

        const handleTouchStart = (e: TouchEvent) => {
            // We only care about the first touch
            const touch = e.touches[0];
            touchStart.current = {
                x: touch.clientX,
                y: touch.clientY,
                scrollTop: el.scrollTop
            };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchStart.current) return;

            // Critical: preventDefault allows us to override the browser's scroll behavior
            if (e.cancelable) e.preventDefault();

            const touch = e.touches[0];

            // Inverted Logic based on user feedback:
            // Previous: deltaX = start - current.
            // New: We simply flip the sign or operand order.
            // Let's calculate proper delta: CurrentX - StartX
            // If I move finger Left (Visual Up): Current < Start. diff is negative.
            // If I want to scroll DOWN (increment scrollTop), I need a positive addition?
            // User said it was inverted.
            // Let's try: scrollTop = initial - (Current - Start)
            // = initial - Current + Start
            // = initial + (Start - Current) -> This was the OLD logic.
            // So we need: scrollTop = initial - (Start - Current)
            // = initial + (Current - Start).

            const diffX = touch.clientX - touchStart.current.x;
            el.scrollTop = touchStart.current.scrollTop + diffX;
        };

        const handleTouchEnd = () => {
            touchStart.current = null;
        };

        // Attach with { passive: false }
        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isFullScreen]);

    // Handle Back Button behavior with Hash
    useEffect(() => {
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isOpen && isMobile) {
            if (window.location.hash !== '#solution') {
                window.history.pushState({ modalOpen: true }, "", "#solution");
            }

            const handlePopState = () => {
                onCloseRef.current();
            };

            window.addEventListener("popstate", handlePopState);

            return () => {
                window.removeEventListener("popstate", handlePopState);
            };
        }
    }, [isOpen]);

    const handleManualClose = () => {
        if (window.location.hash === '#solution') {
            window.history.back();
        } else {
            onCloseRef.current();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cn(
            "fixed z-50 flex flex-col bg-white dark:bg-zinc-950 md:hidden transition-all duration-300 ease-in-out",
            !isFullScreen && "inset-0",
            isFullScreen
                ? "origin-center rotate-90 w-[100dvh] h-[100dvw] max-h-[100dvw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-none"
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
            <div
                ref={contentRef}
                className={cn(
                    "flex-1 min-w-0 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 break-words h-full",
                    isFullScreen
                        ? "p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        : "p-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
                )}
                style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: isFullScreen ? 'none' : 'auto'
                }}
            >
                <ErrorBoundary label="solution modal content">
                    <MarkdownRenderer content={content} />
                </ErrorBoundary>
            </div>
        </div>
    );
}
