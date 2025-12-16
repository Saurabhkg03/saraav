import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const Mermaid = dynamic(() => import('./Mermaid').then(mod => mod.Mermaid), {
    loading: () => <div className="h-48 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />,
    ssr: false, // Mermaid only works on client
});
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    const formatMath = (text: string) => {
        // Regex to match inline math $...$ but not $$...$$
        // We look for $ that is not preceded by $ and not followed by $
        return text.replace(/(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g, (match, content) => {
            // Heuristic strategies to promote inline math to block math:

            // 1. Check for equation indicators
            const hasEquationSign = /[=≈→]/.test(content);

            // 2. Check for complex structures/functions usually needing space
            const hasComplexLatex = /\\(frac|sum|int|lim|matrix|begin)/.test(content);

            // 3. Length check - long inline math is often an equation
            const isLong = content.length > 25;

            // 4. "Normal notation" check - exclude simple variable assignments/definitions if they seem inline-intended
            // e.g. "where $x = 5$ is..." -> maybe keep inline? 
            // But user said "if there is an equation... be spacious".
            // Let's stick to the indicators.

            // If it meets criteria, promote to block math $$...$$
            if (hasEquationSign || hasComplexLatex || isLong) {
                // Add newlines to ensure it breaks out of paragraphs and renders as a proper block
                return `\n\n$$${content}$$\n\n`;
            }

            // Otherwise keep as inline
            return match;
        });
    };

    const formattedContent = formatMath(content);

    return (
        <div className={cn("prose prose-zinc w-full max-w-full min-w-0 dark:prose-invert break-words overflow-hidden", className)} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-zinc-800 dark:text-zinc-200">{children}</p>,
                    h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100">{children}</h3>,
                    ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-1 text-zinc-800 dark:text-zinc-200">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-1 text-zinc-800 dark:text-zinc-200">{children}</ol>,
                    li: ({ children }) => <li className="pl-1 text-zinc-700 dark:text-zinc-300">{children}</li>,
                    // Fix table overflow by wrapping in a block container with explicit overflow handling
                    table: ({ children }) => (
                        <div className="my-6 block w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50" style={{ maxWidth: '100%' }}>
                            <table className="min-w-full text-left text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-800/50">{children}</thead>,
                    tbody: ({ children }) => <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">{children}</tbody>,
                    tr: ({ children }) => <tr className="transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">{children}</tr>,
                    th: ({ children }) => <th className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 align-top whitespace-nowrap">{children}</td>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/50 py-2 pl-4 italic text-zinc-700 dark:bg-indigo-900/20 dark:text-zinc-300 my-4 rounded-r-lg">
                            {children}
                        </blockquote>
                    ),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code: ({ className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';

                        if (language === 'mermaid') {
                            const chartContent = String(children)
                                .replace(/&gt;/g, '>')
                                .replace(/&lt;/g, '<')
                                .replace(/&amp;/g, '&')
                                .replace(/&quot;/g, '"')
                                // Fix common syntax error where > is appended to pipe
                                .replace(/\|>/g, '|')
                                .replace(/\|\s+>/g, '|')
                                // Robust quoting: Handle double brackets/parens/braces first, then single.
                                // Wraps content in quotes if not already quoted.
                                // Ex: [[Label]] -> [["Label"]], [Label] -> ["Label"], (Label) -> ("Label")
                                .replace(/(\[\[.*?\]\])|(\(\(.*?\)\))|(\{\{.*?\}\})|(\[.*?\])|(\(.*?\))|(\{.*?\})/g, (match) => {
                                    // Determine wrapper type
                                    let openLen = 1;
                                    let closeLen = 1;
                                    if (match.startsWith('[[') || match.startsWith('((') || match.startsWith('{{')) {
                                        openLen = 2;
                                        closeLen = 2;
                                    }

                                    const open = match.substring(0, openLen);
                                    const close = match.substring(match.length - closeLen);
                                    const content = match.substring(openLen, match.length - closeLen);

                                    // If already quotes, return as is
                                    if (content.trim().startsWith('"') && content.trim().endsWith('"')) {
                                        return match;
                                    }

                                    // Quote the content
                                    return `${open}"${content}"${close}`;
                                });
                            return <Mermaid chart={chartContent} />;
                        }

                        return match ? (
                            <div className="relative my-4 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 w-full max-w-full">
                                <div className="flex items-center justify-between bg-zinc-800/50 px-4 py-2 text-xs text-zinc-400 border-b border-zinc-800">
                                    <span>{language}</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(String(children))}
                                        className="hover:text-zinc-200 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <pre className="overflow-x-auto p-4 text-sm text-zinc-100 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent w-full max-w-full">
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </pre>
                            </div>
                        ) : (
                            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 break-words" {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Center equations for better readability
                    div: ({ className, children }) => {
                        if (className === 'math-display') {
                            return <div className="my-6 flex justify-center overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">{children}</div>;
                        }
                        return <div className={className}>{children}</div>;
                    },
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-4">
                            {children}
                        </a>
                    ),
                    hr: () => <hr className="my-6 border-zinc-200 dark:border-zinc-800" />,
                    img: ({ src, alt }) => {
                        if (!src) return null;
                        return (
                            <div className="relative w-full my-4">
                                <Image
                                    src={src as string}
                                    alt={alt || 'Markdown Image'}
                                    width={0}
                                    height={0}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
                                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 w-full h-auto"
                                />
                            </div>
                        );
                    }
                }}
            >
                {formattedContent}
            </ReactMarkdown>

        </div >
    );
}
