"use client";

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useFeedback } from '@/context/FeedbackContext';

export function Footer() {
    const { openFeedback } = useFeedback();

    return (
        <footer className="hidden lg:block border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* ADJUST MARGINS HERE: Change px-4 (mobile), sm:px-6 (tablet), lg:px-8 (desktop) to adjust side spacing. Change max-w-7xl to max-w-5xl or max-w-6xl to make the content narrower. */}
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="col-span-2 md:col-span-2">
                        <Link href="/" className="inline-block">
                            <Logo />
                        </Link>
                        <p className="mt-4 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
                            Master your engineering subjects with premium study materials, expert solutions, and practice questions.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Policies</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li>
                                <Link href="/policies/terms" className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                    Terms & Conditions
                                </Link>
                            </li>
                            <li>
                                <Link href="/policies/privacy" className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/policies/refund" className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                    Refund Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/policies/shipping" className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                    Shipping Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Support</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li>
                                <Link href="/policies/contact" className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <button
                                    onClick={openFeedback}
                                    className="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
                                >
                                    Send Feedback
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 border-t border-zinc-100 pt-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    &copy; {new Date().getFullYear()} Saraav. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
