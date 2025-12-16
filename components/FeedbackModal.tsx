import { useState } from 'react';
import { X, MessageSquare, CheckCircle, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { value: 'bug', label: 'Report a Bug' },
    { value: 'feature', label: 'Request a Feature' },
    { value: 'content', label: 'Content Issue' },
    { value: 'other', label: 'General Feedback' },
];

export function FeedbackModal({
    isOpen,
    onClose,
}: FeedbackModalProps) {
    const { user } = useAuth();
    const [category, setCategory] = useState<string>('bug');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'feedback'), {
                userId: user?.uid || 'anonymous',
                userEmail: user?.email || 'anonymous',
                category,
                message,
                status: 'pending',
                createdAt: Date.now(),
                url: window.location.pathname
            });

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                // Reset state after closing
                setTimeout(() => {
                    setIsSuccess(false);
                    setMessage('');
                    setCategory('bug');
                }, 300);
            }, 2000);
        } catch (err) {
            console.error('Error submitting feedback:', err);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-indigo-500" />
                        Send Feedback
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="mb-4 rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Feedback Sent</h4>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Thanks for helping us improve!</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Feedback Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCategory(c.value)}
                                        className={cn(
                                            "flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                            category === c.value
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300"
                                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                        )}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Message
                            </label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Tell us what you think..."
                                required
                                rows={4}
                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !message.trim()}
                                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Send Feedback
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
