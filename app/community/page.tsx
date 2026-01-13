"use client";

import { useState, useEffect } from "react";
import { useBranchChat } from "@/hooks/useBranchChat";
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { MessageSquare, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
    const { user, branch, year } = useAuth();
    const { channels, loading, requiresSetup } = useBranchChat();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [showMobileChat, setShowMobileChat] = useState(false);

    // Auto-select first channel when channels load (Desktop only behavior effectively, but keeps state sync)
    // We don't want to auto-open chat on mobile on load, so don't set showMobileChat here.
    useEffect(() => {
        if (channels.length > 0 && !activeChannelId) {
            setActiveChannelId(channels[0].id);
        }
    }, [channels, activeChannelId]);

    const activeChannel = channels.find(c => c.id === activeChannelId);

    const handleChannelSelect = (channelId: string) => {
        setActiveChannelId(channelId);
        setShowMobileChat(true); // Open chat on mobile
    };

    const handleMobileBack = () => {
        setShowMobileChat(false); // Go back to list on mobile
    }

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
        <div className="relative flex h-[calc(105dvh-4rem-100px)] lg:h-[calc(100dvh-4rem)] overflow-hidden bg-white dark:bg-zinc-950">
            {/* Sidebar: Visible on Desktop OR when Mobile Chat is CLOSED */}
            <div className={cn(
                "h-full w-full md:w-64 md:flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800",
                showMobileChat ? "hidden md:block" : "block"
            )}>
                <Sidebar
                    channels={channels}
                    activeChannelId={activeChannelId}
                    onSelectChannel={handleChannelSelect}
                    loading={loading}
                    userBranch={branch}
                    userYear={year}
                    className="w-full h-full"
                />
            </div>

            {/* Main Content: Visible on Desktop OR when Mobile Chat is OPEN */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 h-full",
                showMobileChat ? "block" : "hidden md:block"
            )}>
                {activeChannel ? (
                    <ChatArea
                        channel={activeChannel}
                        onBack={handleMobileBack}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/20">
                        {loading ? (
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600" />
                        ) : (
                            <div className="text-center text-zinc-500 p-4">
                                <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-20" />
                                <p className="hidden md:block">Select a channel to start chatting</p>
                                {/* Mobile placeholder if somehow here */}
                                <Button onClick={() => setShowMobileChat(false)} className="md:hidden mt-4" variant="outline">
                                    Go to Channels
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
