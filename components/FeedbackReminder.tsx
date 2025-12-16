"use client";

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useFeedback } from '@/context/FeedbackContext';
import { MessageSquare, X } from 'lucide-react';

export function FeedbackReminder() {
    const { openFeedback } = useFeedback();
    const hasShownRef = useRef(false);

    useEffect(() => {
        // Prevent double trigger in React Strict Mode or fast re-renders
        if (hasShownRef.current) return;

        const checkAndShowReminder = () => {
            try {
                const isDismissed = localStorage.getItem('feedback_reminder_dismissed') === 'true';
                if (isDismissed) return;

                const lastShown = localStorage.getItem('last_feedback_reminder_time');
                const now = Date.now();
                const DAYS_TO_WAIT = 3 * 24 * 60 * 60 * 1000; // 3 Days

                if (!lastShown || (now - parseInt(lastShown) > DAYS_TO_WAIT)) {
                    hasShownRef.current = true;

                    // Show toast after a delay (e.g., 2 minutes)
                    // For demo/testing purposes, you might want to lower this locally, 
                    // but user requested "don't make it annoying".
                    // Let's settle on 2 minutes (120000ms).
                    setTimeout(() => {
                        showFeedbackToast();
                    }, 120000);
                }
            } catch (error) {
                console.error("Error in feedback reminder logic:", error);
            }
        };

        checkAndShowReminder();
    }, [openFeedback]);

    const showFeedbackToast = () => {
        toast.custom((t) => (
            <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                        <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Enjoying the app?
                        </h4>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            We'd love to hear your thoughts! Your feedback helps us improve.
                        </p>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <input
                            type="checkbox"
                            className="rounded border-zinc-300 dark:border-zinc-700"
                            onChange={(e) => {
                                if (e.target.checked) {
                                    localStorage.setItem('feedback_reminder_dismissed', 'true');
                                    setTimeout(() => toast.dismiss(t), 500);
                                    toast("Understood. We won't ask again.");
                                }
                            }}
                        />
                        Don't ask again
                    </label>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                localStorage.setItem('last_feedback_reminder_time', Date.now().toString());
                                toast.dismiss(t);
                            }}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Later
                        </button>
                        <button
                            onClick={() => {
                                localStorage.setItem('last_feedback_reminder_time', Date.now().toString());
                                toast.dismiss(t);
                                openFeedback();
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                        >
                            Give Feedback
                        </button>
                    </div>
                </div>

                <div className="text-[10px] text-zinc-400 text-center mt-1">
                    You can also give feedback anytime from the footer.
                </div>
            </div>
        ), {
            duration: Infinity, // Stay until interacted
            position: 'bottom-right',
        });
    };

    return null; // Logic only component
}
