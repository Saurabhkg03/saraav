"use client";

import { useState, useEffect } from "react";
import { X, Save, CheckSquare, Square } from "lucide-react";
import { Subject } from "@/lib/types";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface AdminEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: any[];
}

export function AdminEnrollmentModal({ isOpen, onClose, subjects }: AdminEnrollmentModalProps) {
    const { user, purchasedCourseIds } = useAuth();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(purchasedCourseIds);
        }
    }, [isOpen, purchasedCourseIds]);

    if (!isOpen || !user) return null;

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(pid => pid !== id)
                : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);

            // Determine what to add and what to remove
            const toAdd = selectedIds.filter(id => !purchasedCourseIds.includes(id));
            const toRemove = purchasedCourseIds.filter(id => !selectedIds.includes(id));

            // We can't do both arrayUnion and arrayRemove in a single update call for the same field usually,
            // or at least it's safer to do them sequentially or just set the array if we want to be exact.
            // However, Firestore doesn't support "set array" easily without overwriting other fields or race conditions.
            // Best approach: 
            // 1. If we want to exact match: read, modify, write (transaction).
            // 2. Or just two updates.

            // Let's do two updates if needed.
            if (toAdd.length > 0) {
                await updateDoc(userRef, {
                    purchasedCourseIds: arrayUnion(...toAdd)
                });
            }

            if (toRemove.length > 0) {
                await updateDoc(userRef, {
                    purchasedCourseIds: arrayRemove(...toRemove)
                });
            }

            window.location.reload(); // Reload to reflect changes in AuthContext
        } catch (error) {
            console.error("Error updating enrollments:", error);
            alert("Failed to update enrollments");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Manage My Enrollments
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Select courses to enroll in for testing purposes.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-6 max-h-[60vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {subjects.map((subject) => {
                            const isSelected = selectedIds.includes(subject.id);
                            return (
                                <div
                                    key={subject.id}
                                    onClick={() => toggleSelection(subject.id)}
                                    className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                >
                                    <div>
                                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {subject.title}
                                        </h3>
                                        <p className="text-xs text-zinc-500">
                                            {subject.branch || "General"} • {subject.semester || "All Semesters"}
                                        </p>
                                    </div>
                                    <div className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${isSelected
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                                        }`}>
                                        {isSelected && <CheckSquare className="h-4 w-4" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
