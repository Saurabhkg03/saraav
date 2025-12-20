
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface QuestionGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuestionGuideModal({ isOpen, onClose }: QuestionGuideModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Handle animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const showContent = isOpen && isVisible;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div
                className={`relative w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl transition-all duration-300 border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh] ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            >
                <div className="relative flex-1 overflow-y-auto w-full bg-zinc-100 dark:bg-zinc-950/50 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <h3 className="text-xl font-bold leading-6 text-zinc-900 dark:text-zinc-100">
                                Quick Guide
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Get familiar with the question interface and controls.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="rounded-full bg-zinc-100 p-2 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors focus:outline-none"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>


                    {/* Image Area - Large and Scrollable */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[400px]">
                        {/* Placeholder Image - User will replace this path */}
                        <div className="relative w-full h-auto aspect-video max-w-4xl rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800">
                            <Image
                                src="/question-guide.png" // User needs to provide this
                                alt="Question Page Guide"
                                width={1280}
                                height={720}
                                className="w-full h-auto object-contain"
                                unoptimized
                            />
                            {/* Fallback visual if image missing (dev only) */}
                            <div className="absolute inset-0 -z-10 flex items-center justify-center text-zinc-400 text-sm">
                                Subject Guide Image (/question-guide.png)
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                        <button
                            type="button"
                            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-[0.98]"
                            onClick={onClose}
                        >
                            Got it, I'm ready to learn!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
