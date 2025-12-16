
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    label?: string; // Optional label to identify what failed (e.g., "Question content")
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-medium">
                            Could not display {this.props.label || "content"}.
                        </p>
                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <p className="mt-1 text-xs opacity-75">
                                {this.state.error.message}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
