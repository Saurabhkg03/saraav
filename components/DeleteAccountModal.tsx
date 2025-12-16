
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
    const [inputValue, setInputValue] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (inputValue !== 'delete') return;

        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err: any) {
            setError(err.message || "Failed to delete account. You may need to re-login.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-500">
                    <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold">Delete Account</h2>
                </div>

                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                    This action is <span className="font-bold text-red-600 dark:text-red-500">irreversible</span>.
                    All your progress, purchases, and settings will be permanently lost.
                </p>

                <div className="mb-6">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Type <span className="font-bold select-all">delete</span> to confirm
                    </label>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        placeholder="delete"
                    />
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={inputValue !== 'delete' || isDeleting}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Forever'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
