import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

interface MermaidProps {
    chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const { theme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            mermaid.initialize({
                startOnLoad: false,
                theme: theme === 'dark' ? 'dark' : 'default',
                securityLevel: 'loose',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                flowchart: {
                    htmlLabels: true,
                    curve: 'basis'
                }
            });
        }
    }, [theme, isMounted]);

    useEffect(() => {
        if (!isMounted) return;

        const renderChart = async () => {
            try {
                const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart);
                setSvg(svg);
            } catch (error) {
                console.error('Failed to render mermaid chart:', error);
                // Attempt to render the raw text if mermaid fails
                if (ref.current) {
                    ref.current.innerHTML = `<pre class="text-red-500 text-xs">${error instanceof Error ? error.message : 'Syntax Error'}</pre>`;
                }
            }
        };

        renderChart();
    }, [chart, theme, isMounted]);

    if (!isMounted) return <div className="animate-pulse h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>;

    return (
        <div
            ref={ref}
            className="my-4 block w-full max-w-full overflow-x-auto rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/50"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
