"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { QuestionProgress, QuestionStatus } from "@/lib/types";

export function useProgress(subjectId: string) {
    const { user } = useAuth();
    const [progressMap, setProgressMap] = useState<{ [key: string]: QuestionProgress }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !subjectId) {
            setProgressMap({});
            setLoading(false);
            return;
        }

        const docRef = doc(db, "users", user.uid, "progress", subjectId);
        const unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Handle migration from old array format if necessary, or just read new map
                if (data.questions) {
                    setProgressMap(data.questions);
                } else if (data.completedQuestions) {
                    // Migration logic (optional, or just treat as empty)
                    const migrated: { [key: string]: QuestionProgress } = {};
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data.completedQuestions.forEach((qid: string) => {
                        migrated[qid] = { status: 'easy', lastReviewed: Date.now(), isStarred: false };
                    });
                    setProgressMap(migrated);
                } else {
                    setProgressMap({});
                }
            } else {
                setProgressMap({});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, subjectId]);

    const updateStatus = async (questionId: string, status: QuestionStatus) => {
        if (!user) return;

        const now = Date.now();
        let nextReview = now;

        // SRS Logic
        if (status === 'hard') nextReview = now + 24 * 60 * 60 * 1000; // 1 day
        else if (status === 'medium') nextReview = now + 3 * 24 * 60 * 60 * 1000; // 3 days
        else if (status === 'easy') nextReview = now + 7 * 24 * 60 * 60 * 1000; // 7 days

        const newProgress: QuestionProgress = {
            ...progressMap[questionId],
            status,
            lastReviewed: now,
            nextReview,
        };

        const updatedMap = { ...progressMap, [questionId]: newProgress };
        setProgressMap(updatedMap); // Optimistic

        try {
            const docRef = doc(db, "users", user.uid, "progress", subjectId);
            await setDoc(docRef, { questions: updatedMap }, { merge: true });
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert would go here
        }
    };

    const toggleStar = async (questionId: string) => {
        if (!user) return;

        const current = progressMap[questionId] || {};
        const newIsStarred = !current.isStarred;

        const newProgress: QuestionProgress = {
            ...current,
            isStarred: newIsStarred
        };

        const updatedMap = { ...progressMap, [questionId]: newProgress };
        setProgressMap(updatedMap);

        try {
            const docRef = doc(db, "users", user.uid, "progress", subjectId);
            await setDoc(docRef, { questions: updatedMap }, { merge: true });
        } catch (error) {
            console.error("Error toggling star:", error);
        }
    };

    const saveNote = async (questionId: string, content: string) => {
        if (!user) return;
        try {
            const noteRef = doc(db, "users", user.uid, "notes", questionId);
            await setDoc(noteRef, { content, updatedAt: Date.now() });
        } catch (error) {
            console.error("Error saving note:", error);
            throw error;
        }
    };

    const getNote = async (questionId: string) => {
        if (!user) return "";
        try {
            const noteRef = doc(db, "users", user.uid, "notes", questionId);
            const snap = await getDoc(noteRef);
            return snap.exists() ? snap.data().content : "";
        } catch (error) {
            console.error("Error fetching note:", error);
            return "";
        }
    };

    return { progressMap, updateStatus, toggleStar, saveNote, getNote, loading };
}
