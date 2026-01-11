"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, Trash, CheckCircle } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface MessageReport {
    id: string;
    messageId: string;
    messageContent: string;
    channelId: string;
    reportedBy: string;
    reportedUser: string;
    reason: string;
    details?: string;
    status: "pending" | "resolved";
    createdAt: any;
}

export default function AdminMessageReportsPage() {
    const [reports, setReports] = useState<MessageReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const q = query(collection(db, "message_reports"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: MessageReport[] = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as MessageReport);
            });
            setReports(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch user names for IDs in reports
    useEffect(() => {
        const fetchNames = async () => {
            const uidsToFetch = new Set<string>();
            reports.forEach(r => {
                if (!userNames[r.reportedBy]) uidsToFetch.add(r.reportedBy);
                if (!userNames[r.reportedUser]) uidsToFetch.add(r.reportedUser);
            });

            if (uidsToFetch.size === 0) return;

            const newNames: Record<string, string> = {};
            await Promise.all(Array.from(uidsToFetch).map(async (uid) => {
                try {
                    const userSnap = await getDoc(doc(db, "users", uid));
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        newNames[uid] = data.displayName || data.name || "Unknown User";
                    } else {
                        newNames[uid] = "Unknown User";
                    }
                } catch (e) {
                    console.error("Error fetching user:", uid, e);
                    newNames[uid] = "Error";
                }
            }));

            setUserNames(prev => ({ ...prev, ...newNames }));
        };

        if (reports.length > 0) {
            fetchNames();
        }
    }, [reports]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleResolve = async (reportId: string) => {
        setProcessing(reportId);
        try {
            await updateDoc(doc(db, "message_reports", reportId), {
                status: "resolved"
            });
        } catch (error) {
            console.error("Error resolving report:", error);
            alert("Failed to resolve report.");
        } finally {
            setProcessing(null);
        }
    };

    const handleDeleteMessage = async (report: MessageReport) => {
        if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return;
        setProcessing(report.id);
        try {
            // Delete the message
            await deleteDoc(doc(db, "channels", report.channelId, "messages", report.messageId));

            // Mark report as resolved
            await updateDoc(doc(db, "message_reports", report.id), {
                status: "resolved"
            });

            alert("Message deleted and report resolved.");
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Failed to delete message. It might have already been deleted.");
            // Even if message delete fails (maybe already deleted), we might want to resolve the report?
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Message Reports</h1>

            {reports.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    No reports found. Good job!
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className={`flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition-colors ${report.status === 'resolved'
                                    ? 'bg-zinc-50 border-zinc-100 opacity-60 dark:bg-zinc-900 dark:border-zinc-800'
                                    : 'bg-white border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${report.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {report.status.toUpperCase()}
                                        </span>
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                            {report.reason}
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            {new Date(report.createdAt?.seconds * 1000).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-xs text-zinc-500 flex gap-1">
                                        Reported by:
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            {userNames[report.reportedBy] || "Loading..."}
                                        </span>
                                        <span className="font-mono text-[10px] text-zinc-400">({report.reportedBy})</span>
                                        •
                                        Offender:
                                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                            {userNames[report.reportedUser] || "Loading..."}
                                        </span>
                                        <span className="font-mono text-[10px] text-zinc-400">({report.reportedUser})</span>
                                    </div>
                                    {report.details && (
                                        <p className="text-xs text-zinc-600 italic">"{report.details}"</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {report.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleResolve(report.id)}
                                                disabled={!!processing}
                                                className="h-8 gap-1"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                Dismiss
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteMessage(report)}
                                                disabled={!!processing}
                                                className="h-8 gap-1"
                                            >
                                                {processing === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
                                                Delete Msg
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
                                <MarkdownRenderer content={report.messageContent} className="text-sm max-h-32 overflow-y-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
