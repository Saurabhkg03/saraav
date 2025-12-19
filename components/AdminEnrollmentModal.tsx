"use client";

import { useState, useEffect } from "react";
import { X, Save, CheckSquare, Loader2 } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface AdminEnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    subjects: any[]; // Kept for interface compatibility but ignored
}

interface Bundle {
    id: string;
    branch: string;
    semester: string;
    subjects: { id: string; title: string }[];
}

export function AdminEnrollmentModal({ isOpen, onClose }: AdminEnrollmentModalProps) {
    const { user, purchasedCourseIds } = useAuth();
    // selectedSubjectIds tracks the IDs of all subjects the user "should" have after saving
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Bundles on mount/open
    useEffect(() => {
        if (isOpen) {
            const fetchBundles = async () => {
                setLoading(true);
                try {
                    const snap = await getDocs(collection(db, "bundles"));
                    const fetched = snap.docs.map(d => d.data() as Bundle);
                    // Sort bundles logically: Branch then Semester
                    fetched.sort((a, b) => {
                        if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
                        return a.semester.localeCompare(b.semester);
                    });
                    setBundles(fetched);
                } catch (e) {
                    console.error("Failed to fetch bundles", e);
                    toast.error("Failed to load bundles");
                } finally {
                    setLoading(false);
                }
            };

            fetchBundles();
            // Initialize local selection state with current user holdings
            setSelectedSubjectIds(purchasedCourseIds || []);
        }
    }, [isOpen, purchasedCourseIds]);

    if (!isOpen || !user) return null;

    // Toggle Bundle: Select All or Deselect All subjects in the bundle
    const toggleBundle = (bundle: Bundle) => {
        const bundleSubjectIds = bundle.subjects.map(s => s.id);

        // Check if fully selected
        const isFullySelected = bundleSubjectIds.every(id => selectedSubjectIds.includes(id));

        if (isFullySelected) {
            // Remove all
            setSelectedSubjectIds(prev => prev.filter(id => !bundleSubjectIds.includes(id)));
        } else {
            // Add all (ensure no duplicates)
            const newIds = new Set([...selectedSubjectIds, ...bundleSubjectIds]);
            setSelectedSubjectIds(Array.from(newIds));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);

            // Determine diff
            const toAdd = selectedSubjectIds.filter(id => !purchasedCourseIds.includes(id));
            const toRemove = purchasedCourseIds.filter(id => !selectedSubjectIds.includes(id));

            // Perform updates
            // Use Promise.all for speed, though Firestore limits write rate to single doc. 
            // Sequential is safer for simple race conditions on the same field.
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

            toast.success("Enrollments updated successfully");
            window.location.reload(); // Hard reload to force context refresh and ensure consistency
        } catch (error) {
            console.error("Error updating enrollments:", error);
            toast.error("Failed to update enrollments");
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            Manage Bundles
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Enroll in complete semester bundles for testing.
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
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {bundles.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500">No bundles found. Sync bundles first.</div>
                            ) : (
                                bundles.map((bundle) => {
                                    // A bundle is Checked if ALL its subjects are in selectedSubjectIds
                                    const allSubjects = bundle.subjects.map(s => s.id);
                                    const isSelected = allSubjects.length > 0 && allSubjects.every(id => selectedSubjectIds.includes(id));
                                    // Partial check could be UI enhancement, but KISS: fully owned or not.

                                    return (
                                        <div
                                            key={bundle.id}
                                            onClick={() => toggleBundle(bundle)}
                                            className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                        >
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                                    {bundle.branch}
                                                </h3>
                                                <p className="text-xs text-zinc-500">
                                                    {bundle.semester} • {bundle.subjects.length} Subjects
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
                                })
                            )}
                        </div>
                    )}
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
