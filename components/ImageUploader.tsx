import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ImageUploaderProps {
    onUploadComplete: (url: string) => void;
    folder?: string;
    label?: string;
}

export default function ImageUploader({ onUploadComplete, folder = 'uploads', label = 'Upload Image' }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setError(null);
            setSuccess(false);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // 1. Upload the file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('question-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 2. Get the Public URL
            const { data } = supabase.storage
                .from('question-images')
                .getPublicUrl(filePath);

            if (!data) {
                throw new Error('Error retrieving public URL');
            }

            onUploadComplete(data.publicUrl);
            setSuccess(true);

            // Clear success after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

        } catch (err: any) {
            console.error('Upload Error:', err);
            setError(err.message || 'Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className="relative flex items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                    disabled={uploading}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        disabled={uploading}
                    />
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                            <Upload className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                            {uploading ? 'Uploading...' : success ? 'Uploaded!' : label}
                        </span>
                    </div>
                </button>

                {error && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                        <XCircle className="h-3 w-3" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
            {success && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    Image uploaded successfully!
                </p>
            )}
        </div>
    );
}
