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
        <div className="flex h-full flex-col bg-zinc-50 dark:bg-black">
            {/* Header - Glassmorphism */}
            <div className="flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 md:px-6 md:py-4 z-10 sticky top-0">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2 shrink-0 rounded-full" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 md:text-xl leading-tight"># {channel.name}</h1>
                    {channel.description && (
                        <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">{channel.description}</p>
                    )}
                </div>
            </div>

            {/* Messages List - Background Pattern Optional */}
            <div
                ref={scrollContainerRef}
                className="relative flex-1 overflow-y-auto p-4 md:p-6 space-y-6 overscroll-contain"
                style={{
                    backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                    backgroundAttachment: "local" // So it scrolls
                }}
            >
                {/* Mask for dark mode dots */}
                <div className="absolute inset-0 pointer-events-none bg-white/90 dark:bg-black/90 mix-blend-overlay" />

                {/* Load More Button */}
                {hasMore && !loadingMessages && (
                    <div className="flex justify-center pt-2 relative z-10">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="rounded-full px-4 h-8 text-xs font-medium shadow-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <ArrowUpCircle className="h-3 w-3 mr-2" />}
                            Load History
                        </Button>
                    </div>
                )}

                {loadingMore && !hasMore && (
                    <div className="flex justify-center py-2 relative z-10">
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    </div>
                )}

                {loadingMessages ? (
                    <div className="flex h-full items-center justify-center relative z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-zinc-400 relative z-10 space-y-2">
                        <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-2 rotate-3">
                            <span className="text-2xl">👋</span>
                        </div>
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm text-zinc-500">Be the first to say hello!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 relative z-10 pb-4">
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === user?.uid;
                            const prevMsg = messages[index - 1];
                            const nextMsg = messages[index + 1];

                            const isSameSenderPrev = prevMsg && prevMsg.senderId === msg.senderId;
                            const isSameSenderNext = nextMsg && nextMsg.senderId === msg.senderId;

                            // Grouping Logic:
                            // Show Avatar if: Not me AND (Next is different OR Last message) -> Actually typical chat shows avatar at bottom of group
                            // Let's stick to standard: Avatar at Top of group or Bottom.
                            // WhatsApp/Telegram: No avatars in DM, usually avatars in Group.
                            // Let's do: Avatar at Top of group.
                            const showAvatar = !isMe && (!isSameSenderPrev);
                            const showName = !isMe && (!isSameSenderPrev);

                            // Bubble Corners
                            // Me: Top-Right is sharp if isSameSenderPrev is true? No.
                            // Standard: First in group has sharp distinct corner, middles are rounded, last is distinct?
                            // Simple approach: Me (Rounded-TR-None), Others (Rounded-TL-None) always.
                            // Refined: 
                            // Me: If same sender next, rounded-br-lg. If last, rounded-br-none (Tail).
                            // Actually simple is better: Always 'chat bubble' shape.

                            const isEditingThis = editingDetails?.id === msg.id;

                            // Format Time
                            const timeString = msg.createdAt?.seconds
                                ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : "";

                            return (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "group flex gap-2 max-w-3xl",
                                        isMe ? "self-end flex-row-reverse" : "self-start flex-row",
                                        isSameSenderNext ? "mb-0.5" : "mb-4" // Tighter grouping
                                    )}
                                    style={{ width: '100%' }} // Flex container needs width to align self
                                >
                                    {/* Avatar Column */}
                                    <div className="flex-shrink-0 w-8 flex flex-col justify-end">
                                        {!isMe && !isSameSenderNext ? (
                                            <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-black">
                                                <AvatarImage src={msg.senderPhotoURL || ""} alt={msg.senderName} />
                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                                    {msg.senderName.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        ) : !isMe && <div className="w-8" />}
                                        {/* Spacer if grouped */}
                                    </div>

                                    <div className={cn("flex flex-col max-w-[75%] sm:max-w-[65%]", isMe ? "items-end" : "items-start")}>
                                        {showName && (
                                            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 ml-1 mb-1">
                                                {msg.senderName}
                                            </span>
                                        )}

                                        <div className={cn("flex items-end gap-2 w-full", isMe ? "justify-end" : "justify-start")}>

                                            {/* Action Menu (My Side) */}
                                            {isMe && !isEditingThis && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
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
                                                    "relative px-3 py-1.5 shadow-sm text-[14.5px] leading-relaxed break-words max-w-[75%]", // Reduced padding, slightly smaller text
                                                    isMe
                                                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" // My Bubble
                                                        : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-2xl rounded-tl-sm", // Other Bubble
                                                    isEditingThis && "bg-white ring-2 ring-indigo-500 text-zinc-900 border-none px-2 py-2 w-full min-w-[280px] rounded-xl"
                                                )}
                                            >
                                                {!isMe && showName && (
                                                    <p className="text-[11px] font-bold text-indigo-500 mb-0.5 opacity-90">{msg.senderName}</p>
                                                )}

                                                {isEditingThis ? (
                                                    <div className="flex flex-col gap-2">
                                                        {/* Edit form logic remains same, just ensuring wrapper is okay */}
                                                        <Textarea
                                                            value={editingDetails.text}
                                                            onChange={(e) => setEditingDetails({ ...editingDetails, text: e.target.value })}
                                                            className="min-h-[60px] text-sm bg-zinc-50 border-0 focus-visible:ring-0 resize-none p-2"
                                                            disabled={updating}
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingDetails(null)}
                                                                disabled={updating}
                                                                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={handleUpdateMessage}
                                                                disabled={updating || !editingDetails.text.trim()}
                                                                className="p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                                                            >
                                                                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <MarkdownRenderer content={msg.text} className={cn("text-[14.5px]", isMe ? "text-white" : "")} />
                                                        <div className={cn(
                                                            "flex items-center justify-end gap-1 mt-0.5 select-none", // Reduced top margin
                                                            isMe ? "text-indigo-100/70" : "text-zinc-400"
                                                        )}>
                                                            {msg.editedAt && (
                                                                <span className="text-[9px] italic">edited</span>
                                                            )}
                                                            <span className="text-[9px] tabular-nums leading-none">
                                                                {timeString}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Action Menu (Other Side) */}
                                            {!isMe && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                                    <MessageMenu
                                                        isMe={false}
                                                        onEdit={() => { }}
                                                        onDelete={() => { }}
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
                        })}
                    </div>
                )}
                {/* Scroll Anchor */}
                <div ref={bottomRef} className="h-px w-full" />
            </div>

            {/* Input Area - Static at bottom of flex column */}
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 z-20">
                <div className="max-w-4xl mx-auto">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 pl-4 rounded-[24px] shadow-sm border border-transparent focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all dark:border-zinc-800"
                    >
                        <Textarea
                            value={newMessage}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className="min-h-[44px] max-h-[120px] py-3 resize-none bg-transparent border-none focus-visible:ring-0 shadow-none text-base placeholder:text-zinc-400 flex-1"
                            rows={1}
                            style={{ height: 'auto' }}
                        />
                        <Button
                            type="submit"
                            disabled={sending || !newMessage.trim()}
                            size="icon"
                            className={cn(
                                "h-10 w-10 shrink-0 rounded-full transition-all mb-1 mr-1",
                                newMessage.trim()
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transform hover:scale-105 active:scale-95"
                                    : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                            )}
                        >
                            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
                        </Button>
                    </form>
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
