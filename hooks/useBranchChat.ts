import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

export interface Channel {
    id: string;
    name: string;
    description?: string;
    branch: string;
    year?: string;
    createdAt?: Timestamp;
}

export function useBranchChat() {
    const { user, branch, year } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setChannels([]);
            setLoading(false);
            return;
        }

        if (!branch || !year) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const channelsRef = collection(db, 'channels');
            // Query: Get channels for THIS branch (all years, grouping handled in UI)
            const q = query(
                channelsRef,
                where('branch', '==', branch)
                // where('year', '==', year) // Removed to allow fetching all years for grouping
                // orderBy('createdAt', 'asc') 
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedChannels: Channel[] = [];
                snapshot.forEach((doc) => {
                    fetchedChannels.push({ id: doc.id, ...doc.data() } as Channel);
                });
                // Simple client-side sort if needed
                fetchedChannels.sort((a, b) => a.name.localeCompare(b.name));

                setChannels(fetchedChannels);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching channels:", err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err: any) {
            console.error("Error setting up channel listener:", err);
            setError(err.message);
            setLoading(false);
        }

    }, [user, branch, year]);

    return {
        channels,
        loading,
        error,
        requiresSetup: !!user && !branch
    };
}
