import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { YEARS } from "./constants";

export async function seedChannelsForBranch(branchName: string) {
    if (!branchName) return;

    console.log(`Seeding channels for ${branchName}...`);

    const channelsRef = collection(db, "channels");

    // 1. Cleanup legacy "off-topic" channels
    const legacyQ = query(channelsRef, where("branch", "==", branchName), where("name", "==", "off-topic"));
    const legacySnapshot = await getDocs(legacyQ);
    legacySnapshot.forEach(async (doc) => {
        console.log(`Deleting legacy channel: ${doc.id}`);
        await deleteDoc(doc.ref);
    });

    // 2. Seed Channels for each Year
    for (const year of YEARS) {
        // Check if channels already exist for this Branch + Year
        const q = query(
            channelsRef,
            where("branch", "==", branchName),
            where("year", "==", year)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            console.log(`Channels already exist for ${branchName} - ${year}`);
            continue;
        }

        const defaultChannels = [
            { name: "General", description: `General discussion for ${year} ${branchName}` },
            { name: "Doubts", description: `Ask questions and get help for ${year}` }
        ];

        for (const channel of defaultChannels) {
            await addDoc(channelsRef, {
                ...channel,
                branch: branchName,
                year: year,
                createdAt: serverTimestamp()
            });
        }
        console.log(`Created channels for ${branchName} - ${year}`);
    }

    console.log("Seeding complete!");
}
