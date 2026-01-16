"use client";

import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageMenu } from "./MessageMenu";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Textarea } from "@/components/ui/textarea";
import { X, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface MessageBubbleProps {
    message: Message;
    isMe: boolean;
    showAvatar: boolean;
    showName: boolean;
    channelId: string;
    isEditing: boolean;
    isUpdating: boolean;
    isSameSenderPrev?: boolean;
    isSameSenderNext?: boolean;
    onReply: (message: Message) => void;
    onEdit: (message: Message) => void;
    onDelete: (messageId: string) => void;
    onUpdate: (id: string, newText: string) => void;
    onCancelEdit: () => void;
}

export function MessageBubble({
    message: msg,
    isMe,
    showAvatar,
    showName,
    channelId,
    isEditing,
    isUpdating,
    isSameSenderPrev,
    isSameSenderNext,
    onReply,
    onEdit,
    onDelete,
    onUpdate,
    onCancelEdit
}: MessageBubbleProps) {
    const [editText, setEditText] = useState(msg.text);

    // Sync editText if message text changes or editing state changes
    useEffect(() => {
        setEditText(msg.text);
    }, [msg.text, isEditing]);

    const timeString = msg.createdAt?.seconds
        ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (msg.status === 'sending' ? 'Sending...' : '');

    const smartRadius = isMe
        ? cn(
            "rounded-2xl",
            isSameSenderPrev ? "rounded-tr-md" : "rounded-tr-sm",
            isSameSenderNext ? "rounded-br-md" : "rounded-br-2xl"
        )
        : cn(
            "rounded-2xl",
            isSameSenderPrev ? "rounded-tl-md" : "rounded-tl-sm",
            isSameSenderNext ? "rounded-bl-md" : "rounded-bl-2xl"
        );

    return (
        <div
            className={cn(
                "group flex gap-2 max-w-3xl",
                isMe ? "self-end flex-row-reverse" : "self-start flex-row",
            )}
            style={{
                width: '100%',
                marginLeft: isMe ? 'auto' : 0,
                marginRight: isMe ? 0 : 'auto',
                paddingLeft: '1rem',
                paddingRight: '1rem',
            }}
        >
            <div className="flex-shrink-0 w-8 flex flex-col justify-end">
                {showAvatar ? (
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-black">
                        <AvatarImage src={msg.senderPhotoURL || ""} alt={msg.senderName} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            {msg.senderName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                ) : !isMe && <div className="w-8" />}
            </div>

            <div className={cn("flex flex-col max-w-[75%] sm:max-w-[65%]", isMe ? "items-end" : "items-start")}>
                {showName && (
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 ml-1 mb-1">
                        {msg.senderName}
                    </span>
                )}

                <div className={cn("flex items-end gap-2 w-full", isMe ? "justify-end" : "justify-start")}>
                    {isMe && !isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
                            <MessageMenu
                                isMe={true}
                                onEdit={() => onEdit(msg)}
                                onDelete={() => onDelete(msg.id)}
                                onReply={() => onReply(msg)}
                                messageId={msg.id}
                                messageContent={msg.text}
                                messageSenderId={msg.senderId}
                                channelId={channelId}
                            />
                        </div>
                    )}

                    <div
                        className={cn(
                            "relative px-3 py-1.5 shadow-sm text-[14.5px] leading-relaxed break-words max-w-full",
                            isMe
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
                            smartRadius,
                            isEditing && "bg-white ring-2 ring-indigo-500 text-zinc-900 border-none px-2 py-2 w-full min-w-[280px] rounded-xl",
                            msg.status === 'sending' && "opacity-70"
                        )}
                    >
                        {msg.replyToId && !isEditing && (
                            <div className={cn(
                                "mb-1 rounded border-l-2 p-1 text-xs opacity-90",
                                isMe ? "bg-indigo-700/50 border-indigo-300" : "bg-zinc-100 dark:bg-zinc-700/50 border-indigo-500"
                            )}>
                                <div className="font-bold mb-0.5 text-[10px]">{msg.replyToSenderName}</div>
                                <div className="line-clamp-1 opacity-80">{msg.replyToSnippet}</div>
                            </div>
                        )}

                        {!isMe && showName && (
                            <p className="text-[11px] font-bold text-indigo-500 mb-0.5 opacity-90">{msg.senderName}</p>
                        )}

                        {isEditing ? (
                            <div className="flex flex-col gap-2">
                                <Textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="min-h-[60px] text-sm bg-zinc-50 border-0 focus-visible:ring-0 resize-none p-2"
                                    disabled={isUpdating}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={onCancelEdit}
                                        disabled={isUpdating}
                                        className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onUpdate(msg.id, editText)}
                                        disabled={isUpdating || !editText.trim()}
                                        className="p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                                    >
                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <MarkdownRenderer content={msg.text} className={cn("text-[14.5px]", isMe ? "text-white" : "")} />
                                <div className={cn(
                                    "flex items-center justify-end gap-1 mt-0.5 select-none",
                                    isMe ? "text-indigo-100/70" : "text-zinc-400"
                                )}>
                                    {msg.editedAt && (
                                        <span className="text-[9px] italic">edited</span>
                                    )}
                                    <span className="text-[9px] tabular-nums leading-none">
                                        {timeString}
                                    </span>
                                    {msg.status === 'error' && (
                                        <span className="text-[9px] text-red-500 font-bold">Failed</span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {!isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity px-1">
                            <MessageMenu
                                isMe={false}
                                onEdit={() => { }} // Sender other than me cannot edit
                                onDelete={() => { }} // Handle report or delete if admin? MessageMenu has logic
                                onReply={() => onReply(msg)}
                                messageId={msg.id}
                                messageContent={msg.text}
                                messageSenderId={msg.senderId}
                                channelId={channelId}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
