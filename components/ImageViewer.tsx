import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ImageViewerProps {
    src: string;
    alt?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const [dragging, setDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            document.body.style.overflow = 'unset';
            setScale(1); // Reset on close
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey || true) { // Always zoom on scroll in viewer
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(s => Math.min(Math.max(0.5, s + delta), 4));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setDragging(true);
            setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging && scale > 1) {
            setPosition({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
        }
    };

    const handleMouseUp = () => {
        setDragging(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="absolute top-4 right-4 z-[101] flex gap-2">
                <a
                    href={src}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    title="Download"
                >
                    <Download className="h-5 w-5" />
                </a>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div
                className="relative w-full h-full flex items-center justify-center overflow-hidden p-4"
                onWheel={handleWheel}
            >
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt || "Full screen view"}
                    className="max-w-full max-h-full transition-transform duration-100 ease-out select-none cursor-grab active:cursor-grabbing"
                    style={{
                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    draggable={false}
                />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 px-4 py-2 rounded-full z-[101]" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
                    className="text-white hover:text-indigo-400 p-1"
                >
                    <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-white text-sm font-mono min-w-[3ch] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={() => setScale(s => Math.min(4, s + 0.2))}
                    className="text-white hover:text-indigo-400 p-1"
                >
                    <ZoomIn className="h-5 w-5" />
                </button>
            </div>
        </div>,
        document.body
    );
}
