"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { Send, Loader2, ArrowLeft, X, Check, Reply, Paperclip, FileIcon, XCircle } from "lucide-react";
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
import { compressImage } from "@/lib/imageCompression";
import { supabase } from "@/lib/supabase";

interface ChatAreaProps {
    channel: Channel;
    onBack: () => void;
}

const START_INDEX = 10000;

export function ChatArea({ channel, onBack }: ChatAreaProps) {
    const { user } = useAuth();
    const { messages, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useChannelMessages(channel.id);

    // Local UI State
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [editingDetails, setEditingDetails] = useState<{ id: string, text: string } | null>(null);
    const [updating, setUpdating] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);

    // File Attachment State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Optimistic UI State
    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

    // Virtuoso Ref
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Delete state
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Virtuoso Index Management ---
    // We use a stateful firstItemIndex to handle history prepending without shifting existing items.
    // When messages are appended (new real-time), firstItemIndex stays same.
    // When messages are prepended (history), firstItemIndex decreases.
    const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
    const earliestMessageId = useRef<string | null>(null);

    // Update firstItemIndex when history is loaded (prepended)
    useEffect(() => {
        if (messages.length > 0) {
            const currentEarliestId = messages[0].id;

            // Initial load
            if (earliestMessageId.current === null) {
                earliestMessageId.current = currentEarliestId;
                // If we want to start at START_INDEX for the *initial* set:
                // If initial set has N items. We want them to end at START_INDEX + N?
                // Or just start at START_INDEX?
                // Let's just stick to START_INDEX being the start of the *first loaded batch*.
                // So initial reset is not needed if we default to START_INDEX.
                // But we might want to shift it so the *bottom* is at a consistent place if needed?
                // No, starting at 10000 is fine.
            }
            // Check for prepend
            else if (currentEarliestId !== earliestMessageId.current) {
                // Determine how many items were prepended.
                // This is checking if the *head* changed.
                // We rely on 'messages' being sorted.
                // Note: This logic assumes 'messages' only grows (or stable updates).
                // If we delete the top message, this might misfire, but that's rare/acceptable.

                // We don't know exactly 'how many' were added just by ID change, 
                // but we can assume the length diff is purely prepend if we are fetching history.
                // However, real-time appends also change length.
                // So we need to track length too?
                // Actually, useChannelMessages is paginated.
                // When we `fetchNextPage`, `messages` grows by 20 at start.
                // We can assume if `messages[0].id` changed, it's a prepend.
                // But how many?
                // We can't easily know "how many" without previous length tracking.
                // Let's assume we need to track previous length?
                // Actually, if we just diff the length? 
                // Total length change = (new items at start) + (new items at end).
                // If we assume new items at end usually happens one by one or via subscription...
                // Ideally we'd separate the data sources.
            }
        }
    }, [messages]);

    // Better approach simply with `useMemo` over the `messages` dependency
    // We can't purely rely on effects for synchronous render consistency.
    // Let's use the standard "adjust for prepends" pattern with a ref.
    // We actually need to track the *previous* messages[0] to know if it changed.

    // Derived state for combination
    const combinedMessages = useMemo(() => {
        const serverIds = new Set(messages.map(m => m.id));
        const activePending = pendingMessages.filter(m => !serverIds.has(m.id));

        const all = [...messages, ...activePending].sort((a, b) => {
            const tA = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : Number.MAX_SAFE_INTEGER);
            const tB = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : Number.MAX_SAFE_INTEGER);
            if (tA !== tB) return tA - tB;
            const nA = (a.createdAt as any)?.nanoseconds || 0;
            const nB = (b.createdAt as any)?.nanoseconds || 0;
            return nA - nB;
        });
        return all;
    }, [messages, pendingMessages]);

    // Handle Index Shifting
    const prevMessagesLength = useRef(0);
    const prevFirstMessageId = useRef<string | null>(null);

    useEffect(() => {
        // If empty, reset
        if (messages.length === 0) return;

        const currentLength = messages.length;
        const currentFirstId = messages[0].id;

        // If this is the first non-empty load
        if (prevMessagesLength.current === 0) {
            prevMessagesLength.current = currentLength;
            prevFirstMessageId.current = currentFirstId;
            return;
        }

        // Detect Prepend: First message ID changed AND length increased
        // (Assuming we don't bulk delete from top)
        if (currentFirstId !== prevFirstMessageId.current && currentLength > prevMessagesLength.current) {
            const addedCount = currentLength - prevMessagesLength.current;
            // Decrease index to shift "up" into the empty space we reserved
            setFirstItemIndex(prev => prev - addedCount);
        }

        prevMessagesLength.current = currentLength;
        prevFirstMessageId.current = currentFirstId;
    }, [messages]);


    // Optimistic Cleanup
    useEffect(() => {
        if (pendingMessages.length === 0) return;
        const serverIds = new Set(messages.map(m => m.id));
        const remaining = pendingMessages.filter(m => !serverIds.has(m.id));
        if (remaining.length !== pendingMessages.length) {
            setPendingMessages(remaining);
        }
    }, [messages, pendingMessages]);

    const sendMessageLogic = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !user) return;


        if (containsProfanity(newMessage)) {
            alert("Your message contains inappropriate language and cannot be sent.");
            return;
        }

        // 1. Prepare Data
        const text = newMessage.trim();
        const messagesRef = collection(db, "channels", channel.id, "messages");
        const newMsgRef = doc(messagesRef);
        const newMsgId = newMsgRef.id;

        // 1.5 Handle File Uploads
        let attachments: { url: string, type: string, name: string }[] = [];

        if (selectedFiles.length > 0) {
            setIsUploading(true);
            try {
                const uploadPromises = selectedFiles.map(async (file) => {
                    const fileToUpload = await compressImage(file);
                    const formData = new FormData();
                    formData.append('file', fileToUpload);
                    formData.append('channelId', channel.id);
                    const token = await user.getIdToken();
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error || 'Upload failed');
                    }
                    const result = await response.json();
                    return { url: result.url, type: result.type, name: result.name };
                });
                attachments = await Promise.all(uploadPromises);
            } catch (err) {
                console.error("Failed to upload files", err);
                alert("Failed to upload files. Please try again.");
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        const baseMessageData: any = {
            text: text,
            senderId: user.uid,
            senderName: user.displayName || "Anonymous",
            senderPhotoURL: user.photoURL || undefined,
        };

        if (attachments.length > 0) {
            baseMessageData.attachments = attachments;
        }

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
            createdAt: Timestamp.now(),
            status: 'sending'
        };

        setPendingMessages(prev => [...prev, optimisticMessage]);
        setNewMessage("");
        setReplyingTo(null);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // 3. Send to Server
        try {
            await setDoc(newMsgRef, {
                ...baseMessageData,
                ...replyData,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
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
            const message = combinedMessages.find(m => m.id === idToDelete);
            if (message && message.attachments && message.attachments.length > 0) {
                const pathsToDelete = message.attachments.map(att => {
                    const url = new URL(att.url);
                    const match = url.pathname.match(/chat-attachments\/(.*)/);
                    return match ? decodeURIComponent(match[1]) : null;
                }).filter(p => p !== null) as string[];

                if (pathsToDelete.length > 0 && user) {
                    const token = await user.getIdToken();
                    await fetch('/api/delete-file', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ paths: pathsToDelete })
                    });
                }
            }
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageLogic();
        }
    };

    const itemContent = (index: number, msg: Message) => {
        const isMe = msg.senderId === user?.uid;
        const prevMsg = combinedMessages[index - 1];
        const nextMsg = combinedMessages[index + 1];

        const isSameSenderPrev = prevMsg && prevMsg.senderId === msg.senderId;
        const isSameSenderNext = nextMsg && nextMsg.senderId === msg.senderId;
        const showAvatarCalculated = !isMe && !isSameSenderNext;
        const showNameCalculated = !isMe && !isSameSenderPrev;

        return (
            <div className={cn(isSameSenderNext ? "mb-[2px]" : "mb-4")}>
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
                        setEditingDetails({ id, text });
                        updateMessageWithArgs(id, text);
                    }}
                    onCancelEdit={() => setEditingDetails(null)}
                />
            </div>
        );
    };

    return (
        <div className="flex h-full flex-col bg-zinc-50 dark:bg-black">
            <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/webp, application/pdf"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + selectedFiles.length > 3) {
                        alert("You can only attach up to 3 files.");
                        return;
                    }
                    const validFiles = files.filter(f => {
                        if (f.size > 5 * 1024 * 1024) {
                            alert(`File ${f.name} is too large (>5MB).`);
                            return false;
                        }
                        return true;
                    });
                    setSelectedFiles(prev => [...prev, ...validFiles]);
                    e.target.value = '';
                }}
            />

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
                    firstItemIndex={firstItemIndex}
                    initialTopMostItemIndex={combinedMessages.length - 1}
                    startReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    followOutput="smooth"
                    alignToBottom
                    className="h-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 z-10 relative"
                />
            </div>

            <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 z-20">
                {selectedFiles.length > 0 && (
                    <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
                        {selectedFiles.map((file, i) => (
                            <div key={i} className="relative group bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 w-24 h-24 flex-shrink-0 flex flex-col items-center justify-center">
                                <button
                                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                                {file.type.startsWith('image/') ? (
                                    <div className="w-full h-full relative">
                                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover rounded" />
                                    </div>
                                ) : (
                                    <FileIcon className="h-8 w-8 text-indigo-500 mb-1" />
                                )}
                                <span className="text-[10px] text-zinc-500 truncate w-full text-center">{file.name}</span>
                            </div>
                        ))}
                    </div>
                )}

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
                        className="flex items-end gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 pl-2 rounded-[24px] shadow-sm border border-transparent focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all dark:border-zinc-800"
                    >
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 shrink-0 rounded-full text-zinc-400 hover:text-indigo-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                            disabled={sending || isUploading || selectedFiles.length >= 3}
                        >
                            <Paperclip className="h-5 w-5" />
                        </Button>

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
                            disabled={sending || isUploading || (!newMessage.trim() && selectedFiles.length === 0)}
                            size="icon"
                            className={cn(
                                "h-10 w-10 shrink-0 rounded-full transition-all mb-1 mr-1",
                                (newMessage.trim() || selectedFiles.length > 0) && !sending && !isUploading
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transform hover:scale-105 active:scale-95"
                                    : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                            )}
                        >
                            {sending || isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
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

