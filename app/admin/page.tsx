"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Trash2, BookOpen, Flag, MessageSquare } from 'lucide-react';
import { useSubjects } from '@/hooks/useSubjects';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { JsonImportModal } from '@/components/JsonImportModal';
import { EditSubjectModal } from '@/components/EditSubjectModal';
import { AdminEnrollmentModal } from '@/components/AdminEnrollmentModal';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminPage() {
    const { subjects, loading } = useSubjects();
    const { isAdmin, loading: authLoading } = useAuth();
    const { settings } = useSettings() as any; // Type assertion until types are fixed
    const router = useRouter();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [selectedSemester, setSelectedSemester] = useState<string>('All');

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    const togglePayment = async () => {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, isPaymentEnabled: !settings.isPaymentEnabled }),
            });
        } catch (error) {
            console.error('Error toggling payment:', error);
            alert('Failed to update settings');
        }
    };

    if (loading || authLoading) {
        return <div className="flex h-screen items-center justify-center text-zinc-500">Loading...</div>;
    }

    if (!isAdmin) return null;

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
            try {
                const batch = writeBatch(db);
                batch.delete(doc(db, "subjects", id));
                batch.delete(doc(db, "subjects_metadata", id));
                batch.delete(doc(db, "subject_contents", id)); // Keeping for legacy safety
                await batch.commit();
                toast.success("Subject deleted successfully");
            } catch (error: any) {
                toast.error("Failed to delete subject: " + error.message);
            }
        }
    };

    const handleSyncMetadata = async () => {
        if (!confirm("This will read all subjects and populate the 'subjects_metadata' collection. Continue?")) return;
        try {
            // Read all from 'subjects'
            // We use the same hook data since we just switched the hook.
            // Wait, if we switched the hook, 'subjects' state is now empty if metadata is empty!
            // So we must fetch 'subjects' manually here.

            // This button is intended to be used ONCE.
            // Since useSubjects now reads from metadata, if metadata is empty, list is empty.
            // But we need to read from 'subjects' (the old source) to populate it.

            const { getDocs, collection } = await import("firebase/firestore");
            const snapshot = await getDocs(collection(db, "subjects"));
            const batch = writeBatch(db);
            let count = 0;

            snapshot.docs.forEach(subjectDoc => {
                const data = subjectDoc.data();
                // We assume 'subjects' doc is already the metadata shape (UnitSummary[])
                // If it has full questions, we should strip them, but relying on UnitSummary is safer if ImportModal was used.
                // Assuming it's safe to copy as is for now if it was working before.
                // But ideally we strip units if they are heavy?
                // For now, simple copy to get the app working.

                batch.set(doc(db, "subjects_metadata", subjectDoc.id), data);
                count++;
            });

            await batch.commit();
            alert(`Successfully synced ${count} subjects to metadata collection.`);
            // Reload to see the new data via the hook
            window.location.reload();
        } catch (error) {
            console.error("Sync error:", error);
            alert("Sync failed.");
        }
    };

    // Derived state for filters
    const branches = ['All', ...Array.from(new Set(subjects.map(s => s.branch).filter(Boolean)))].sort();
    const semesters = ['All', ...Array.from(new Set(subjects.map(s => s.semester).filter(Boolean)))].sort();

    const filteredSubjects = subjects.filter(subject => {
        const branchMatch = selectedBranch === 'All' || subject.branch === selectedBranch;
        const semesterMatch = selectedSemester === 'All' || subject.semester === selectedSemester;
        return branchMatch && semesterMatch;
    });

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Manage subjects and content.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-4 mr-4 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Payments
                            </span>
                            <button
                                onClick={togglePayment}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.isPaymentEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-600'}`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.isPaymentEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Duration (Months):
                            </span>
                            <input
                                type="number"
                                min="1"
                                value={settings.courseDurationMonths || 5}
                                onChange={async (e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    try {
                                        await fetch('/api/settings', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ...settings, courseDurationMonths: val }),
                                        });
                                        // Ideally we should update local state here too, but the hook will pick it up
                                    } catch (error) {
                                        console.error('Error updating duration:', error);
                                    }
                                }}
                                className="w-16 rounded-md border border-zinc-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/admin/reports')}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                    >
                        <Flag className="h-4 w-4" />
                        Reports
                    </button>

                    <button
                        onClick={() => router.push('/admin/feedback')}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Feedback
                    </button>

                    <button
                        onClick={() => setIsEnrollmentModalOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                    >
                        <BookOpen className="h-4 w-4" />
                        Enrollments
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                    >
                        <Upload className="h-4 w-4" />
                        Import JSON
                    </button>
                    <button
                        onClick={handleSyncMetadata}
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
                        title="Run this once to populate the new structure"
                    >
                        <Upload className="h-4 w-4" />
                        Sync Metadata
                    </button>

                </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden shadow-sm">
                <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">All Subjects ({filteredSubjects.length})</h2>

                    <div className="flex flex-wrap gap-2">
                        {/* Branch Filter */}
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            <option value="All">All Branches</option>
                            {branches.filter(b => b !== 'All').map(branch => (
                                <option key={branch} value={branch as string}>{branch}</option>
                            ))}
                        </select>

                        {/* Semester Filter */}
                        <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value)}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            <option value="All">All Semesters</option>
                            {semesters.filter(s => s !== 'All').map(sem => (
                                <option key={sem} value={sem as string}>{sem}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredSubjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-zinc-100 p-4 mb-4 dark:bg-zinc-800">
                            <BookOpen className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400">No subjects found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredSubjects.map((subject) => (
                            <div key={subject.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{subject.title}</h3>
                                        {subject.price && (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                ₹{subject.price}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {subject.unitCount} Units • {subject.questionCount} Questions
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => router.push(`/${subject.id}`)}
                                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => setEditingSubject(subject)}
                                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(subject.id)}
                                        className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                        title="Delete Subject"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <JsonImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />

            <EditSubjectModal
                isOpen={!!editingSubject}
                onClose={() => setEditingSubject(null)}
                subject={editingSubject}
                onUpdate={() => window.location.reload()} // Simple reload to refresh data
            />

            <AdminEnrollmentModal
                isOpen={isEnrollmentModalOpen}
                onClose={() => setIsEnrollmentModalOpen(false)}
                subjects={subjects}
            />
        </div>
    );
}
