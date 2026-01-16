"use client";

import { useState } from "react";
import { MoreVertical, Trash, Pencil, Flag, Reply } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportMessageDialog } from "./ReportMessageDialog";

interface MessageMenuProps {
    isMe: boolean;
    isMobile?: boolean; // Optional: Adjust UI for mobile if needed
    onReply: () => void;
    onEdit: () => void;
    onDelete: () => void;
    messageId: string;
    messageContent: string;
    messageSenderId: string;
    channelId: string;
}

export function MessageMenu({
    isMe,
    onReply,
    onEdit,
    onDelete,
    messageId,
    messageContent,
    messageSenderId,
    channelId
}: MessageMenuProps) {
    const [reportOpen, setReportOpen] = useState(false);

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 outline-none">
                    <MoreVertical className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={2.5} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMe ? "end" : "start"}>
                    <DropdownMenuItem onClick={onReply} className="gap-2 cursor-pointer">
                        <Reply className="h-4 w-4" />
                        Reply
                    </DropdownMenuItem>
                    {isMe ? (
                        <>
                            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                                <Trash className="h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </>
                    ) : (
                        <DropdownMenuItem onClick={() => setReportOpen(true)} className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                            <Flag className="h-4 w-4" />
                            Report
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <ReportMessageDialog
                open={reportOpen}
                onOpenChange={setReportOpen}
                messageId={messageId}
                messageContent={messageContent}
                messageSenderId={messageSenderId}
                channelId={channelId}
            />
        </>
    );
}
