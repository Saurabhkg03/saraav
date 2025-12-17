import { useEffect, useRef } from 'react';
import { marked } from 'marked';
// @ts-ignore
import renderMathInElement from 'katex/dist/contrib/auto-render';
// @ts-ignore
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!content || !containerRef.current) return;

        // Configure Marked Renderer
        const renderer = new marked.Renderer();

        // 1. Responsive Tables
        // REMOVED custom renderer.table because marked v12+ changes signature to (token) requiring complex manual parsing.
        // REPLACED with DOM manipulation below (post-process) to wrap tables in the scrolling container.
        // renderer.table = ... (removed)

        // 2. Custom Link Handling
        renderer.link = function (this: any, { href, title, tokens }: any) {
            const text = this.parser.parseInline(tokens);
            return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-4">${text}</a>`;
        };

        // 3. Code Blocks (Mermaid Support)
        // REMOVED custom renderer.code due to signature mismatch.
        // REPLACED with DOM post-processing below.
        // renderer.code = ... (removed)

        // 4. Images (Next Image behavior is hard to replicate 1:1 in raw HTML string without hydration, but we can do standard responsive img)
        renderer.image = ({ href, title, text }: any) => {
            return `<img src="${href}" alt="${text}" title="${title || ''}" class="rounded-lg border border-zinc-200 dark:border-zinc-700 w-full h-auto my-4" loading="lazy" />`;
        };

        // Config marked
        // @ts-ignore - types might be slightly off between versions
        marked.use({ renderer });

        // Parse Markdown
        // We TRUST the content here as per "dummy code" logic (dangerouslySetInnerHTML)
        const rawHtml = marked.parse(content);
        containerRef.current.innerHTML = rawHtml as string;

        // Post-Process: Wrap Tables for Responsiveness
        // Since we removed the custom table renderer, we wrap standard <table> tags here.
        const tables = containerRef.current.querySelectorAll('table');
        tables.forEach(table => {
            // Check if already wrapped (unlikely since we just rendered, but good safety)
            if (table.parentElement?.classList.contains('overflow-x-auto')) return;

            const wrapper = document.createElement('div');
            wrapper.className = "my-6 block w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50";
            wrapper.style.maxWidth = '100%';

            // Apply standard classes to table if missing
            table.className = cn(table.className, "min-w-full text-left text-sm");

            // Wrap
            table.parentNode?.insertBefore(wrapper, table);
            wrapper.appendChild(table);

            // Add style to thead/tbody headers if needed, typically prose handles it but let's be safe
            const thead = table.querySelector('thead');
            if (thead) thead.className = cn(thead.className, "bg-zinc-100 dark:bg-zinc-800/50");

            const tbody = table.querySelector('tbody');
            if (tbody) tbody.className = cn(tbody.className, "divide-y divide-zinc-200 dark:divide-zinc-700");

            // Restore "Scrollable Only" behavior:
            // Force cells to NOT wrap, ensuring the table expands horizontally and triggers the scrollbar.
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                // We use classList directly or cn if we want to be fancy, but standard JS is fine here.
                // Re-adding padding that might be lost or inconsistent with raw HTML.
                cell.classList.add('whitespace-nowrap', 'px-4', 'py-2');
            });
        });

        // Auto-Render Math
        // Logic from dummy code
        renderMathInElement(containerRef.current, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });

        // Initialize Mermaid
        mermaid.initialize({ startOnLoad: false, theme: 'default' });

        // Post-Process: Handle Code Blocks & Mermaid
        const codeBlocks = containerRef.current.querySelectorAll('pre code');
        codeBlocks.forEach(codeEl => {
            const preEl = codeEl.parentElement;
            if (!preEl) return;
            // Prevent double wrapping if already processed (though useEffect normally cleans up, strict mode might re-run)
            if (preEl.parentElement?.classList.contains('bg-zinc-900')) return;

            // 1. Always Wrap as Standard Code Block first (Fallback/Loading state)
            const wrapper = document.createElement('div');
            wrapper.className = "relative my-4 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800 w-full max-w-full";

            const langMatch = codeEl.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : 'text';

            const header = document.createElement('div');
            header.className = "flex items-center justify-between bg-zinc-800/50 px-4 py-2 text-xs text-zinc-400 border-b border-zinc-800";
            header.innerHTML = `<span>${lang}</span>`;

            wrapper.appendChild(header);
            preEl.parentNode?.insertBefore(wrapper, preEl);
            wrapper.appendChild(preEl);

            // Stylize the pre
            preEl.className = cn(preEl.className, "overflow-x-auto p-4 text-sm text-zinc-100 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent w-full max-w-full");

            // 2. If Mermaid, attempt upgrade
            if (lang === 'mermaid') {
                // We use an async IIFE to handle the rendering without blocking
                (async () => {
                    try {
                        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                        let content = codeEl.textContent || '';

                        // Hotfix: Auto-correct common syntax errors in data
                        // The user reported "Expecting ... got 'TAGEND'" for syntax `-->|label|>`.
                        // This replaces `|>` with `|` to fix `-->|label|>` -> `-->|label|`
                        content = content.replace(/\|\>/g, "|");

                        // Render SVG
                        const { svg } = await mermaid.render(id, content);

                        // Create Scroll Wrapper for Diagram
                        const scrollWrapper = document.createElement('div');
                        scrollWrapper.className = "my-6 w-full overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 text-center";
                        scrollWrapper.innerHTML = svg;

                        // Fix Scaling: Prevent SVG from shrinking (user said "too small condensed")
                        // We force the SVG to ignore container width constraints so it scrolls instead.
                        const svgElement = scrollWrapper.querySelector('svg');
                        if (svgElement) {
                            svgElement.style.maxWidth = 'none';
                            svgElement.style.height = 'auto'; // Maintain aspect ratio
                            // Some mermaid versions set specific width/height attributes or styles that might need overriding
                        }

                        // Replace the Code Block Wrapper with Diagram
                        // Check if wrapper is still in DOM (user might have closed modal)
                        if (wrapper.isConnected) {
                            wrapper.replaceWith(scrollWrapper);
                        }
                    } catch (err) {
                        console.error("Mermaid Render Failed:", err);
                        // Fallback: Keep the code block but update header
                        if (header.isConnected) {
                            header.innerHTML = `<span class="text-red-400">mermaid (render failed)</span>`;
                        }
                    }
                })();
            }
        });

    }, [content]);

    return (
        <div
            ref={containerRef}
            className={cn("prose prose-zinc w-full max-w-full min-w-0 dark:prose-invert break-words overflow-hidden marker:text-black dark:marker:text-zinc-200", className)}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        />
    );
}
