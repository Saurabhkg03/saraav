"use client";

import { useState, useEffect } from "react";
import { useBranchChat } from "@/hooks/useBranchChat";
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { MessageSquareOff, MessageSquare, Settings } from 'lucide-react';
import { X, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function CommunityPage() {
    const { user, branch, year } = useAuth();
    const { channels, loading, requiresSetup } = useBranchChat();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Auto-select first channel when channels load
    useEffect(() => {
        if (channels.length > 0 && !activeChannelId) {
            setActiveChannelId(channels[0].id);
        }
    }, [channels, activeChannelId]);

    const activeChannel = channels.find(c => c.id === activeChannelId);

    const handleChannelSelect = (channelId: string) => {
        setActiveChannelId(channelId);
        setIsMobileMenuOpen(false); // Close mobile menu on selection
    };

    if (requiresSetup) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-zinc-50 p-4 dark:bg-zinc-950">
                <div className="rounded-full bg-indigo-100 p-6 dark:bg-indigo-900/30">
                    <MessageSquare className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Join your Community</h1>
                <p className="max-w-md text-center text-zinc-500 dark:text-zinc-400">
                    To connect with your peers, you need to select your academic branch and year in your profile settings.
                    Community access is strictly isolated by branch and year.
                </p>
                <Link href="/profile">
                    <Button className="mt-4 gap-2">
                        <Settings className="h-4 w-4" />
                        Update Profile
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-zinc-950">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full">
                <Sidebar
                    channels={channels}
                    activeChannelId={activeChannelId}
                    onSelectChannel={handleChannelSelect}
                    loading={loading}
                    userBranch={branch}
                    userYear={year}
                    className="w-64"
                />
            </div>

            {/* Mobile Sidebar Drawer */}
            {isMobileMenuOpen && (
                <div className="absolute inset-0 z-50 flex md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative h-full w-3/4 max-w-xs bg-white dark:bg-zinc-900 shadow-xl animate-in slide-in-from-left duration-300">
                        <Sidebar
                            channels={channels}
                            activeChannelId={activeChannelId}
                            onSelectChannel={handleChannelSelect}
                            loading={loading}
                            userBranch={branch}
                            userYear={year}
                            className="w-full h-full border-none"
                        />
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col min-w-0">
                {activeChannel ? (
                    <ChatArea
                        channel={activeChannel}
                        onMobileMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/20">
                        {loading ? (
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600" />
                        ) : (
                            <div className="text-center text-zinc-500 p-4">
                                <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-20" />
                                <div className="md:hidden mb-4">
                                    <Button onClick={() => setIsMobileMenuOpen(true)} variant="outline">
                                        Open Channels
                                    </Button>
                                </div>
                                <p className="hidden md:block">Select a channel to start chatting</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
