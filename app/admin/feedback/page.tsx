"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, CheckCircle, Clock, Filter, Loader2, Trash2, XCircle, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackStatus = 'pending' | 'resolved' | 'dismissed';

interface Feedback {
    id: string;
    userId: string;
    userEmail: string;
    category: string;
    message: string;
    status: FeedbackStatus;
    createdAt: number;
    url?: string;
}

export default function FeedbackPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchFeedback();
        }
    }, [isAdmin]);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
            setFeedbacks(data);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: FeedbackStatus) => {
        setUpdatingId(id);
        try {
            const feedbackRef = doc(db, 'feedback', id);
            await updateDoc(feedbackRef, { status: newStatus });
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feedback?')) return;

        setUpdatingId(id);
        try {
            await deleteDoc(doc(db, 'feedback', id));
            setFeedbacks(prev => prev.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error deleting feedback:', error);
            alert('Failed to delete feedback');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Date", "User Email", "Category", "Message", "Status", "URL"];
        const rows = feedbacks.map(f => [
            f.id,
            new Date(f.createdAt).toLocaleString(),
            f.userEmail,
            f.category,
            `"${f.message.replace(/"/g, '""')}"`, // Escape quotes
            f.status,
            f.url || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `feedback_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    if (!isAdmin) return null;

    const filteredFeedback = feedbacks.filter(f => statusFilter === 'all' || f.status === statusFilter);

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin')}
                        className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">User Feedback</h1>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Review generic feedback, bugs, and feature requests.</p>
                    </div>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 pb-4 overflow-x-auto">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                        statusFilter === 'all'
                            ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    )}
                >
                    All
                </button>
                <button
                    onClick={() => setStatusFilter('pending')}
                    className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors border flex items-center gap-2",
                        statusFilter === 'pending'
                            ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    )}
                >
                    <Clock className="h-4 w-4" />
                    Pending
                </button>
                <button
                    onClick={() => setStatusFilter('resolved')}
                    className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors border flex items-center gap-2",
                        statusFilter === 'resolved'
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    )}
                >
                    <CheckCircle className="h-4 w-4" />
                    Resolved
                </button>
                <button
                    onClick={() => setStatusFilter('dismissed')}
                    className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors border flex items-center gap-2",
                        statusFilter === 'dismissed'
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    )}
                >
                    <XCircle className="h-4 w-4" />
                    Dismissed
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredFeedback.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                        <Filter className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No feedback found</h3>
                        <p className="text-zinc-500">Try adjusting the filters.</p>
                    </div>
                ) : (
                    filteredFeedback.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Details */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                                            item.category === 'bug' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                                                item.category === 'feature' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        )}>
                                            {item.category}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            by {item.userEmail}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Message:</p>
                                        <p className="text-zinc-600 dark:text-zinc-300 bg-zinc-50 p-3 rounded-lg border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800 whitespace-pre-wrap">
                                            {item.message}
                                        </p>
                                    </div>

                                    {item.url && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span className="font-medium uppercase">Originated From:</span>
                                            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono dark:bg-zinc-800">{item.url}</code>
                                            <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-500">
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6 pt-4 md:pt-0 dark:border-zinc-800">
                                    <div className="flex flex-col gap-2 w-full">
                                        <p className="text-xs font-medium text-zinc-500 uppercase">Status</p>
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusUpdate(item.id, e.target.value as FeedbackStatus)}
                                            disabled={updatingId === item.id}
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50",
                                                item.status === 'pending' ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300" :
                                                    item.status === 'resolved' ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300" :
                                                        "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                            )}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="dismissed">Dismissed</option>
                                        </select>
                                    </div>

                                    <div className="mt-auto pt-4 flex items-center justify-between gap-4">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={updatingId === item.id}
                                            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                                        >
                                            {updatingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
