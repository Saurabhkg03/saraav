import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
    collection,
    query,
    orderBy,
    limitToLast,
    getDocs,
    startAfter,
    onSnapshot,
    endBefore,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message } from "@/lib/types";

const MESSAGES_PER_PAGE = 20;

export function useChannelMessages(channelId: string) {
    const queryClient = useQueryClient();

    const fetchMessages = async ({ pageParam = null }: { pageParam?: any }) => {
        const messagesRef = collection(db, "channels", channelId, "messages");

        let q;
        if (pageParam) {
            // Load older messages (history)
            q = query(
                messagesRef,
                orderBy("createdAt", "asc"),
                endBefore(pageParam),
                limitToLast(MESSAGES_PER_PAGE)
            );
        } else {
            // Initial load (Latest messages)
            q = query(
                messagesRef,
                orderBy("createdAt", "asc"),
                limitToLast(MESSAGES_PER_PAGE)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Message[];
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
        isLoading
    } = useInfiniteQuery({
        queryKey: ["messages", channelId],
        queryFn: fetchMessages,
        getNextPageParam: (lastPage) => {
            if (!lastPage || lastPage.length < MESSAGES_PER_PAGE) return undefined;
            return lastPage[0]?.createdAt;
        },
        initialPageParam: null,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    // Realtime Listener
    useEffect(() => {
        if (!channelId || isLoading) return;

        // Determine anchor
        const cachedData = queryClient.getQueryData(["messages", channelId]) as any;
        let latestTimestamp = null;

        if (cachedData?.pages?.[0]?.length > 0) {
            const firstPage = cachedData.pages[0];
            latestTimestamp = firstPage[firstPage.length - 1].createdAt;
        }

        // If no data (and loaded), start from NOW to avoid fetching history as "new"
        if (!latestTimestamp) {
            latestTimestamp = Timestamp.now();
        }

        const messagesRef = collection(db, "channels", channelId, "messages");
        const q = query(
            messagesRef,
            orderBy("createdAt", "asc"),
            startAfter(latestTimestamp)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;

            const newMessages: Message[] = [];

            // Iterate over docChanges to only get added/modified docs.
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    newMessages.push({
                        id: change.doc.id,
                        ...change.doc.data()
                    } as Message);
                }
            });

            if (newMessages.length === 0) return;

            // Optimistically update the cache
            queryClient.setQueryData(["messages", channelId], (oldData: { pages: Message[][], pageParams: any[] } | undefined) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return {
                        pages: [newMessages],
                        pageParams: [null]
                    };
                }

                // Append to the newest page (index 0)
                // Filter out duplicates just in case some race occurred
                const existingIds = new Set(oldData.pages.flat().map((m: Message) => m.id));
                const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

                if (uniqueNewMessages.length === 0) return oldData;

                const newPages = [...oldData.pages];
                newPages[0] = [...newPages[0], ...uniqueNewMessages];

                return {
                    ...oldData,
                    pages: newPages
                };
            });
        });

        return () => unsubscribe();
    }, [channelId, isLoading, queryClient]);

    const flattenedMessages = data?.pages
        ? data.pages.flat().sort((a, b) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tA - tB; // Ascending order
        })
        : [];

    return {
        messages: flattenedMessages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    };
}
