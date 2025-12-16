"use client";

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useSettings() {
    const [settings, setSettings] = useState({ isPaymentEnabled: true, courseDurationMonths: 5 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "settings", "global"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSettings({
                    isPaymentEnabled: data.isPaymentEnabled ?? true,
                    courseDurationMonths: data.courseDurationMonths ?? 5
                });
            } else {
                // Default if doc doesn't exist yet
                setSettings({ isPaymentEnabled: true, courseDurationMonths: 5 });
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { settings, loading };
}
