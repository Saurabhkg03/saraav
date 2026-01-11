"use client";

import { useEffect, useState, useRef } from "react";
import { Channel } from "@/hooks/useBranchChat";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    limitToLast,
    deleteDoc,
    doc,
    updateDoc,
    getDocs,
    endBefore,
    DocumentSnapshot
} from "firebase/firestore";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Send, Loader2, ArrowLeft, ArrowUpCircle, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { containsProfanity } from "@/lib/profanityFilter";
import { MessageMenu } from "./MessageMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteMessageDialog } from "./DeleteMessageDialog";

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderPhotoURL?: string;
    createdAt: any;
    editedAt?: any;
    _doc?: DocumentSnapshot; // Internal use for pagination cursor
}

interface ChatAreaProps {
    channel: Channel;
    onBack: () => void;
}

const MESSAGES_PER_PAGE = 20;

export function ChatArea({ channel, onBack }: ChatAreaProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [editingDetails, setEditingDetails] = useState<{ id: string, text: string } | null>(null);
    const [updating, setUpdating] = useState(false);

    // Delete state
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Reset state on channel change
    useEffect(() => {
        setMessages([]);
        setLoadingMessages(true);
        // We set hasMore to false initially; it updates when data comes back
        // But if we switch channels, we should probably reset it safely.
        setHasMore(false);
    }, [channel.id]);

    // Subsection: Realtime Listener (Tail)
    useEffect(() => {
        setLoadingMessages(true);
        const messagesRef = collection(db, "channels", channel.id, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"), limitToLast(MESSAGES_PER_PAGE));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // If it's the first load for this channel (messages empty) and we got a full page, 
            // then there might be more history.
            if (messages.length === 0 && snapshot.docs.length >= MESSAGES_PER_PAGE) {
                setHasMore(true);
            }

            const snapshotDocs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _doc: doc
            } as Message));

            setMessages(prev => {
                const tailMap = new Map(snapshotDocs.map(m => [m.id, m]));
                // Keep history (items not in tail) -> Add Tail
                const history = prev.filter(m => !tailMap.has(m.id));
                const combined = [...history, ...snapshotDocs];
                return combined.sort((a, b) => {
                    const tA = a.createdAt?.seconds || 0;
                    const tB = b.createdAt?.seconds || 0;
                    return tA - tB;
                });
            });

            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [channel.id]);

    // Auto-scroll logic
    useEffect(() => {
        // Only auto-scroll if we are NOT loading history and messages exist
        if (!loadingMessages && !loadingMore && messages.length > 0) {
            if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;

                // Scroll if near bottom OR if we just loaded the initial batch (length <= per page + 1 buffer)
                if (isNearBottom || messages.length <= MESSAGES_PER_PAGE + 5) {
                    setTimeout(() => {
                        if (scrollContainerRef.current) {
                            scrollContainerRef.current.scrollTo({
                                top: scrollContainerRef.current.scrollHeight,
                                behavior: "smooth"
                            });
                        }
                    }, 100);
                }
            }
        }
    }, [messages.length, loadingMessages, loadingMore]);

    const handleLoadMore = async () => {
        if (loadingMore || messages.length === 0) return;

        const firstMsg = messages[0];
        if (!firstMsg._doc) return;

        // Capture current scroll height details to restore position
        const container = scrollContainerRef.current;
        const oldScrollHeight = container ? container.scrollHeight : 0;
        const oldScrollTop = container ? container.scrollTop : 0;

        setLoadingMore(true);
        try {
            const messagesRef = collection(db, "channels", channel.id, "messages");
            const q = query(
                messagesRef,
                orderBy("createdAt", "asc"),
                endBefore(firstMsg._doc),
                limitToLast(MESSAGES_PER_PAGE)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setHasMore(false);
                setLoadingMore(false);
                return;
            }

            if (snapshot.docs.length < MESSAGES_PER_PAGE) {
                setHasMore(false);
            }

            const newHistory = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                _doc: doc
            } as Message));

            setMessages(prev => [...newHistory, ...prev]);

            // Restore scroll position
            // We want the user to stay looking at the same message they were looking at (the top one previously)
            // New position = New Scroll Height - Old Scroll Height + Old Scroll Top? 
            // Actually simply: (New Height - Old Height) puts us at the start of the OLD content.
            // If we want to stay exactly where we were, we add Old Scroll Top.
            setTimeout(() => {
                if (container) {
                    const newScrollHeight = container.scrollHeight;
                    const heightDifference = newScrollHeight - oldScrollHeight;
                    container.scrollTop = heightDifference + oldScrollTop;
                }
            }, 0); // Immediate (after render)

        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        if (containsProfanity(newMessage)) {
            alert("Your message contains inappropriate language and cannot be sent.");
            return;
        }

        setSending(true);
        try {
            const messagesRef = collection(db, "channels", channel.id, "messages");
            await addDoc(messagesRef, {
                text: newMessage.trim(),
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                senderPhotoURL: user.photoURL || null,
                createdAt: serverTimestamp()
            });
            setNewMessage("");

            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: "smooth"
                    });
                }
            }, 100);
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const handleDeleteClick = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete) return;

        const idToDelete = messageToDelete;
        setIsDeleting(true);

        // Optimistic update: Remove from UI immediately
        setMessages(prev => prev.filter(m => m.id !== idToDelete));

        try {
            await deleteDoc(doc(db, "channels", channel.id, "messages", idToDelete));
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message.");
            // Ideally revert UI change here if it failed
        } finally {
            setIsDeleting(false);
            setMessageToDelete(null);
        }
    };

    const handleUpdateMessage = async () => {
        if (!editingDetails || !editingDetails.text.trim()) return;

        if (containsProfanity(editingDetails.text)) {
            alert("Your edited message contains inappropriate language.");
            return;
        }

        setUpdating(true);
        try {
            const msgRef = doc(db, "channels", channel.id, "messages", editingDetails.id);
            await updateDoc(msgRef, {
                text: editingDetails.text.trim(),
                editedAt: serverTimestamp()
            });
            setEditingDetails(null);
        } catch (error) {
            console.error("Error updating message:", error);
            alert("Failed to update message.");
        } finally {
            setUpdating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as any);
        }
    };

    return (
        <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:px-6 md:py-4">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 shrink-0" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 md:text-xl"># {channel.name}</h1>
                    {channel.description && (
                        <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">{channel.description}</p>
                    )}
                </div>
            </div>

            {/* Messages List */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6"
            >
                {/* Load More Button */}
                {hasMore && !loadingMessages && (
                    <div className="flex justify-center pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="text-xs text-zinc-500 hover:text-indigo-600 dark:text-zinc-400"
                        >
                            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ArrowUpCircle className="h-3 w-3 mr-2" />}
                            Load Previous Messages
                        </Button>
                    </div>
                )}

                {loadingMore && !hasMore && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    </div>
                )}

                {loadingMessages ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                        <p>No messages yet.</p>
                        <p className="text-sm">Be the first to say hello!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === user?.uid;
                        const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId;
                        const isEditingThis = editingDetails?.id === msg.id;

                        // Format Time
                        const timeString = msg.createdAt?.seconds
                            ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "";

                        return (
                            <div key={msg.id} className={cn("group flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                                {/* Avatar */}
                                <div className="flex-shrink-0 w-8 h-8 mt-1">
                                    {!isMe && showHeader ? (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.senderPhotoURL || ""} alt={msg.senderName} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                                                {msg.senderName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : !isMe && (
                                        <div className="w-8" />
                                    )}
                                </div>

                                <div className={cn("flex flex-col max-w-[85%]", isMe ? "items-end" : "items-start")}>
                                    {showHeader && !isMe && (
                                        <div className="flex items-baseline gap-2 mb-1 ml-1">
                                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                {msg.senderName}
                                            </span>
                                            <span className="text-[10px] text-zinc-400">
                                                {timeString}
                                            </span>
                                        </div>
                                    )}
                                    {showHeader && isMe && (
                                        <div className="flex items-baseline gap-2 mb-1 mr-1">
                                            <span className="text-[10px] text-zinc-400">{timeString}</span>
                                        </div>
                                    )}

                                    <div className={cn("flex items-end gap-2 w-full", isMe ? "justify-end" : "justify-start")}>
                                        {/* Action Menu Left (For Me) */}
                                        {isMe && !isEditingThis && (
                                            <div className="mr-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MessageMenu
                                                    isMe={true}
                                                    onEdit={() => setEditingDetails({ id: msg.id, text: msg.text })}
                                                    onDelete={() => handleDeleteClick(msg.id)}
                                                    messageId={msg.id}
                                                    messageContent={msg.text}
                                                    messageSenderId={msg.senderId}
                                                    channelId={channel.id}
                                                />
                                            </div>
                                        )}

                                        <div
                                            className={cn(
                                                "relative rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                isMe
                                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-tl-none",
                                                isEditingThis && "bg-white ring-2 ring-indigo-500 text-zinc-900 border-none px-2 py-2 w-full min-w-[300px]"
                                            )}
                                        >
                                            {isEditingThis ? (
                                                <div className="flex flex-col gap-2">
                                                    <Textarea
                                                        value={editingDetails.text}
                                                        onChange={(e) => setEditingDetails({ ...editingDetails, text: e.target.value })}
                                                        className="min-h-[60px] text-zinc-900 border-zinc-200 bg-white focus-visible:ring-0 p-0 shadow-none resize-none"
                                                        disabled={updating}
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingDetails(null)}
                                                            disabled={updating}
                                                            className="p-1 rounded-full hover:bg-zinc-100 text-zinc-500"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleUpdateMessage}
                                                            disabled={updating || !editingDetails.text.trim()}
                                                            className="p-1 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                                                        >
                                                            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={cn("prose prose-sm max-w-none break-words", isMe ? "prose-invert" : "dark:prose-invert")}>
                                                        <MarkdownRenderer content={msg.text} className={cn("text-sm", isMe ? "text-white" : "")} />
                                                    </div>
                                                    {msg.editedAt && (
                                                        <span className={cn("block text-[10px] mt-1 opacity-70 italic text-right", isMe ? "text-indigo-200" : "text-zinc-400")}>
                                                            (edited)
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Action Menu Right (For Others) */}
                                        {!isMe && (
                                            <div className="ml-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MessageMenu
                                                    isMe={false}
                                                    onEdit={() => { }} // No-op
                                                    onDelete={() => { }} // No-op
                                                    messageId={msg.id}
                                                    messageContent={msg.text}
                                                    messageSenderId={msg.senderId}
                                                    channelId={channel.id}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                {/* Scroll Anchor */}
                <div ref={bottomRef} className="h-px w-full" />
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message #${channel.name}...`}
                        className="min-h-[50px] resize-none bg-white focus-visible:ring-indigo-500 dark:bg-zinc-900 dark:focus-visible:ring-indigo-400"
                        rows={1}
                    />
                    <Button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        size="icon"
                        className="h-[50px] w-[50px] shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
                <div className="mt-2 text-center text-xs text-zinc-400">
                    <p>Markdown supported • Enter to send • Shift+Enter for new line</p>
                </div>
            </div>

            {/* Delete Dialog */}
            <DeleteMessageDialog
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={confirmDeleteMessage}
                isDeleting={isDeleting}
            />
        </div>
    );
}
