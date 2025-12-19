"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WelcomeConfig {
    isEnabled: boolean;
    imageUrl?: string;
    title: string;
    message: string;
    ctaText: string;
}

export function useWelcomeAnnouncement() {
    const { user, branch, year, hasSeenWelcomeModal, markWelcomeModalAsSeen, loading: authLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<WelcomeConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Condition to trigger:
        // 1. Auth not loading
        // 2. User exists
        // 3. User has completed onboarding (branch & year exist)
        // 4. User has NOT seen modal yet
        if (!authLoading && user && branch && year && hasSeenWelcomeModal === false) {

            async function fetchConfig() {
                try {
                    setLoading(true);
                    // Fetch config from Firestore
                    const configDoc = await getDoc(doc(db, "settings", "welcomeAnnouncement"));

                    if (configDoc.exists()) {
                        const data = configDoc.data() as WelcomeConfig;
                        if (data.isEnabled) {
                            setConfig(data);
                            setIsOpen(true);
                        }
                    } else {
                        // Default Fallback (as requested by user instruction)
                        // Or if doc missing, maybe don't show?
                        // User said: "Assume there is an API endpoint or a Firebase Firestore document ... that returns this JSON structure"
                        // If it doesn't exist, I'll silently fail or use default for demo if needed.
                        // I will assume if it doesn't exist, we don't show it, to avoid showing unauthorized/unconfigured modals.
                        // BUT, for verification purposes, let's include the default mentioned in the prompt if missing, so it works immediately.
                        const defaultConfig: WelcomeConfig = {
                            isEnabled: true,
                            imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2342&auto=format&fit=crop", // Placeholder education image
                            title: "Welcome to Saraav Beta!",
                            message: "We are currently uploading detailed courses for your branch. Feel free to explore, but please note that content is still being added daily.",
                            ctaText: "Got it, thanks!"
                        };
                        setConfig(defaultConfig);
                        setIsOpen(true);
                    }
                } catch (error) {
                    console.error("Failed to fetch welcome announcement config:", error);
                } finally {
                    setLoading(false);
                }
            }

            fetchConfig();
        } else {
            setLoading(false);
            // If condition fails (e.g. user saw it), ensure closed.
            if (hasSeenWelcomeModal) {
                setIsOpen(false);
            }
        }
    }, [authLoading, user, branch, year, hasSeenWelcomeModal]);

    const handleClose = async () => {
        // 1. Close Modal
        setIsOpen(false);
        // 2. Update DB
        await markWelcomeModalAsSeen();
    };

    return {
        isOpen,
        loading,
        config,
        handleClose
    };
}
