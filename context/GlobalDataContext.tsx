"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface GlobalDataContextType {
    bundles: any[];
    loadingBundles: boolean;
}

const GlobalDataContext = createContext<GlobalDataContextType>({
    bundles: [],
    loadingBundles: true
});

export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
    const [bundles, setBundles] = useState<any[]>([]);
    const [loadingBundles, setLoadingBundles] = useState(true);

    useEffect(() => {
        // Set up real-time listener for bundles
        // persistent listener = low reads (only reads updates) + instant access
        const q = query(collection(db, "bundles"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const source = snapshot.metadata.fromCache ? "local cache" : "server";
            console.log(`[GlobalData] Bundles update received from ${source}.`);
            console.log(`[GlobalData] Total Documents: ${snapshot.size}`);

            if (snapshot.metadata.fromCache) {
                console.log(`[GlobalData] 🔥 READS SAVED! Loaded from cache. Cost: 0 reads.`);
            } else {
                const changes = snapshot.docChanges();
                console.log(`[GlobalData] ☁️  Data fetched from server.`);
                console.log(`[GlobalData] 💰 LOADING COST: ${changes.length} document reads (Modified/Added/Removed).`);
            }

            const bundlesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBundles(bundlesData);
            setLoadingBundles(false);
        }, (error) => {
            console.error("Error listening to bundles:", error);
            setLoadingBundles(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <GlobalDataContext.Provider value={{ bundles, loadingBundles }}>
            {children}
        </GlobalDataContext.Provider>
    );
}

export const useGlobalData = () => useContext(GlobalDataContext);
