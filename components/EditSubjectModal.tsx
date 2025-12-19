"use client";

import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SubjectMetadata } from '@/lib/types';
import { updateBundle } from '@/lib/bundleUtils';

interface EditSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject: SubjectMetadata | null;
    onUpdate: () => void;
}

export function EditSubjectModal({ isOpen, onClose, subject, onUpdate }: EditSubjectModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        originalPrice: '',
        branch: '',
        semester: '',
        isElective: false,
        electiveCategory: ''
    });

    useEffect(() => {
        if (subject) {
            setFormData({
                title: subject.title || '',
                price: subject.price?.toString() || '',
                originalPrice: subject.originalPrice?.toString() || '',
                branch: subject.branch || '',
                semester: subject.semester || '',
                isElective: subject.isElective || false,
                electiveCategory: subject.electiveCategory || ''
            });
        }
    }, [subject]);

    if (!isOpen || !subject) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updates: any = {
                title: formData.title,
                branch: formData.branch,
                semester: formData.semester,
                isElective: formData.isElective,
                electiveCategory: formData.isElective ? formData.electiveCategory : null
            };

            if (formData.price) updates.price = parseFloat(formData.price);
            if (formData.originalPrice) updates.originalPrice = parseFloat(formData.originalPrice);

            await updateDoc(doc(db, "subjects", subject.id), updates);
            // Also update the lightweight metadata collection
            await updateDoc(doc(db, "subjects_metadata", subject.id), updates);

            await updateDoc(doc(db, "subjects_metadata", subject.id), updates);

            // Sync Bundles (Client-Side Automation)
            // 1. Sync the NEW bundle (where the subject is now)
            if (updates.branch && updates.semester) {
                await updateBundle(updates.branch, updates.semester);
            } else if (subject.branch && subject.semester) {
                // If branch/sem didn't change in form, use old ones to update that bundle
                await updateBundle(subject.branch, subject.semester);
            }

            // 2. If Branch/Semester CHANGED, we must also sync the OLD bundle to remove this subject from it
            const oldBranch = subject.branch;
            const oldSemester = subject.semester;
            const newBranch = updates.branch || oldBranch;
            const newSemester = updates.semester || oldSemester;

            if (oldBranch && oldSemester && (oldBranch !== newBranch || oldSemester !== newSemester)) {
                await updateBundle(oldBranch, oldSemester);
            }

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating subject:', error);
            alert('Failed to update subject');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Course</h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-zinc-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Course Title
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Price (Discounted)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-zinc-500">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 bg-white pl-7 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    placeholder="99"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Original Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-zinc-500">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.originalPrice}
                                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 bg-white pl-7 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    placeholder="499"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Branch
                            </label>
                            <select
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            >
                                <option value="">Select Branch</option>
                                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                                <option value="Information Technology">Information Technology</option>
                                <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Electrical Engineering">Electrical Engineering</option>
                                <option value="Common Electives">Common Electives</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Semester
                            </label>
                            <select
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            >
                                <option value="">Select Semester</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                    <option key={sem} value={`Semester ${sem}`}>
                                        Semester {sem}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isElective"
                                checked={formData.isElective}
                                onChange={(e) => setFormData({ ...formData, isElective: e.target.checked })}
                                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isElective" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                This is an Elective Subject
                            </label>
                        </div>

                        {formData.isElective && (
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Elective Category
                                </label>
                                <div className="space-y-2">
                                    <select
                                        value={formData.electiveCategory}
                                        onChange={(e) => setFormData({ ...formData, electiveCategory: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Elective I">Elective I</option>
                                        <option value="Elective II">Elective II</option>
                                        <option value="Elective III">Elective III</option>
                                        <option value="Open Elective I">Open Elective I</option>
                                        <option value="Open Elective II">Open Elective II</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Or type custom category..."
                                        value={formData.electiveCategory}
                                        onChange={(e) => setFormData({ ...formData, electiveCategory: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
