"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ReportMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    messageId: string;
    messageContent: string;
    messageSenderId: string;
    channelId: string;
}

const REPORT_REASONS = [
    "Harassment or bullying",
    "Hate speech",
    "Spam",
    "Inappropriate content",
    "Misinformation",
    "Other"
];

export function ReportMessageDialog({
    open,
    onOpenChange,
    messageId,
    messageContent,
    messageSenderId,
    channelId
}: ReportMessageDialogProps) {
    const { user } = useAuth();
    const [reason, setReason] = useState(REPORT_REASONS[0]);
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        if (!messageId || !channelId || !messageSenderId) {
            alert("Error: Missing message details.");
            setSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, "message_reports"), {
                messageId: messageId || "unknown",
                channelId: channelId || "unknown",
                messageContent: messageContent || "",
                reportedBy: user.uid,
                reportedUser: messageSenderId || "unknown",
                reason: reason || "Other",
                details: details || "",
                status: "pending",
                createdAt: serverTimestamp()
            });
            onOpenChange(false);
            alert("Thank you. The message has been reported to the admins.");
            setDetails("");
            setReason(REPORT_REASONS[0]);
        } catch (error: any) {
            console.error("Error submitting report:", error);
            alert(`Failed to submit report: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Report Message</DialogTitle>
                    <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Help us keep the community safe. Please tell us why you are reporting this message.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-zinc-900 dark:text-zinc-200">Reason</Label>
                        <NativeSelect
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-indigo-500/20"
                        >
                            {REPORT_REASONS.map(r => (
                                <option key={r} value={r} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{r}</option>
                            ))}
                        </NativeSelect>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="details" className="text-zinc-900 dark:text-zinc-200">Additional Details (Optional)</Label>
                        <Textarea
                            id="details"
                            placeholder="Please provide any extra context..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={3}
                            className="bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 resize-none focus-visible:ring-indigo-500/20"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            className="border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
