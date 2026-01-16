"use client";

import { useState, useRef, useEffect } from "react";
import { Channel } from "@/hooks/useBranchChat";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    setDoc,
    Timestamp
} from "firebase/firestore";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Send, Loader2, ArrowLeft, X, Check, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { containsProfanity } from "@/lib/profanityFilter";
import { MessageMenu } from "./MessageMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteMessageDialog } from "./DeleteMessageDialog";
import { useChannelMessages } from "@/hooks/useChannelMessages";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

interface ChatAreaProps {
    channel: Channel;
    onBack: () => void;
}

export function ChatArea({ channel, onBack }: ChatAreaProps) {
    const { user } = useAuth();
    const { messages, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useChannelMessages(channel.id);

    // Local UI State
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [editingDetails, setEditingDetails] = useState<{ id: string, text: string } | null>(null);
    const [updating, setUpdating] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // Optimistic UI State
    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

    // Virtuoso Ref
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Delete state
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Merge pending and server messages
    // Strategy: Filter out pending messages that have been confirmed (exist in 'messages')
    const combinedMessages = (() => {
        const serverIds = new Set(messages.map(m => m.id));
        const activePending = pendingMessages.filter(m => !serverIds.has(m.id));

        // Combine and Sort
        return [...messages, ...activePending].sort((a, b) => {
            const tA = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
            const tB = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
            return tA - tB;
        });
    })();

    // Cleanup pending messages that are confirmed or too old?
    // Actually the derived state `activePending` handles the "confirmed" part visually.
    // We should periodically clean `pendingMessages` state to avoid memory leaks if desired, 
    // but React state is small. Let's clean up on effect.
    useEffect(() => {
        if (pendingMessages.length === 0) return;
        const serverIds = new Set(messages.map(m => m.id));
        const remaining = pendingMessages.filter(m => !serverIds.has(m.id));
        if (remaining.length !== pendingMessages.length) {
            setPendingMessages(remaining);
        }
    }, [messages, pendingMessages]);

    const sendMessageLogic = async () => {
        if (!newMessage.trim() || !user) return;

        if (containsProfanity(newMessage)) {
            alert("Your message contains inappropriate language and cannot be sent.");
            return;
        }

        // 1. Prepare Data
        const text = newMessage.trim();
        const messagesRef = collection(db, "channels", channel.id, "messages");
        // Generate ID client-side
        const newMsgRef = doc(messagesRef);
        const newMsgId = newMsgRef.id;

        const baseMessageData = {
            text: text,
            senderId: user.uid,
            senderName: user.displayName || "Anonymous",
            senderPhotoURL: user.photoURL || undefined,
        };

        const replyData = replyingTo ? {
            replyToId: replyingTo.id,
            replyToSnippet: replyingTo.text.substring(0, 100),
            replyToSenderName: replyingTo.senderName,
            replyToSenderId: replyingTo.senderId
        } : {};

        // 2. Optimistic Update
        const optimisticMessage: Message = {
            id: newMsgId,
            ...baseMessageData,
            ...replyData,
            createdAt: Timestamp.now(), // Use real Timestamp for compatibility
            status: 'sending'
        };

        setPendingMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");
        setReplyingTo(null);

        // Scroll immediately
        requestAnimationFrame(() => {
            virtuosoRef.current?.scrollToIndex({ index: 10000, align: 'end', behavior: 'smooth' });
        });

        // 3. Send to Server
        // We use setDoc with the ID we generated
        try {
            await setDoc(newMsgRef, {
                ...baseMessageData,
                ...replyData,
                createdAt: serverTimestamp() // Server overwrites time
            });
            // Success! The snapshot listener will eventually pick it up.
            // When it picks it up, it will be in `messages`, so `activePending` will hide this optimistic one.

        } catch (error) {
            console.error("Error sending message:", error);
            // Mark as error
            setPendingMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, status: 'error' } : m));
            alert("Failed to send message.");
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessageLogic();
    };

    const handleDeleteClick = (messageId: string) => {
        setMessageToDelete(messageId);
    };

    const confirmDeleteMessage = async () => {
        if (!messageToDelete) return;
        const idToDelete = messageToDelete;
        setIsDeleting(true);

        try {
            await deleteDoc(doc(db, "channels", channel.id, "messages", idToDelete));
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message.");
        } finally {
            setIsDeleting(false);
            setMessageToDelete(null);
        }
    };

    const updateMessageWithArgs = async (id: string, text: string) => {
        if (!text.trim()) return;

        if (containsProfanity(text)) {
            alert("Your edited message contains inappropriate language.");
            return;
        }

        setUpdating(true);
        try {
            const msgRef = doc(db, "channels", channel.id, "messages", id);
            await updateDoc(msgRef, {
                text: text.trim(),
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

    const handleUpdateMessage = () => {
        // Keep for backward compat or just redirect
        if (editingDetails) {
            updateMessageWithArgs(editingDetails.id, editingDetails.text);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageLogic();
        }
    };

    // Render Item for Virtuoso
    const itemContent = (index: number, msg: Message) => {
        const isMe = msg.senderId === user?.uid;
        const prevMsg = combinedMessages[index - 1];
        const nextMsg = combinedMessages[index + 1];

        const isSameSenderPrev = prevMsg && prevMsg.senderId === msg.senderId;
        const isSameSenderNext = nextMsg && nextMsg.senderId === msg.senderId;
        const showAvatar = !isMe && (!isSameSenderPrev); // Avatar on last message of group? No, wait.
        // If !isMe:
        //  Avatar usually shown at bottom (next different). 
        //  Name shown at top (prev different).

        // Let's stick to previous logic:
        // Avatar logic in previous code:
        // {!isMe && !isSameSenderNext ? <Avatar ... /> : ...} -> Shown if next is different
        // Name logic:
        // {showName && ...} -> showName defined as !isMe && !isSameSenderPrev -> Shown if prev is different

        const showAvatarCalculated = !isMe && !isSameSenderNext;
        const showNameCalculated = !isMe && !isSameSenderPrev;

        return (
            <div className={cn(isSameSenderNext ? "mb-0.5" : "mb-4")}>
                <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showAvatar={showAvatarCalculated}
                    showName={showNameCalculated}
                    channelId={channel.id}
                    isEditing={editingDetails?.id === msg.id}
                    isUpdating={updating}
                    isSameSenderPrev={isSameSenderPrev}
                    isSameSenderNext={isSameSenderNext}
                    onReply={(m) => setReplyingTo(m)}
                    onEdit={(m) => setEditingDetails({ id: m.id, text: m.text })}
                    onDelete={(id) => handleDeleteClick(id)}
                    onUpdate={(id, text) => {
                        // We need to call handleUpdateMessage but it uses state `editingDetails` 
                        // which is updated via setEditingDetails.
                        // But `MessageBubble` calls `onUpdate` with the text directly.
                        // So we should update state then call update? 
                        // Or refactor handleUpdateMessage to accept args.
                        // Refactoring handleUpdateMessage below to accept args would be cleaner.
                        // For now, let's wrap it.
                        setEditingDetails({ id, text });
                        // The state update is async, so we can't call handleUpdateMessage immediately if it relies on state.
                        // Better: Refactor handleUpdateMessage to take args.
                        updateMessageWithArgs(id, text);
                    }}
                    onCancelEdit={() => setEditingDetails(null)}
                />
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col bg-zinc-50 dark:bg-black">
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

            <div className="flex-1 overflow-hidden relative"
                style={{
                    backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}>
                <div className="absolute inset-0 pointer-events-none bg-white/90 dark:bg-black/90 mix-blend-overlay z-0" />

                {isLoading && messages.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-10 space-y-2">
                        <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-2 rotate-3">
                            <span className="text-2xl">👋</span>
                        </div>
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm text-zinc-500">Be the first to say hello!</p>
                    </div>
                )}

                <Virtuoso
                    ref={virtuosoRef}
                    data={combinedMessages}
                    itemContent={itemContent}
                    startReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    firstItemIndex={Math.max(0, 10000 - combinedMessages.length)}
                    initialTopMostItemIndex={Math.max(0, 10000 - 1)}
                    followOutput="auto"
                    alignToBottom
                    className="h-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 z-10 relative"
                />
            </div>

            <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 z-20">
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Reply className="h-4 w-4 text-indigo-500 shrink-0" />
                            <div className="flex flex-col text-xs">
                                <span className="font-bold text-indigo-500">Replying to {replyingTo.senderName}</span>
                                <span className="truncate text-zinc-500 max-w-[200px] sm:max-w-md">{replyingTo.text}</span>
                            </div>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full">
                            <X className="h-4 w-4 text-zinc-500" />
                        </button>
                    </div>
                )}

                <div className="p-4 max-w-4xl mx-auto">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 pl-4 rounded-[24px] shadow-sm border border-transparent focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all dark:border-zinc-800"
                    >
                        <Textarea
                            value={newMessage}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={replyingTo ? "Type your reply..." : "Message..."}
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

            <DeleteMessageDialog
                isOpen={!!messageToDelete}
                onClose={() => setMessageToDelete(null)}
                onConfirm={confirmDeleteMessage}
                isDeleting={isDeleting}
            />
        </div>
    );
}
