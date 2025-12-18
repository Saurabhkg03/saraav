"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell, Loader2, ChevronDown } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, Timestamp, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
}

const PAGE_SIZE = 4;

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);

    // Track if we've done the initial load of the *content*
    const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // 1. Lightweight Check for Unread (Runs on mount and interval)
    const checkUnread = async () => {
        try {
            // Only fetch 1 doc to check timestamp/ID
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const latestDoc = snapshot.docs[0];
                const latestId = latestDoc.id;
                const lastSeenId = localStorage.getItem('lastSeenAnnouncementId');

                if (latestId !== lastSeenId) {
                    setHasUnread(true);
                }
            }
        } catch (error) {
            console.error("Error checking unread:", error);
        }
    };

    useEffect(() => {
        checkUnread();
        const interval = setInterval(checkUnread, 5 * 60 * 1000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    // 2. Fetch Content (Runs when opening or loading more)
    const loadAnnouncements = async (isInitial = false) => {
        if (loading || (!hasMore && !isInitial)) return;

        setLoading(true);
        try {
            let q;
            if (isInitial) {
                q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
            } else if (lastVisible) {
                q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
            } else {
                setLoading(false);
                return;
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Announcement[];

            if (isInitial) {
                setAnnouncements(data);
                if (data.length > 0) {
                    // If we just opened and loaded, we can mark as read locally immediately or waiting for close?
                    // Let's mark as read immediately upon 'seeing' the list.
                    localStorage.setItem('lastSeenAnnouncementId', data[0].id);
                    setHasUnread(false);
                }
            } else {
                setAnnouncements(prev => [...prev, ...data]);
            }

            setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PAGE_SIZE);
            if (isInitial) setHasLoadedInitial(true);

        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Opening
            if (!hasLoadedInitial) {
                loadAnnouncements(true);
            } else {
                // Already loaded, just clear unread if top one matches
                if (announcements.length > 0) {
                    localStorage.setItem('lastSeenAnnouncementId', announcements[0].id);
                    setHasUnread(false);
                }
            }
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="relative flex items-center justify-center rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950" />
                )}
            </button>

            {isOpen && (
                <div className="fixed left-4 right-4 top-20 md:absolute md:right-0 md:left-auto md:top-full md:mt-2 md:w-80 lg:w-96 rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 z-50 overflow-hidden">
                    <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {/* Loading State for Initial Fetch */}
                        {loading && !hasLoadedInitial && (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && hasLoadedInitial && announcements.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <div className="rounded-full bg-zinc-100 p-3 mb-2 dark:bg-zinc-800">
                                    <Bell className="h-6 w-6 text-zinc-400" />
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">No new announcements</p>
                            </div>
                        )}

                        {/* List */}
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">{announcement.title}</h4>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{announcement.content}</p>
                                    <p className="mt-2 text-xs text-zinc-400">
                                        {announcement.createdAt?.toDate().toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Load More / Footer */}
                        {hasLoadedInitial && announcements.length > 0 && (
                            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
                                {hasMore ? (
                                    <button
                                        onClick={() => loadAnnouncements(false)}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                                    >
                                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                                        Load previous announcements
                                    </button>
                                ) : (
                                    <p className="text-center text-xs text-zinc-400 py-2">No more announcements</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
