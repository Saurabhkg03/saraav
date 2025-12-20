import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Copy, ExternalLink, Flag, ImageIcon, Maximize2, Minimize2, Plus, Star, StickyNote, Trash2, X, Youtube } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Skeleton } from "@/components/ui/skeleton";
import ImageUploader from './ImageUploader';
import { useAuth } from '@/context/AuthContext';
import { Pencil, Check } from 'lucide-react';

const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer').then(mod => mod.MarkdownRenderer), {
    loading: () => <Skeleton className="h-20 w-full" />,
});
import { cn } from '@/lib/utils';
import { SolutionModal } from './SolutionModal';
import { ReportQuestionModal } from './ReportQuestionModal';
import { Question } from '@/lib/types';

interface QuestionItemProps {
    question: Question;
    isExpanded?: boolean;
    onToggle?: (id: string) => void;
    status?: 'easy' | 'medium' | 'hard' | null;
    onStatusChange: (id: string, status: 'easy' | 'medium' | 'hard' | null) => void;
    isStarred: boolean;
    onStarToggle: (id: string) => void;
    onNoteSave: (id: string, content: string) => Promise<void>;
    getNote: (id: string) => Promise<string>;
    cachedSolution?: string;
    onLoadSolution?: (id: string) => Promise<void>;
    isEditing?: boolean;
    onUpdate?: (id: string, updates: Partial<Question>) => void;
    onDelete?: (id: string) => void;
    subjectId?: string;
    unitId?: string;
}

