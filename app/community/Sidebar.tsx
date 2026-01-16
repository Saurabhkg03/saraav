import { Channel } from "@/hooks/useBranchChat";
import { cn } from "@/lib/utils";
import { Hash, Loader2, PlusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedChannelsForBranch } from "@/lib/seedChannels";
import { useState, useMemo } from "react";

interface SidebarProps {
    channels: Channel[];
    activeChannelId: string | null;
    onSelectChannel: (channelId: string) => void;
    loading: boolean;
    userBranch?: string;
    userYear?: string;
    className?: string;
}

export function Sidebar({ channels, activeChannelId, onSelectChannel, loading, userBranch, userYear, className }: SidebarProps) {
    const [seeding, setSeeding] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Toggle group expansion
    const toggleGroup = (year: string) => {
        setExpandedGroups(prev => ({ ...prev, [year]: !prev[year] }));
    };

    // Group channels by year
    const groupedChannels = useMemo(() => {
        const groups: Record<string, Channel[]> = {};
        channels.forEach(channel => {
            const year = channel.year || "General";
            if (!groups[year]) groups[year] = [];
            groups[year].push(channel);
        });

        // Helper to normalize year for comparison (e.g., "4th Year" vs "Fourth Year")
        const normalize = (y: string) => {
            if (!y) return "";
            return y.toLowerCase().replace(/^(1st|first)\s*year/i, "1")
                .replace(/^(2nd|second)\s*year/i, "2")
                .replace(/^(3rd|third)\s*year/i, "3")
                .replace(/^(4th|fourth)\s*year/i, "4");
        };

        const userYearNorm = normalize(userYear || "");

        // Sort groups: Put user's year first, then others sorted
        const sortedKeys = Object.keys(groups)
            .filter(year => year !== "General") // Hide legacy General group
            // Filter to show ONLY the user's year (handling formatting differences)
            .filter(year => !userYear || normalize(year) === userYearNorm)
            .sort((a, b) => {
                if (a === userYear) return -1;
                if (b === userYear) return 1;
                return a.localeCompare(b);
            });

        return sortedKeys.map(year => ({
            year,
            channels: groups[year]
        }));
    }, [channels, userYear]);

    // Initialize expanded state for all years
    useMemo(() => {
        if (groupedChannels.length > 0) {
            setExpandedGroups(prev => {
                const newState = { ...prev };
                groupedChannels.forEach(group => {
                    if (newState[group.year] === undefined) {
                        newState[group.year] = true;
                    }
                });
                return newState;
            });
        }
    }, [groupedChannels]);

    const handleSeed = async () => {
        if (!userBranch) return;
        setSeeding(true);
        await seedChannelsForBranch(userBranch);
        setSeeding(false);
    }

    const getYearColor = (year: string) => {
        const colors: Record<string, string> = {
            "First Year": "bg-gradient-to-br from-blue-400 to-blue-600",
            "Second Year": "bg-gradient-to-br from-emerald-400 to-emerald-600",
            "Third Year": "bg-gradient-to-br from-purple-400 to-purple-600",
            "Fourth Year": "bg-gradient-to-br from-orange-400 to-orange-600",
        };
        return colors[year] || "bg-gradient-to-br from-zinc-400 to-zinc-600";
    };

    const getYearInitials = (year: string) => {
        const map: Record<string, string> = {
            "First Year": "1st",
            "Second Year": "2nd",
            "Third Year": "3rd",
            "Fourth Year": "4th",
        };
        return map[year] || year.substring(0, 2).toUpperCase();
    }

    if (loading) {
        return (
            <div className={cn("border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col gap-2", className)}>
                <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 mb-4" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                ))}
            </div>
        );
    }

    if (channels.length === 0) {
        return (
            <div className={cn("border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50", className)}>
                <div className="mb-4">
                    <p className="text-xs font-bold uppercase text-zinc-500 break-words">{userBranch}</p>
                    <p className="text-xs text-zinc-400">{userYear}</p>
                </div>
                <p className="text-sm text-zinc-500 mb-4">No channels found.</p>
                {userBranch && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSeed}
                        disabled={seeding}
                        className="w-full gap-2"
                    >
                        {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        Initialize Channels
                    </Button>
                )}
            </div>
        )
    }

    return (
        <aside className={cn("flex flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50", className)}>
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/50">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 break-words leading-tight" title={userBranch}>
                    {userBranch}
                </h2>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4">
                {groupedChannels.map((group) => (
                    <div key={group.year} className="mb-6">
                        <button
                            onClick={() => toggleGroup(group.year)}
                            className="group flex w-full items-center justify-between px-2 py-2 mb-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900",
                                    getYearColor(group.year)
                                )}>
                                    {getYearInitials(group.year)}
                                </div>
                                <span className={cn(
                                    "text-sm font-bold uppercase tracking-wide transition-colors",
                                    expandedGroups[group.year]
                                        ? "text-zinc-900 dark:text-zinc-100"
                                        : "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-300"
                                )}>
                                    {group.year}
                                </span>
                            </div>

                            {expandedGroups[group.year] ? (
                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-zinc-400" />
                            )}
                        </button>

                        {expandedGroups[group.year] && (
                            <div className="ml-6 pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                {group.channels.map((channel) => (
                                    <button
                                        key={channel.id}
                                        onClick={() => onSelectChannel(channel.id)}
                                        className={cn(
                                            "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all",
                                            activeChannelId === channel.id
                                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-indigo-400 dark:ring-zinc-700"
                                                : "text-zinc-600 hover:bg-white hover:text-zinc-900 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                        )}
                                    >
                                        <Hash className={cn(
                                            "h-5 w-5 shrink-0",
                                            activeChannelId === channel.id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover:text-zinc-500"
                                        )} />
                                        <span className="truncate">{channel.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
