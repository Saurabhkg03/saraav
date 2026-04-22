"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Users, BookOpen, Flag, LayoutGrid, RefreshCw, AlertTriangle, ChevronRight, TrendingUp, Package, Activity, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

interface TopSubject {
    courseId: string;
    count: number;
    title: string;
    branch: string;
}

interface TopBundle {
    bundleId: string;
    count: number;
}

interface DailyMetric {
    date: string;
    totalNewEnrollments?: number;
    questionsAttempted?: number;
    questionsDone?: number;
    loginSessions?: number;
}

interface AnalyticsData {
    totalUsers: number;
    totalEnrollments: number;
    pendingReports: number;
    activeSubjects: number;
    topSubjects: TopSubject[];
    topBundles: TopBundle[];
    dailyMetrics: DailyMetric[];
}

interface Visitor {
    uid: string;
    email: string | null;
    name: string | null;
    picture: string | null;
    lastVisitTime: any;
    visitCount: number;
}

interface UserDetails {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    purchasedCourseIds?: string[];
    purchases?: Record<string, any>;
    progressSummary: Record<string, {
        lastAccessed?: number;
        attempted: number;
        done: number;
        totalQuestionsInteracted: number;
    }>;
}

export default function AnalyticsPage() {
    const { isAdmin, loading: authLoading, user } = useAuth();
    const router = useRouter();

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'subjects' | 'bundles' | 'visitors'>('subjects');

    // Visitors State
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [visitorsLoading, setVisitorsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const [expandedVisitorId, setExpandedVisitorId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [isAdmin, authLoading, router]);

    const fetchAnalytics = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/analytics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                toast.error(result.error || 'Failed to fetch analytics');
            }
        } catch (error) {
            toast.error('Error loading analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchVisitors = async (date: string) => {
        if (!user) return;
        setVisitorsLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/visitors?date=${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setVisitors(result.data);
            } else {
                toast.error(result.error || 'Failed to fetch visitors');
            }
        } catch (error) {
            toast.error('Error loading visitors');
        } finally {
            setVisitorsLoading(false);
        }
    };

    const fetchUserDetails = async (uid: string) => {
        if (!user) return;
        setUserLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/users/${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setSelectedUser(result.data);
            } else {
                toast.error(result.error || 'Failed to fetch user details');
            }
        } catch (error) {
            toast.error('Error loading user details');
        } finally {
            setUserLoading(false);
        }
    };

    const handleExpandVisitor = (uid: string) => {
        if (expandedVisitorId === uid) {
            setExpandedVisitorId(null);
            setSelectedUser(null);
        } else {
            setExpandedVisitorId(uid);
            fetchUserDetails(uid);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAnalytics();
        }
    }, [isAdmin, user]);

    useEffect(() => {
        if (isAdmin && activeTab === 'visitors') {
            fetchVisitors(selectedDate);
        }
    }, [isAdmin, user, activeTab, selectedDate]);

    const handleSync = async () => {
        if (!user) return;
        if (!confirm('WARNING: Syncing historical data will deeply query all users in the database and consume extensive read operations. Execute this ONLY if data goes out of sync. Proceed?')) {
            return;
        }
        setSyncing(true);
        const loadingToast = toast.loading('Aggregating analytics data across all users...');
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/analytics/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Analytics successfully synchronized!', { id: loadingToast });
                fetchAnalytics();
            } else {
                toast.error(result.error || 'Sync failed', { id: loadingToast });
            }
        } catch (error) {
            toast.error('An error occurred during synchronization', { id: loadingToast });
        } finally {
            setSyncing(false);
        }
    };

    // Fill in missing days for charts with zero-values
    const getLast7DaysData = () => {
        const days: DailyMetric[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const existing = data?.dailyMetrics?.find(m => m.date === dateStr);
            days.push({
                date: dateStr,
                totalNewEnrollments: existing?.totalNewEnrollments || 0,
                questionsAttempted: existing?.questionsAttempted || 0,
                questionsDone: existing?.questionsDone || 0,
                loginSessions: existing?.loginSessions || 0,
            });
        }
        return days.map(d => ({
            ...d,
            label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        }));
    };

    const chartData = data ? getLast7DaysData() : [];

    const todayStats = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const yesterdayStats = chartData.length > 1 ? chartData[chartData.length - 2] : null;

    if (authLoading || (!data && loading)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Analytics</h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">Platform-wide statistics and metrics.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-900/20 dark:text-orange-400 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                        Sync Historical Data
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 group">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Users</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data?.totalUsers.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 group">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                            <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Gross Enrollments</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data?.totalEnrollments.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 group">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                            <LayoutGrid className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Subjects</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data?.activeSubjects.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 group cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 transition" onClick={() => router.push('/admin/reports')}>
                    <div className="flex items-center gap-4 w-full justify-between">
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                                <Flag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Reports</p>
                                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data?.pendingReports || 0}</h3>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-orange-500 transition-colors" />
                    </div>
                </div>
            </div>

            {/* Today's Snapshot */}
            {todayStats && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-indigo-950/30 dark:to-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Today&apos;s Sessions</p>
                        </div>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{todayStats.loginSessions || 0}</h3>
                        {yesterdayStats && (
                            <p className="text-xs text-zinc-400 mt-1">Yesterday: {yesterdayStats.loginSessions || 0}</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-emerald-950/30 dark:to-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Today&apos;s Questions Attempted</p>
                        </div>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{todayStats.questionsAttempted || 0}</h3>
                        {yesterdayStats && (
                            <p className="text-xs text-zinc-400 mt-1">Yesterday: {yesterdayStats.questionsAttempted || 0}</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-amber-950/30 dark:to-zinc-900">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Today&apos;s Questions Done</p>
                        </div>
                        <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{todayStats.questionsDone || 0}</h3>
                        {yesterdayStats && (
                            <p className="text-xs text-zinc-400 mt-1">Yesterday: {yesterdayStats.questionsDone || 0}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Enrollments Chart */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Daily Enrollments</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Last 7 days</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e4e4e7)" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13 }}
                                    labelStyle={{ fontWeight: 600 }}
                                />
                                <Bar dataKey="totalNewEnrollments" name="Enrollments" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Questions Activity Chart */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Question Activity</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Attempted vs. Completed — Last 7 days</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorAttempted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e4e4e7)" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13 }}
                                    labelStyle={{ fontWeight: 600 }}
                                />
                                <Area type="monotone" dataKey="questionsAttempted" name="Attempted" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAttempted)" />
                                <Area type="monotone" dataKey="questionsDone" name="Done" stroke="#10b981" fillOpacity={1} fill="url(#colorDone)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Sessions Chart */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">User Sessions</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Login sessions over the last 7 days</p>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e4e4e7)" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#a1a1aa" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13 }}
                                labelStyle={{ fontWeight: 600 }}
                            />
                            <Bar dataKey="loginSessions" name="Sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Subjects / Bundles Tabs */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                <div className="border-b border-zinc-200 dark:border-zinc-800 flex overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('subjects')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'subjects'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                    >
                        Top 5 Subjects
                    </button>
                    <button
                        onClick={() => setActiveTab('bundles')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'bundles'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                    >
                        Top 5 Bundles
                    </button>
                    <button
                        onClick={() => setActiveTab('visitors')}
                        className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'visitors'
                            ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                    >
                        Visitors List
                    </button>
                </div>

                {activeTab === 'subjects' && (
                    data?.topSubjects && data.topSubjects.length > 0 ? (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {data.topSubjects.map((subject, idx) => (
                                <div key={subject.courseId} className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                                            idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            idx === 1 ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300' :
                                            idx === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500' :
                                            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                        }`}>
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{subject.title}</h3>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{subject.branch}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                                        {subject.count.toLocaleString()} Enrollments
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 dark:text-zinc-400">
                            <BookOpen className="h-8 w-8 mb-3 opacity-20" />
                            <p>No enrollment data discovered.</p>
                            <p className="text-sm mt-1">Wait for users to enroll or sync historical data.</p>
                        </div>
                    )
                )}

                {activeTab === 'bundles' && (
                    data?.topBundles && data.topBundles.length > 0 ? (
                        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {data.topBundles.map((bundle, idx) => (
                                <div key={bundle.bundleId} className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                                            idx === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            idx === 1 ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300' :
                                            idx === 2 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500' :
                                            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                        }`}>
                                            #{idx + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-zinc-400" />
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{bundle.bundleId.replace(/-/g, ' → ').replace(/_/g, '/')}</h3>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                                        {bundle.count.toLocaleString()} Purchases
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 dark:text-zinc-400">
                            <Package className="h-8 w-8 mb-3 opacity-20" />
                            <p>No bundle purchase data yet.</p>
                            <p className="text-sm mt-1">Bundle tracking starts from the next purchase.</p>
                        </div>
                    )
                )}

                {activeTab === 'visitors' && (
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <Calendar className="h-5 w-5 text-zinc-400" />
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {visitorsLoading ? (
                            <div className="flex justify-center p-12">
                                <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
                            </div>
                        ) : visitors.length > 0 ? (
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                {visitors.map((v) => (
                                    <div key={v.uid} className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
                                        <div 
                                            className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                            onClick={() => handleExpandVisitor(v.uid)}
                                        >
                                            <div className="flex items-center gap-4">
                                                {v.picture ? (
                                                    <img src={v.picture} alt="" className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                        {v.name ? v.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{v.name || 'Anonymous User'}</h3>
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{v.email || v.uid}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div className="hidden sm:block">
                                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{v.visitCount} visits</p>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        Last: {v.lastVisitTime?._seconds ? new Date(v.lastVisitTime._seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                                                    </p>
                                                </div>
                                                <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${expandedVisitorId === v.uid ? 'rotate-90' : ''}`} />
                                            </div>
                                        </div>

                                        {expandedVisitorId === v.uid && (
                                            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800">
                                                {userLoading ? (
                                                    <div className="flex justify-center p-4">
                                                        <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
                                                    </div>
                                                ) : selectedUser && selectedUser.uid === v.uid ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">User Details</h4>
                                                            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                                <p><span className="font-medium">Total Courses Purchased:</span> {selectedUser.purchasedCourseIds?.length || 0}</p>
                                                                <p><span className="font-medium">UID:</span> {selectedUser.uid}</p>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Subject Progress</h4>
                                                            {Object.keys(selectedUser.progressSummary || {}).length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {Object.entries(selectedUser.progressSummary).map(([subjId, prog]) => (
                                                                        <div key={subjId} className="flex justify-between text-sm bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                                                                            <span className="font-medium truncate max-w-[150px]" title={subjId}>{subjId}</span>
                                                                            <span className="text-zinc-500">{prog.attempted} attempted, {prog.done} done</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-zinc-500">No progress recorded yet.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-zinc-500 p-4">Could not load details.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <Users className="h-8 w-8 mb-3 opacity-20" />
                                <p>No visitors recorded for this date.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
