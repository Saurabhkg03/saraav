import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';

interface MermaidDiagramProps {
    content: string;
}

export default function MermaidDiagram({ content }: MermaidDiagramProps) {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        // Initialize once
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });
    }, []);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!content) return;
            setError(null);

            try {
                // Hotfix: Auto-correct common syntax errors in data
                let sanitizedContent = content.replace(/\|\>/g, "|");

                // Fix: Quote node labels that contain parentheses but aren't already quoted
                // Finds [Text (More Text)] and converts to ["Text (More Text)"]
                sanitizedContent = sanitizedContent.replace(/\[(?![ "])(.*?\(.*?\).*?)(?<![ "])\]/g, '["$1"]');

                // Generate unique ID for every render to avoid collisions
                const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                const { svg } = await mermaid.render(uniqueId, sanitizedContent);
                setSvg(svg);
            } catch (err: any) {
                console.error("Mermaid Render Failed:", err);
                setError(err.message || "Unknown Mermaid Error");
            }
        };

        renderDiagram();
    }, [content]);

    if (error) {
        return (
            <div className="relative my-4 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs text-red-400">
                    <span>mermaid (render failed): {error}</span>
                </div>
                <pre className="overflow-x-auto p-4 text-sm text-zinc-100 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <code>{content}</code>
                </pre>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="my-6 flex h-32 w-full animate-pulse items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                <span className="text-sm text-zinc-400">Loading diagram...</span>
            </div>
        );
    }

    return (
        <div className={cn("relative my-6 group", isExpanded ? "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" : "")}>
            <div
                className={cn(
                    "relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-700",
                    isExpanded ? "max-h-[90vh] max-w-[90vw] overflow-auto bg-white" : "w-full overflow-x-auto"
                )}
            >
                <div
                    className={cn(isExpanded ? "min-h-full min-w-full flex items-center justify-center" : "")}
                    dangerouslySetInnerHTML={{ __html: svg }}
                />

                {/* Expand/Collapse Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="absolute right-2 top-2 rounded-lg bg-zinc-100 p-1.5 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-900 group-hover:opacity-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                    title={isExpanded ? "Minimize" : "Maximize"}
                >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
            </div>
            {isExpanded && (
                <div className="absolute inset-0 -z-10" onClick={() => setIsExpanded(false)} />
            )}
        </div>
    );
}
