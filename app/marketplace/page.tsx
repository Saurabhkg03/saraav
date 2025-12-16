import { adminDb } from "@/lib/firebase-admin";
import { SubjectMetadata } from "@/lib/types";
import { MarketplaceContent } from "@/components/MarketplaceContent";

export const revalidate = 3600; // Revalidate every hour

async function getSubjects(): Promise<SubjectMetadata[]> {
    try {
        const snapshot = await adminDb.collection("subjects_metadata").get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as SubjectMetadata[];
    } catch (error) {
        console.error("Error fetching subjects for marketplace:", error);
        return [];
    }
}

export default async function MarketplacePage() {
    const subjects = await getSubjects();

    return (
        <MarketplaceContent initialSubjects={subjects} />
    );
}
