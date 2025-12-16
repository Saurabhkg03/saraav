"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, documentId, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SubjectMetadata } from '@/lib/types';
import { useAuth } from "@/context/AuthContext";

export function useDashboardData() {
    const { user, branch: userBranch, purchasedCourseIds } = useAuth();
    const [myCourses, setMyCourses] = useState<SubjectMetadata[]>([]);
    const [branchSubjects, setBranchSubjects] = useState<SubjectMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const myCoursesPromise = (async () => {
                    if (!purchasedCourseIds || purchasedCourseIds.length === 0) return [];

                    // Firestore 'in' limit is 30. If more, we might need multiple queries. 
                    // For now assuming < 30 active courses.
                    const chunks = [];
                    const chunkSize = 30;
                    for (let i = 0; i < purchasedCourseIds.length; i += chunkSize) {
                        chunks.push(purchasedCourseIds.slice(i, i + chunkSize));
                    }

                    const results: SubjectMetadata[] = [];
                    for (const chunk of chunks) {
                        const q = query(
                            collection(db, "subjects_metadata"),
                            where(documentId(), "in", chunk)
                        );
                        const snap = await getDocs(q);
                        snap.forEach(doc => results.push({ id: doc.id, ...doc.data() } as SubjectMetadata));
                    }
                    return results;
                })();

                const branchPromise = (async () => {
                    const results: SubjectMetadata[] = [];

                    // Fetch a small subset of subjects for discovery (Limit reads)
                    // The user requested "any 3 subjects", we'll fetch 10 to provide some variety for bundles
                    const q = query(
                        collection(db, "subjects_metadata"),
                        limit(10)
                    );

                    const snap = await getDocs(q);
                    snap.forEach(doc => results.push({ id: doc.id, ...doc.data() } as SubjectMetadata));

                    return results;
                })();

                const [courses, others] = await Promise.all([myCoursesPromise, branchPromise]);

                setMyCourses(courses);
                setBranchSubjects(others);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, userBranch, purchasedCourseIds]);

    return { myCourses, branchSubjects, loading };
}
