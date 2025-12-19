

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface WelcomeAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: {
        imageUrl?: string;
        title: string;
        message: string;
        ctaText: string;
    } | null;
    isLoading?: boolean;
}

export function WelcomeAnnouncementModal({ isOpen, onClose, config, isLoading }: WelcomeAnnouncementModalProps) {
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
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Panel */}
            <div
                className={`relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-xl transition-all duration-300 border border-zinc-200 dark:border-zinc-800 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            >
                {isLoading || !config ? (
                    <div className="animate-pulse">
                        <div className="h-40 bg-zinc-200 dark:bg-zinc-800 w-full" />
                        <div className="p-6 space-y-4">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
                            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full mt-4" />
                        </div>
                    </div>
                ) : (
                    <>
                        {config.imageUrl && (
                            <div className="relative h-48 w-full">
                                <Image
                                    src={config.imageUrl}
                                    alt="Welcome"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
                            </div>
                        )}

                        <button
                            type="button"
                            className="absolute right-3 top-3 rounded-full bg-black/20 p-1 text-white hover:bg-black/40 backdrop-blur-sm transition-colors focus:outline-none z-10"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="p-6">
                            <h3 className="text-xl font-bold leading-6 text-zinc-900 dark:text-zinc-100">
                                {config.title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                                    {config.message}
                                </p>
                            </div>

                            <div className="mt-6">
                                <button
                                    type="button"
                                    className="inline-flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors dark:focus:ring-offset-zinc-900"
                                    onClick={onClose}
                                >
                                    {config.ctaText || "Got it"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

