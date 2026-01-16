"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
    const { user, login, loading } = useAuth();
    const router = useRouter();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (user && !loading) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        try {
            await login();
            // Success toast handled in AuthContext or implied by redirect
        } catch (error: any) {
            toast.error("Login failed: " + error.message);
            setIsLoggingIn(false);
        }
    };

    if (loading) return null;

    return (
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-zinc-950">
            {/* ... (backgrounds unchanged) ... */}
            <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/30 blur-[100px] animate-pulse" />
            <div className="absolute -right-[10%] -bottom-[10%] h-[500px] w-[500px] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse delay-1000" />
            <div className="absolute left-[20%] top-[20%] h-[300px] w-[300px] rounded-full bg-pink-500/20 blur-[80px] animate-pulse delay-700" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-md px-4">
                {/* Back Button */}
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                {/* Login Card */}
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-white/20">
                    {/* ... (logo unchanged) ... */}
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 blur opacity-75" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl overflow-hidden ring-4 ring-white/10">
                                <Image
                                    src="/icon.png"
                                    alt="Logo"
                                    width={80}
                                    height={80}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
                            Welcome Back
                        </h1>
                        <p className="mb-8 text-zinc-400">
                            Sign in to access your courses, track progress, and unlock premium content.
                        </p>

                        <button
                            onClick={handleLogin}
                            disabled={isLoggingIn}
                            className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-4 font-semibold text-zinc-900 transition-all hover:bg-zinc-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? (
                                <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            <span>{isLoggingIn ? "Signing in..." : "Sign in with Google"}</span>
                            {!isLoggingIn && (
                                <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-50" />
                            )}
                        </button>

                        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
                            <div className="h-px w-8 bg-zinc-800" />
                            <span>Trusted by students from SGBAU</span>
                            <div className="h-px w-8 bg-zinc-800" />
                        </div>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="mt-8 flex justify-center gap-6 text-xs text-zinc-500">
                    <Link href="/policies/privacy" className="hover:text-zinc-300">Privacy Policy</Link>
                    <Link href="/policies/terms" className="hover:text-zinc-300">Terms of Service</Link>
                </div>
            </div>
        </div>
    );
}
