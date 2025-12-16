"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Report, ReportStatus } from '@/lib/types';
import { ArrowLeft, CheckCircle, Clock, ExternalLink, Filter, Loader2, Trash2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils'; // Assuming this exists, based on other files

export default function ReportsPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    useEffect(() => {
        if (isAdmin) {
            fetchReports();
        }
    }, [isAdmin]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: ReportStatus) => {
        setUpdatingId(id);
        try {
            const reportRef = doc(db, 'reports', id);
            await updateDoc(reportRef, { status: newStatus });
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        setUpdatingId(id);
        try {
            await deleteDoc(doc(db, 'reports', id));
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report');
        } finally {
            setUpdatingId(null);
        }
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    if (!isAdmin) return null;

    const filteredReports = reports.filter(r => statusFilter === 'all' || r.status === statusFilter);

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push('/admin')}
                    className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Reported Questions</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Review and resolve user reports.</p>
                </div>
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
                {filteredReports.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                        <Filter className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No reports found</h3>
                        <p className="text-zinc-500">Try adjusting the filters.</p>
                    </div>
                ) : (
                    filteredReports.map((report) => (
                        <div key={report.id} className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Report Details */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide",
                                            report.reason === 'wrong_answer' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                                                report.reason === 'missing_content' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        )}>
                                            {report.reason.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            {new Date(report.createdAt).toLocaleString()}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            by {report.userEmail}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">User Note:</p>
                                        <p className="text-zinc-600 dark:text-zinc-300 bg-zinc-50 p-3 rounded-lg border border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800">
                                            {report.description}
                                        </p>
                                    </div>

                                    {report.questionSnapshot && (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Question Snapshot</p>
                                            <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert bg-zinc-50 p-4 rounded-lg border border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {report.questionSnapshot.text}
                                                </ReactMarkdown>
                                            </div>
                                            {report.questionSnapshot.subjectId && report.questionSnapshot.unitId && (
                                                <div className="mt-4">
                                                    <a
                                                        href={`/study/${report.questionSnapshot.subjectId}?unit=${report.questionSnapshot.unitId}&question=${report.questionId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        View Question in Context
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6 pt-4 md:pt-0 dark:border-zinc-800">
                                    <div className="flex flex-col gap-2 w-full">
                                        <p className="text-xs font-medium text-zinc-500 uppercase">Status</p>
                                        <select
                                            value={report.status}
                                            onChange={(e) => handleStatusUpdate(report.id, e.target.value as ReportStatus)}
                                            disabled={updatingId === report.id}
                                            className={cn(
                                                "w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50",
                                                report.status === 'pending' ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300" :
                                                    report.status === 'resolved' ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300" :
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
                                            onClick={() => handleDelete(report.id)}
                                            disabled={updatingId === report.id}
                                            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                                        >
                                            {updatingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            Delete Report
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
