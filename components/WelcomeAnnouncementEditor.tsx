"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, RotateCcw, ImageIcon, Upload } from 'lucide-react';
import Image from 'next/image';

interface WelcomeConfig {
    isEnabled: boolean;
    imageUrl: string;
    title: string;
    message: string;
    ctaText: string;
}

const DEFAULT_CONFIG: WelcomeConfig = {
    isEnabled: true,
    imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2342&auto=format&fit=crop",
    title: "Welcome to Saraav Beta!",
    message: "We are currently uploading detailed courses for your branch. Feel free to explore, but please note that content is still being added daily.",
    ctaText: "Got it, thanks!"
};

export function WelcomeAnnouncementEditor() {
    const [config, setConfig] = useState<WelcomeConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const docRef = doc(db, "settings", "welcomeAnnouncement");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Merge with default to ensure all fields exist
                setConfig({ ...DEFAULT_CONFIG, ...docSnap.data() } as WelcomeConfig);
            } else {
                // Keep default
                setConfig(DEFAULT_CONFIG);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "welcomeAnnouncement"), config);
            toast.success("Settings saved successfully");
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm("Reset to default settings?")) {
            setConfig(DEFAULT_CONFIG);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `welcome-modal/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('question-images')
                .getPublicUrl(filePath);

            setConfig(prev => ({ ...prev, imageUrl: publicUrl }));
            toast.success("Image uploaded successfully");
        } catch (error: any) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-500" />
                Welcome Modal Configuration
            </h2>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                    <div>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Enable Welcome Modal</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Show this modal to new users after onboarding</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${config.isEnabled ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                    <input
                        type="text"
                        required
                        value={config.title}
                        onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Welcome Title"
                    />
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Message</label>
                    <textarea
                        required
                        rows={4}
                        value={config.message}
                        onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 resize-none"
                        placeholder="Welcome message..."
                    />
                    <p className="text-xs text-zinc-500 mt-1">Supports simple text. Multi-line is supported.</p>
                </div>

                {/* Image URL */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Image URL</label>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={config.imageUrl}
                            onChange={(e) => setConfig(prev => ({ ...prev, imageUrl: e.target.value }))}
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            placeholder="https://example.com/image.jpg"
                        />
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                disabled={uploading}
                            />
                            <button
                                type="button"
                                disabled={uploading}
                                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 whitespace-nowrap"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Preview */}
                {config.imageUrl && (
                    <div className="relative h-48 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <Image
                            src={config.imageUrl}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized // Allow external URLs easily for now
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                    </div>
                )}

                {/* CTA Text */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Button Text</label>
                    <input
                        type="text"
                        required
                        value={config.ctaText}
                        onChange={(e) => setConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        placeholder="Got it!"
                    />
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset to Defaults
                    </button>
                </div>

            </form>
        </div>
    );
}
