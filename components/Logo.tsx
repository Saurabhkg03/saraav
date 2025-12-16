export function Logo() {
    return (
        <div className="flex items-center gap-2">
            {/* Added overflow-hidden to ensure the image respects the rounded corners */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm overflow-hidden">
                {/* 1. Path is just "/logo.jpg" (root), not "/public/logo.jpg" 
                   2. Added h-full w-full object-cover so it fills the box 
                */}
                <img 
                    src="/logo.jpg" 
                    alt="Saraav Logo" 
                    className="h-full w-full object-cover" 
                />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-white">Saraav</span>
        </div>
    );
}