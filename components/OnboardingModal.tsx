"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, GraduationCap } from 'lucide-react';

const BRANCHES = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Telecommunication",
    "Civil Engineering",
    "Mechanical Engineering",
    "Electrical Engineering"
];

const YEARS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year"
];

export function OnboardingModal() {
    const { user, branch, year, updateProfile, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loading && user && (!branch || !year)) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [user, branch, year, loading]);

    const handleSave = async () => {
        if (!selectedBranch || !selectedYear) return;

        setSaving(true);
        try {
            await updateProfile({
                branch: selectedBranch,
                year: selectedYear
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save profile", error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                        <GraduationCap className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">Welcome to Saraav!</h2>
                    <p className="mt-2 text-zinc-400">
                        To personalize your experience, please tell us your branch and year.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Select Branch</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Select Branch</option>
                            {BRANCHES.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Select Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">Select Year</option>
                            {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!selectedBranch || !selectedYear || saving}
                        className="w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Get Started'}
                    </button>
                </div>
            </div>
        </div>
    );
}
