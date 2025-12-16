"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SubjectMetadata } from '@/lib/types';

export function useSubjects() {
    const [subjects, setSubjects] = useState<SubjectMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "subjects_metadata"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d
                } as SubjectMetadata;
            });
            setSubjects(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { subjects, loading };
}
