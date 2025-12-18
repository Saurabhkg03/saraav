"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchAnnouncements = async () => {
        try {
            const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Announcement[];
            setAnnouncements(data);

            if (data.length > 0) {
                const latestId = data[0].id;
                const lastSeenId = localStorage.getItem('lastSeenAnnouncementId');
                if (latestId !== lastSeenId) {
                    setHasUnread(true);
                }
            }
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
        // Poll every 5 minutes for new announcements
        const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && announcements.length > 0) {
            setHasUnread(false);
            localStorage.setItem('lastSeenAnnouncementId', announcements[0].id);
        }
    };

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
                    <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {announcements.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                                <div className="rounded-full bg-zinc-100 p-3 mb-2 dark:bg-zinc-800">
                                    <Bell className="h-6 w-6 text-zinc-400" />
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">No new announcements</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {announcements.map((announcement) => (
                                    <div key={announcement.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                        <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">{announcement.title}</h4>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap line-clamp-4">{announcement.content}</p>
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