export function QuestionItem({
    question,
    isExpanded,
    onToggle,
    status,
    onStatusChange,
    isStarred,
    onStarToggle,
    onNoteSave,
    getNote,
    cachedSolution,
    onLoadSolution,
    isEditing,
    onUpdate,
    onDelete,
    subjectId,
    unitId
}: QuestionItemProps) {
    const { isAdmin } = useAuth();
    const [localEditMode, setLocalEditMode] = useState(false);
    const [loadingSolution, setLoadingSolution] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [noteContent, setNoteContent] = useState('');

    const [loadingNote, setLoadingNote] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const effectiveIsEditing = isEditing || localEditMode;

    // Automatically load solution if editing and it's not available
    useEffect(() => {
        if (effectiveIsEditing && !question.solution && !cachedSolution && question.hasSolution && onLoadSolution) {
            setLoadingSolution(true);
            onLoadSolution(question.id).finally(() => setLoadingSolution(false));
        }
    }, [effectiveIsEditing, question.solution, cachedSolution, question.hasSolution, onLoadSolution, question.id]);

    const handleCopy = () => {
        navigator.clipboard.writeText(question.text);
        toast.success("Question copied to clipboard!");
    };

    const handleNoteClick = async () => {
        if (!isNoteOpen) {
            setLoadingNote(true);
            const content = await getNote(question.id);
            setNoteContent(content);
            setLoadingNote(false);
        }
        setIsNoteOpen(!isNoteOpen);
    };

    const handleNoteSave = async () => {
        await onNoteSave(question.id, noteContent);
        setIsNoteOpen(false);
    };

    const handleToggleSolution = async () => {
        if (!showSolution) {
            // If opening and no cached solution (and we have a loader), load it
            if (!cachedSolution && !question.solution && onLoadSolution && question.hasSolution) {
                setLoadingSolution(true);
                try {
                    await onLoadSolution(question.id);
                } finally {
                    setLoadingSolution(false);
                }
            }
        }
        setShowSolution(!showSolution);
    };

    const updateHistory = (index: number, field: 'year' | 'marks', value: string) => {
        const newHistory = [...(question.history || [])];
        newHistory[index] = { ...newHistory[index], [field]: value };
        onUpdate?.(question.id, { history: newHistory });
    };

    const addHistory = () => {
        const newHistory = [...(question.history || []), { year: '', marks: '' }];
        onUpdate?.(question.id, { history: newHistory });
    };

    const removeHistory = (index: number) => {
        if (window.confirm('Are you sure you want to delete this year tag?')) {
            const newHistory = [...(question.history || [])];
            newHistory.splice(index, 1);
            onUpdate?.(question.id, { history: newHistory });
        }
    };

    // Determine actual solution text: either prop (legacy) or cached (lazy)
    const solutionText = question.solution || cachedSolution;
    const hasSolution = question.solution || question.hasSolution;

    return (
        <div
            id={question.id}
            className={cn(
                "group relative flex gap-4 rounded-xl border-2 bg-white p-3 transition-all hover:shadow-lg dark:bg-zinc-900",
                status
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-zinc-200 hover:border-indigo-600 dark:border-zinc-700 dark:hover:border-indigo-500"
            )}>
            {/* Left Sidebar: Status Indicator (Checkbox) */}
            <div className="flex flex-col gap-3 pt-1">
                <button
                    onClick={() => onStatusChange(question.id, status ? null : 'easy')}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        status
                            ? "border-green-500 bg-green-500 text-white dark:border-green-500 dark:bg-green-500"
                            : "border-zinc-300 bg-transparent hover:border-green-500 dark:border-zinc-600 dark:hover:border-green-500"
                    )}
                    title={status ? "Mark as incomplete" : "Mark as complete"}
                >
                    {status && (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>

                {/* Mobile Only Actions */}
                <div className="flex flex-col gap-3 md:hidden">
                    <button
                        onClick={() => onStarToggle(question.id)}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isStarred ? "text-yellow-500" : "text-zinc-300 hover:text-yellow-500 dark:text-zinc-600"
                        )}
                        title="Bookmark"
                    >
                        <Star className={cn("h-6 w-6", isStarred && "fill-current")} />
                    </button>

                    <button
                        onClick={handleNoteClick}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isNoteOpen ? "text-indigo-600" : "text-zinc-300 hover:text-indigo-600 dark:text-zinc-600"
                        )}
                        title="Personal Note"
                    >
                        <StickyNote className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Middle: Content */}
            <div className="flex-1 min-w-0 space-y-3">
                {/* Question Text */}
                {/* Question Text */}
                {/* Question Text */}
                {effectiveIsEditing ? (
                    <div className="space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Edit Column */}
                            <div className="space-y-4 border-r border-zinc-200 pr-0 md:pr-6 dark:border-zinc-800">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Question Text (Markdown + LaTeX)</label>
                                    <textarea
                                        value={question.text}
                                        onChange={(e) => onUpdate?.(question.id, { text: e.target.value })}
                                        className="h-48 w-full rounded border border-zinc-200 bg-white p-3 text-sm font-mono text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    />
                                    <p className="mt-1 text-xs text-zinc-400">Use @ to split alternative questions. Use /& for new lines.</p>
                                </div>

                                {/* Image Management Per Part */}
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Images</label>
                                    <div className="space-y-6">
                                        {question.text.split('@').map((_, index) => {
                                            const partKey = index.toString();
                                            // Combine legacy and new images for display of part 0
                                            let currentImages: string[] = question.images?.[partKey] || [];
                                            if (index === 0 && question.questionImageUrl && !currentImages.includes(question.questionImageUrl)) {
                                                // If legacy image exists and not already in list, treat it as existing
                                                // But we should probably migrate it or just display it.
                                                // Simplest: Check if it's there.
                                                if (currentImages.length === 0) {
                                                    currentImages = [question.questionImageUrl];
                                                }
                                            }

                                            return (
                                                <div key={index} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                                                    <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                                                        {index === 0 ? "Main Question Images" : `OR Alternative #${index} Images`}
                                                    </p>

                                                    {/* Existing Images List */}
                                                    {currentImages.length > 0 && (
                                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                                            {currentImages.map((url, imgIdx) => (
                                                                <div key={imgIdx} className="relative aspect-square rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 group/img">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <Image
                                                                        src={url}
                                                                        alt="Preview"
                                                                        width={100}
                                                                        height={100}
                                                                        className="h-full w-full object-cover"
                                                                        unoptimized
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            if (window.confirm('Remove this image?')) {
                                                                                const newImages = currentImages.filter(u => u !== url);
                                                                                const newImagesMap = { ...(question.images || {}) };
                                                                                if (newImages.length > 0) {
                                                                                    newImagesMap[partKey] = newImages;
                                                                                } else {
                                                                                    delete newImagesMap[partKey];
                                                                                }

                                                                                // Handle Legacy Field Sync
                                                                                let updates: Partial<Question> = { images: newImagesMap };
                                                                                if (index === 0 && url === question.questionImageUrl) {
                                                                                    updates.questionImageUrl = ''; // Clear legacy if removed
                                                                                }
                                                                                onUpdate?.(question.id, updates);
                                                                            }
                                                                        }}
                                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity text-white hover:text-red-400"
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Uploader */}
                                                    <ImageUploader
                                                        label="Add Image"
                                                        folder="question-images"
                                                        onUploadComplete={(url) => {
                                                            const newImages = [...currentImages, url];
                                                            const newImagesMap = { ...(question.images || {}) };
                                                            newImagesMap[partKey] = newImages;

                                                            const updates: Partial<Question> = { images: newImagesMap };
                                                            // Sync legacy for first image of first part
                                                            if (index === 0 && !question.questionImageUrl) {
                                                                updates.questionImageUrl = url;
                                                            }
                                                            onUpdate?.(question.id, updates);
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">History / Year Tags</label>
                                    <div className="space-y-2">
                                        {(question.history || []).map((h, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={h.year}
                                                    onChange={(e) => updateHistory(i, 'year', e.target.value)}
                                                    placeholder="Year (e.g. Summer 2024)"
                                                    className="w-full rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                                />
                                                <input
                                                    type="text"
                                                    value={h.marks}
                                                    onChange={(e) => updateHistory(i, 'marks', e.target.value)}
                                                    placeholder="Marks (e.g. 7)"
                                                    className="w-20 rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                                />
                                                <button
                                                    onClick={() => removeHistory(i)}
                                                    className="rounded border border-red-200 p-2 text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                                                    title="Remove tag"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={addHistory}
                                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Year Tag
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div className="space-y-4">
                                <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Live Preview</label>
                                <div className="space-y-4">
                                    {question.text.split('@').map((text: string, index: number) => {
                                        // Preview images logic
                                        const partKey = index.toString();
                                        let displayImages = question.images?.[partKey] || [];
                                        if (index === 0 && question.questionImageUrl && displayImages.length === 0) {
                                            displayImages = [question.questionImageUrl];
                                        }

                                        return (
                                            <div key={index} className={cn("prose prose-zinc max-w-none dark:prose-invert", index > 0 && "border-t border-zinc-200 pt-3 dark:border-zinc-700")}>
                                                {index > 0 && <span className="mb-1 block text-xs font-medium uppercase text-zinc-400">OR</span>}
                                                <ErrorBoundary label="question preview">
                                                    <MarkdownRenderer
                                                        content={text.split('/&').join('  \n').trim()}
                                                    />
                                                </ErrorBoundary>
                                                {displayImages.length > 0 && (
                                                    <div className="mt-4 grid gap-4">
                                                        {displayImages.map((url, i) => (
                                                            <div key={i} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white">
                                                                <Image
                                                                    src={url}
                                                                    alt={`Question Image ${i + 1}`}
                                                                    width={0}
                                                                    height={0}
                                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                                    className="max-h-64 w-full object-contain mx-auto h-auto"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {question.text.split('@').map((text: string, index: number) => {
                            const partKey = index.toString();
                            let displayImages = question.images?.[partKey] || [];
                            // Fallback for legacy
                            if (index === 0 && question.questionImageUrl && displayImages.length === 0) {
                                displayImages = [question.questionImageUrl];
                            }

                            return (
                                <div key={index} className={cn("prose prose-zinc max-w-none dark:prose-invert", index > 0 && "border-t border-zinc-100 pt-3 dark:border-zinc-800")}>
                                    {index > 0 && <span className="mb-1 block text-xs font-medium uppercase text-zinc-400">OR</span>}
                                    <ErrorBoundary label="question content">
                                        <MarkdownRenderer
                                            content={text.split('/&').join('  \n').trim()}
                                        />
                                    </ErrorBoundary>

                                    {displayImages.length > 0 && (
                                        <div className="mt-4 grid gap-4">
                                            {displayImages.map((url, i) => (
                                                <div key={i} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white">
                                                    <Image
                                                        src={url}
                                                        alt={`Question Reference ${i + 1}`}
                                                        width={0}
                                                        height={0}
                                                        sizes="(max-width: 768px) 100vw, 600px"
                                                        className="max-h-96 md:max-h-72 w-full md:w-auto md:max-w-2xl object-contain mx-auto h-auto"
                                                        unoptimized
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Frequency Badge */}
                    {question.frequency > 0 && (
                        <span className={cn(
                            "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                            question.frequency >= 3
                                ? "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : question.frequency === 2
                                    ? "border-transparent bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    : "border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        )}>
                            Asked {question.frequency} times
                        </span>
                    )}

                    {/* Diagram Badge */}
                    {question.hasDiagram === 1 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            <ImageIcon className="h-3 w-3" />
                            Diagram
                        </span>
                    )}

                    {/* History Badge */}
                    {question.history && question.history.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {question.history.map((h, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                    {h.year} ({h.marks}m)
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Solution and Video Buttons */}
                {!effectiveIsEditing && (hasSolution || question.video) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {hasSolution && (
                            <button
                                onClick={handleToggleSolution}
                                disabled={loadingSolution}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                                    showSolution
                                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                    loadingSolution && "opacity-70 cursor-wait"
                                )}
                            >
                                {loadingSolution ? (
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
                                ) : (
                                    showSolution ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                                )}
                                {showSolution ? "Hide Solution" : "Show Solution"}
                            </button>
                        )}
                        {question.video && (
                            <>
                                <button
                                    onClick={() => setShowVideo(!showVideo)}
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                                        showVideo
                                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <Youtube className="h-3.5 w-3.5" />
                                    {showVideo ? "Hide Reference Video" : "Watch Reference Video"}
                                </button>
                                {showVideo && (
                                    <div className="w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                                        <div className="relative aspect-video w-full">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={`https://www.youtube.com/embed/${question.video.videoId}`}
                                                title={question.video.title}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                className="absolute inset-0 h-full w-full rounded-t-lg border-0"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-100 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                                            <div>
                                                <p className="text-sm font-medium text-zinc-800 line-clamp-1 dark:text-zinc-200">{question.video.title}</p>
                                                <p className="text-xs text-zinc-500">Video provided by {question.video.channelTitle} via YouTube</p>
                                            </div>
                                            <a
                                                href={`https://www.youtube.com/watch?v=${question.video.videoId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Watch on YouTube
                                            </a>
                                        </div>
                                        <div className="mt-2 flex justify-end p-3">
                                            <button
                                                onClick={() => setIsReportModalOpen(true)}
                                                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-red-400"
                                            >
                                                <Flag className="h-3 w-3" />
                                                Report broken video
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Solution Content (Desktop Only) */}
                {((showSolution && solutionText) || effectiveIsEditing) && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                        {effectiveIsEditing ? (
                            <div className="p-4">
                                <h4 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Solution Editor</h4>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4 border-r border-zinc-200 pr-0 md:pr-6 dark:border-zinc-800">
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Solution Text</label>
                                            <textarea
                                                value={question.solution ?? cachedSolution ?? ''}
                                                onChange={(e) => onUpdate?.(question.id, { solution: e.target.value })}
                                                className="h-64 w-full rounded border border-zinc-200 bg-white p-3 text-sm font-mono text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                                placeholder="Enter solution here..."
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Solution Image URL</label>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={question.solutionImageUrl || ''}
                                                        onChange={(e) => onUpdate?.(question.id, { solutionImageUrl: e.target.value })}
                                                        placeholder="https://example.com/solution-image.png"
                                                        className="flex-1 rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                                    />
                                                    {question.solutionImageUrl && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm('Are you sure you want to remove this solution image?')) {
                                                                    onUpdate?.(question.id, { solutionImageUrl: '' });
                                                                }
                                                            }}
                                                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
                                                            title="Remove Solution Image"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="rounded-lg border border-dashed border-zinc-200 p-3 bg-zinc-50/50 dark:border-zinc-800">
                                                    <p className="mb-2 text-xs font-medium text-zinc-500">Upload Solution Image</p>
                                                    <ImageUploader
                                                        label="Select Image"
                                                        onUploadComplete={(url) => onUpdate?.(question.id, { solutionImageUrl: url })}
                                                        folder="solution-images"
                                                    />
                                                </div>

                                                {question.solutionImageUrl && (
                                                    <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
                                                        <Image
                                                            src={question.solutionImageUrl}
                                                            alt="Solution Preview"
                                                            width={0}
                                                            height={0}
                                                            sizes="100vw"
                                                            style={{ width: '100%', height: 'auto' }}
                                                            className="max-h-64 object-contain"
                                                            unoptimized
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Live Preview</label>
                                        {question.solutionImageUrl && (
                                            <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <Image
                                                    src={question.solutionImageUrl}
                                                    alt="Solution"
                                                    width={0}
                                                    height={0}
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    className="max-h-64 w-full object-contain mx-auto h-auto"
                                                    unoptimized
                                                />
                                            </div>
                                        )}
                                        <div className="prose prose-zinc max-w-none dark:prose-invert">
                                            <ErrorBoundary label="solution preview">
                                                <MarkdownRenderer
                                                    content={question.solution || cachedSolution || ''}
                                                />
                                            </ErrorBoundary>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            showSolution && solutionText && (
                                <div className="p-6">
                                    {question.solutionImageUrl && (
                                        <div className="mb-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <Image
                                                src={question.solutionImageUrl}
                                                alt="Solution Reference"
                                                width={0}
                                                height={0}
                                                sizes="(max-width: 768px) 100vw, 600px"
                                                className="max-h-96 md:max-h-72 w-full md:w-auto md:max-w-2xl object-contain mx-auto h-auto"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    <div className="prose prose-zinc max-w-none dark:prose-invert">
                                        <ErrorBoundary label="solution content">
                                            <MarkdownRenderer
                                                content={question.solution || cachedSolution || ''}
                                            />
                                        </ErrorBoundary>
                                        <div className="mt-6 flex items-center justify-center border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                            <p className="text-xs italic text-zinc-600 dark:text-zinc-300">
                                                AI-generated solution • Diagram is just for reference • Please verify key details & report issues
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}

                {effectiveIsEditing && (
                    <button
                        onClick={() => onDelete?.(question.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 hover:underline"
                    >
                        <Trash2 className="h-3 w-3" />
                        Delete
                    </button>
                )}

                {/* Note Area */}
                {isNoteOpen && (
                    <div className="mt-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        {loadingNote ? (
                            <div className="text-xs text-zinc-400">Loading note...</div>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Add your personal notes, tricks, or mnemonics here..."
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    rows={4}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setIsNoteOpen(false)}
                                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleNoteSave}
                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                                    >
                                        Save Note
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Sidebar: Actions (Desktop Only) */}
            <div className="hidden flex-col gap-2 md:flex">
                <button
                    onClick={() => onStarToggle(question.id)}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isStarred ? "text-yellow-500" : "text-zinc-300 hover:text-yellow-500 dark:text-zinc-600"
                    )}
                    title="Bookmark"
                >
                    <Star className={cn("h-6 w-6", isStarred && "fill-current")} />
                </button>

                <button
                    onClick={handleNoteClick}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isNoteOpen ? "text-indigo-600" : "text-zinc-300 hover:text-indigo-600 dark:text-zinc-600"
                    )}
                    title="Personal Note"
                >
                    <StickyNote className="h-6 w-6" />
                </button>

                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:text-red-500 dark:text-zinc-600"
                    title="Report Issue"
                >
                    <Flag className="h-6 w-6" />
                </button>

                {isAdmin && (
                    <button
                        onClick={() => setLocalEditMode(!localEditMode)}
                        className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            localEditMode
                                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                : "text-zinc-300 hover:text-indigo-600 dark:text-zinc-600"
                        )}
                        title={localEditMode ? "Done Editing" : "Edit Question"}
                    >
                        {localEditMode ? (
                            <Check className="h-5 w-5" />
                        ) : (
                            <Pencil className="h-5 w-5" />
                        )}
                    </button>
                )}
            </div>

            <SolutionModal
                isOpen={showSolution}
                onClose={() => setShowSolution(false)}
                content={solutionText || ''}
            />

            <ReportQuestionModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                questionId={question.id}
                questionText={question.text}
                subjectId={subjectId}
                unitId={unitId}
            />
        </div >
    );
}