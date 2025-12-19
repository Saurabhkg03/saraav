"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Megaphone, Loader2, Save, X, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { WelcomeAnnouncementEditor } from '@/components/WelcomeAnnouncementEditor';

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
}

export default function AnnouncementsPage() {
    const { isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'general' | 'welcome'>('general');

    // General Announcements State
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    const fetchAnnouncements = async () => {
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Announcement[];
            setAnnouncements(data);
        } catch (error) {
            console.error("Error fetching announcements:", error);
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin && activeTab === 'general') {
            fetchAnnouncements();
        }
    }, [isAdmin, activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        setSubmitting(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, 'announcements', editingId), {
                    title: formData.title,
                    content: formData.content,
                    updatedAt: serverTimestamp()
                });
                toast.success("Announcement updated successfully");
            } else {
                await addDoc(collection(db, 'announcements'), {
                    title: formData.title,
                    content: formData.content,
                    createdAt: serverTimestamp()
                });
                toast.success("Announcement created successfully");
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ title: '', content: '' });
            fetchAnnouncements();
        } catch (error: any) {
            console.error("Error saving announcement:", error);
            toast.error("Failed to save: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (announcement: Announcement) => {
        setEditingId(announcement.id);
        setFormData({ title: announcement.title, content: announcement.content });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            toast.success("Announcement deleted");
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (error: any) {
            toast.error("Failed to delete: " + error.message);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: '', content: '' });
    };

    if (authLoading || (!isAdmin && loading)) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Megaphone className="h-6 w-6 text-indigo-600" />
                            Announcements
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage system-wide notifications for users</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'general'
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
                            }`}
                    >
                        Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('welcome')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'welcome'
                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
                            }`}
                    >
                        <Settings className="h-4 w-4" />
                        Welcome Modal
                    </button>
                </div>
            </div>

            {activeTab === 'general' ? (
                <>
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            New Announcement
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
                    ) : announcements.length === 0 ? (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                            <Megaphone className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No announcements yet</h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Create your first announcement to notify users.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="group relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg mb-2">{announcement.title}</h3>
                                            <p className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{announcement.content}</p>
                                            <p className="mt-4 text-xs text-zinc-400">
                                                Posted: {announcement.createdAt?.toDate().toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(announcement)}
                                                className="rounded-lg p-2 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(announcement.id)}
                                                className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <WelcomeAnnouncementEditor />
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {editingId ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <button onClick={closeModal} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    placeholder="Important Update..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Content</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 resize-none"
                                    placeholder="Enter detailed announcement here..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {editingId ? 'Update' : 'Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
