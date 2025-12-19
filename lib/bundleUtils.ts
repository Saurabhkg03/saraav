
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Updates the bundle document for a specific Branch and Semester.
 * It fetches all subjects matching the criteria, aggregates them, and writes to 'bundles'.
 * If no subjects remain, it deletes the bundle document.
 */
export async function updateBundle(branch: string | undefined | null, semester: string | undefined | null) {
    if (!branch || !semester) return;

    const bundleKey = `${branch}-${semester}`;
    const safeId = bundleKey.replace(/\//g, "_");

    console.log(`Syncing bundle: ${safeId} (${branch} - ${semester})...`);

    try {
        const q = query(
            collection(db, "subjects_metadata"),
            where("branch", "==", branch),
            where("semester", "==", semester)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`No subjects left for ${safeId}, deleting bundle.`);
            await deleteDoc(doc(db, "bundles", safeId));
            return;
        }

        // Aggregate Data
        let totalPrice = 0;
        let totalOriginalPrice = 0;
        let subjectCount = 0;
        const subjectsList: any[] = [];

        snapshot.forEach(docSnap => {
            const s = docSnap.data();
            totalPrice += s.price || 0;
            totalOriginalPrice += s.originalPrice || s.price || 0;
            subjectCount++;

            subjectsList.push({
                id: docSnap.id,
                title: s.title,
                price: s.price || 0,
                originalPrice: s.originalPrice || 0,
                unitCount: s.unitCount || 0,
                questionCount: s.questionCount || 0,
                branch: s.branch,
                semester: s.semester,
                isElective: s.isElective || false,
                electiveCategory: s.electiveCategory || "",
                units: s.units || []
            });
        });

        const bundleData = {
            id: bundleKey,
            branch,
            semester,
            subjects: subjectsList,
            totalPrice,
            totalOriginalPrice,
            subjectCount,
            title: `${branch} - ${semester}`,
            updatedAt: new Date().toISOString() // Client-side timestamp
        };

        await setDoc(doc(db, "bundles", safeId), bundleData);
        console.log(`Bundle ${safeId} synced successfully with ${subjectCount} subjects.`);

    } catch (error) {
        console.error(`Failed to sync bundle ${safeId}:`, error);
        // We don't throw here to avoid blocking the UI flow, but we log it.
    }
}
