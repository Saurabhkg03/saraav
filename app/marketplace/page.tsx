import { adminDb } from "@/lib/firebase-admin";
import { SubjectMetadata } from "@/lib/types";
import { MarketplaceContent } from "@/components/MarketplaceContent";

export const revalidate = 3600; // Revalidate every hour

async function getBundles(): Promise<any[]> {
    try {
        const snapshot = await adminDb.collection("bundles").get();
        if (!snapshot.empty) {
            let bundles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Post-processing: Split "First Year" into Group A and Group B
            const firstYearBundleIndex = bundles.findIndex(b => b.branch === 'First Year' || b.id === 'First Year-First Year');

            if (firstYearBundleIndex !== -1) {
                const fyBundle = bundles[firstYearBundleIndex];
                const fySubjects = fyBundle.subjects || [];

                // Group A
                const subjectsA = fySubjects.filter((s: any) => s.group === 'A' || s.isCommon);
                const bundleA = {
                    ...fyBundle,
                    id: 'FirstYear-GroupA',
                    branch: 'First Year - Group A',
                    semester: 'First Year', // Keep consistent
                    subjects: subjectsA,
                    title: 'First Year - Group A',
                    subjectCount: subjectsA.length,
                    totalPrice: subjectsA.reduce((sum: number, s: any) => sum + (s.price || 0), 0),
                    totalOriginalPrice: subjectsA.reduce((sum: number, s: any) => sum + (s.originalPrice || s.price || 0), 0)
                };

                // Group B
                const subjectsB = fySubjects.filter((s: any) => s.group === 'B' || s.isCommon);
                const bundleB = {
                    ...fyBundle,
                    id: 'FirstYear-GroupB',
                    branch: 'First Year - Group B',
                    semester: 'First Year',
                    subjects: subjectsB,
                    title: 'First Year - Group B',
                    subjectCount: subjectsB.length,
                    totalPrice: subjectsB.reduce((sum: number, s: any) => sum + (s.price || 0), 0),
                    totalOriginalPrice: subjectsB.reduce((sum: number, s: any) => sum + (s.originalPrice || s.price || 0), 0)
                };

                // Remove original, add new ones
                bundles.splice(firstYearBundleIndex, 1, bundleA, bundleB);
            }

            return bundles;
        }

        console.log("Bundles collection empty. Attempting fallback generation...");

        // Fallback: Fetch metadata and aggregate on the fly (Self-healing)
        const metaSnapshot = await adminDb.collection("subjects_metadata").get();
        if (metaSnapshot.empty) {
            console.log("No subjects_metadata found either.");
            return [];
        }

        const groups: Record<string, any> = {};

        metaSnapshot.docs.forEach(docSnap => {
            const subject = { id: docSnap.id, ...docSnap.data() } as any;
            const branch = (subject.branch || "General").trim();
            const semester = (subject.semester || "All Semesters").trim();
            const key = `${branch}-${semester}`;

            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    branch,
                    semester,
                    subjects: [],
                    totalPrice: 0,
                    totalOriginalPrice: 0,
                    subjectCount: 0
                };
            }

            // Minimal subject data for the bundle
            groups[key].subjects.push({
                id: subject.id,
                title: subject.title,
                price: subject.price || 0,
                originalPrice: subject.originalPrice || 0,
                unitCount: subject.unitCount || 0,
                questionCount: subject.questionCount || 0,
                branch: subject.branch,
                semester: subject.semester,
                isElective: subject.isElective || false,
                electiveCategory: subject.electiveCategory || ""
            });

            groups[key].totalPrice += subject.price || 0;
            groups[key].totalOriginalPrice += subject.originalPrice || subject.price || 0;
            groups[key].subjectCount++;
        });

        const generatedBundles = Object.values(groups);

        // Attempt to heal Firestore asynchronously (don't await strictly if not needed, but for reliability we will)
        // Note: Batch limit is 500, we likely have fewer bundles
        if (generatedBundles.length > 0) {
            try {
                const batch = adminDb.batch();
                generatedBundles.forEach(bundle => {
                    const safeId = bundle.id.replace(/\//g, "_");
                    batch.set(adminDb.collection("bundles").doc(safeId), bundle);
                });
                await batch.commit();
                console.log(`Self-healed ${generatedBundles.length} bundles.`);
            } catch (e) {
                console.error("Failed to self-heal bundles:", e);
            }
        }

        return generatedBundles;

    } catch (error) {
        console.error("Error fetching bundles for marketplace:", error);
        return [];
    }
}

export default async function MarketplacePage() {
    const bundles = await getBundles();

    return (
        <MarketplaceContent initialBundles={bundles} />
    );
}
