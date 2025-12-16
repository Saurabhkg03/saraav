import { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import SubjectDetails from "@/components/SubjectDetails";

interface PageProps {
    params: Promise<{
        subjectId: string;
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { subjectId } = await params;

    try {
        const doc = await adminDb.collection("subjects").doc(subjectId).get();

        if (doc.exists) {
            const data = doc.data();
            return {
                title: `${data?.title || 'Subject'} - Saraav`,
                description: `Complete syllabus coverage, practice questions, and solutions for ${data?.title}.`,
            };
        }
    } catch (error) {
        console.error("Error generating metadata:", error);
    }

    return {
        title: "Subject - Saraav",
        description: "Subject details and study material.",
    };
}

export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    return <SubjectDetails subjectId={resolvedParams.subjectId} />;
}
