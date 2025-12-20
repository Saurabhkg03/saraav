import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Dynamic import for Mermaid to avoid SSR issues and reduce bundle size
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), {
    loading: () => <div className="animate-pulse h-24 bg-zinc-100 rounded-lg dark:bg-zinc-800" />,
    ssr: false
});

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // Memoize plugins to avoid unnecessary re-renders
    const remarkPlugins = useMemo(() => [remarkMath, remarkGfm], []);
    const rehypePlugins = useMemo(() => [rehypeKatex], []);

    // Pre-process content to fix common LaTeX issues
    const sanitizedContent = useMemo(() => {
        if (!content) return '';

        const lines = content.split('\n');
        let inCodeBlock = false;

        const processedContent = lines.map(line => {
            // Check for code block fence
            const trimmed = line.trim();
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                inCodeBlock = !inCodeBlock;
                return line; // Return fence line as is
            }

            if (inCodeBlock) {
                return line; // Preserve code block content exactly
            }

            // Check for list items (keep their indentation)
            // Matches: optional space + bullet/number + space
            // e.g. "  * ", "  1. "
            if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
                return line;
            }

            // Check for blockquotes
            if (/^\s*>/.test(line)) {
                return line;
            }

            // For other lines, if they are indented with 4+ spaces or a tab, unindent them
            // This fixes "    $$" and "    Where:" issues interpreting as code
            if (line.startsWith('    ') || line.startsWith('\t')) {
                return line.trimStart();
            }

            // Also explicitly fix indented display math that might use fewer than 4 spaces but we want cleaner
            if (/^\s*\$\$/.test(line)) {
                return line.trimStart();
            }

            return line;
        }).join('\n');

        // Post-process: Escape unescaped dollar signs inside $$...$$ blocks
        // KaTeX fails if it finds unescaped $ inside math mode (e.g. currency $1000)
        return processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match: string, inner: string) => {
            // Replace $ with \$ ONLY if it's not already escaped
            const escapedInner = inner.replace(/(?<!\\)\$/g, '\\$');
            return `$$${escapedInner}$$`;
        });
    }, [content]);

    return (
        <div className={cn("prose prose-zinc w-full max-w-none dark:prose-invert break-words marker:text-black dark:marker:text-zinc-200", className)}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins as any}
                rehypePlugins={rehypePlugins as any}
                components={{
                    // Custom Code Block Renderer (Handles Mermaid & Syntax Highlighting UI)
                    code({ node, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const isInline = !match;

                        if (isInline) {
                            return (
                                <code className={cn("rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100", className)} {...props}>
                                    {children}
                                </code>
                            );
                        }

                        if (language === 'mermaid') {
                            return <MermaidDiagram content={String(children).replace(/\n$/, '')} />;
                        }

                        return (
                            <div className="relative my-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#1d1f21] dark:border-zinc-800">
                                <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/50 px-4 py-2 text-xs text-zinc-400">
                                    <span>{language || 'text'}</span>
                                </div>
                                <SyntaxHighlighter
                                    language={language}
                                    style={atomDark}
                                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                                    wrapLongLines={true}
                                    PreTag="div"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        );
                    },
                    // responsive tables
                    table({ children }) {
                        return (
                            <div className="my-6 block w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
                                <table className="min-w-full text-left text-sm">
                                    {children}
                                </table>
                            </div>
                        );
                    },
                    thead({ children }) {
                        return <thead className="bg-zinc-100 dark:bg-zinc-800/50">{children}</thead>;
                    },
                    tbody({ children }) {
                        return <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">{children}</tbody>;
                    },
                    tr({ children }) {
                        return <tr className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">{children}</tr>;
                    },
                    th({ children }) {
                        return <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{children}</th>;
                    },
                    td({ children }) {
                        return <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">{children}</td>;
                    },
                    // Custom Link Renderer
                    a({ href, children }) {
                        const isExternal = href?.startsWith('http');
                        return (
                            <a
                                href={href}
                                target={isExternal ? "_blank" : undefined}
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                {children}
                                {isExternal && <ExternalLink className="h-3 w-3" />}
                            </a>
                        );
                    },
                    // Custom Image Renderer
                    img({ src, alt }) {
                        return (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={src}
                                alt={alt}
                                loading="lazy"
                                className="my-4 h-auto w-full rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950"
                            />
                        );
                    }
                }}
            >
                {sanitizedContent}
            </ReactMarkdown>
        </div>
    );
});
